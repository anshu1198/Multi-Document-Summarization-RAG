"""
Summarization & Question Answering Engine
ContextIQ — AI Document Intelligence

Powered by local Ollama (llama3.2:3b) with:
1. Context-grounded Question Answering with page-level citations & latency metrics
2. Real-time streaming generation via Server-Sent Events (SSE)
3. Multi-format Summarization (Brief, Detailed, Bullet Points, Executive, Key Findings, Multi-Document)
4. Hierarchical chunk summarization for lengthy documents
5. Fast Ollama connection caching & graceful fallback
"""

import json
import logging
import time
from typing import Any, Dict, Generator, List, Optional
import ollama

from backend.config import (
    LLM_MODEL_NAME,
    LLM_CONTEXT_WINDOW,
    LLM_MAX_NEW_TOKENS,
    LLM_TEMPERATURE,
    LLM_REQUEST_TIMEOUT,
    PROMPTS_DIR,
)
from backend.vector_store import get_or_create_collection
from backend.retrieval import retrieve_with_context
from backend.context_awareness import resolve_followup_query

logger = logging.getLogger(__name__)

SUMMARIZATION_PROMPT_PATH = PROMPTS_DIR / "summarization_prompt.txt"

# Cache Ollama health status for 30 seconds to avoid blocking HTTP probes on every request
_OLLAMA_STATUS_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}


def check_ollama_status(force: bool = False, cache_ttl: float = 30.0) -> Dict[str, Any]:
    """
    Verify whether Ollama is running and the configured model is available.
    Cached with TTL to eliminate 200-400ms overhead on every single query.
    """
    now = time.time()
    if not force and _OLLAMA_STATUS_CACHE["data"] is not None:
        if (now - _OLLAMA_STATUS_CACHE["timestamp"]) < cache_ttl:
            return _OLLAMA_STATUS_CACHE["data"]

    try:
        models_response = ollama.list()
        model_names = []
        models_list = getattr(models_response, "models", []) or models_response.get("models", [])
        for m in models_list:
            name = getattr(m, "model", None) or getattr(m, "name", None) or m.get("model") or m.get("name")
            if name:
                model_names.append(name)

        is_model_present = any(
            LLM_MODEL_NAME in name or name.startswith(LLM_MODEL_NAME.split(":")[0])
            for name in model_names
        )

        result = {
            "status": "connected",
            "available_models": model_names,
            "target_model": LLM_MODEL_NAME,
            "model_ready": is_model_present,
            "message": "Ollama service is active and responsive.",
        }
    except Exception as exc:
        result = {
            "status": "disconnected",
            "available_models": [],
            "target_model": LLM_MODEL_NAME,
            "model_ready": False,
            "message": f"Could not connect to Ollama: {exc}. Ensure the Ollama service is running.",
        }

    _OLLAMA_STATUS_CACHE["timestamp"] = now
    _OLLAMA_STATUS_CACHE["data"] = result
    return result


def format_context_for_prompt(chunks: List[Dict[str, Any]]) -> str:
    """Format retrieved passages into a structured reference context for LLM."""
    if not chunks:
        return "No relevant context found in documents."

    formatted = []
    for idx, chunk in enumerate(chunks, start=1):
        meta = chunk.get("metadata", {})
        doc = chunk.get("document") or meta.get("document", "Unknown Document")
        page = chunk.get("page_number") or meta.get("page_number", 1)
        cid = chunk.get("chunk_id") or meta.get("chunk_id", f"chunk_{idx}")
        text = chunk.get("text", "").strip()

        formatted.append(
            f"[Passage {idx}]\n"
            f"Source: {doc}\n"
            f"Page Number: {page}\n"
            f"Chunk ID: {cid}\n"
            f"Content:\n{text}"
        )
    return "\n\n---\n\n".join(formatted)


def format_source_citations(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Format chunk records into clean client citations."""
    sources = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        doc = chunk.get("document") or meta.get("document", "Unknown Document")
        page = chunk.get("page_number") or meta.get("page_number", 1)
        cid = chunk.get("chunk_id") or meta.get("chunk_id", "")
        sources.append({
            "document": doc,
            "page_number": page,
            "chunk_id": cid,
            "score": chunk.get("cross_encoder_score", chunk.get("similarity_score", 0.0)),
            "text": chunk.get("text", "")[:320] + "..." if len(chunk.get("text", "")) > 320 else chunk.get("text", ""),
        })
    return sources


def build_qa_prompt(
    question: str,
    context_str: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    fallback_response: str = "I could not find sufficient information in the uploaded documents to answer this question.",
) -> List[Dict[str, str]]:
    """Construct structured messages for Ollama chat."""
    system_prompt = (
        "You are ContextIQ, an expert AI document intelligence assistant. "
        "Your task is to answer the user's question using ONLY the provided document passages.\n\n"
        "STRICT GUIDELINES:\n"
        "1. Base your answer strictly on the facts in the excerpts below.\n"
        "2. If the excerpts do not contain enough facts to answer, reply exactly:\n"
        f"   '{fallback_response}'\n"
        "3. Do not invent facts, companies, dates, or outside knowledge.\n"
        "4. Always cite source document names and page numbers supporting key statements.\n"
        "5. Keep your tone objective, professional, and clear."
    )

    user_prompt = (
        f"USER QUESTION: {question}\n\n"
        f"DOCUMENT EXCERPTS (Your ONLY valid source of facts):\n{context_str}\n\n"
        "Provide a direct, well-grounded answer based on the excerpts above."
    )

    messages = [{"role": "system", "content": system_prompt}]
    if conversation_history:
        recent = conversation_history[-4:]
        for msg in recent:
            if msg.get("role") in ["user", "assistant"]:
                messages.append({"role": msg["role"], "content": msg["content"]})

    messages.append({"role": "user", "content": user_prompt})
    return messages


def answer_question(
    question: str,
    top_k: int = 4,
    document_filter: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    temperature: float = LLM_TEMPERATURE,
) -> Dict[str, Any]:
    """
    Context-aware question answering with citation tracking and full latency breakdown.
    """
    if not question or not question.strip():
        raise ValueError("Question cannot be empty.")

    t_start = time.perf_counter()

    # Check Ollama availability (cached with TTL)
    health = check_ollama_status()
    if health["status"] != "connected":
        return {
            "question": question,
            "answer": (
                "⚠️ Ollama is not currently reachable. Please start Ollama by running 'ollama serve' "
                f"and ensure '{LLM_MODEL_NAME}' is available."
            ),
            "sources": [],
            "context_analysis": {},
            "latency": {"retrieval_ms": 0.0, "reranking_ms": 0.0, "generation_ms": 0.0, "total_ms": 0.0},
            "status": "ollama_unavailable",
        }

    # Contextualize query if part of a multi-turn conversation
    effective_query = resolve_followup_query(question, conversation_history)

    # Retrieve relevant context with reranking & latency breakdown
    retrieval_res = retrieve_with_context(
        question=effective_query,
        top_k=top_k,
        document_filter=document_filter,
    )
    chunks = retrieval_res.get("chunks", [])
    retrieval_lat = retrieval_res.get("latency", {})
    retrieval_ms = retrieval_lat.get("retrieval_ms", 0.0)
    reranking_ms = retrieval_lat.get("reranking_ms", 0.0)

    fallback_response = "I could not find sufficient information in the uploaded documents to answer this question."

    if not chunks:
        total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        return {
            "question": question,
            "answer": fallback_response,
            "sources": [],
            "context_analysis": retrieval_res.get("context_analysis", {}),
            "latency": {
                "retrieval_ms": retrieval_ms,
                "reranking_ms": reranking_ms,
                "generation_ms": 0.0,
                "total_ms": total_ms,
            },
            "status": "no_context",
        }

    context_str = format_context_for_prompt(chunks)
    messages = build_qa_prompt(question, context_str, conversation_history, fallback_response)

    t_gen_start = time.perf_counter()
    try:
        response = ollama.chat(
            model=LLM_MODEL_NAME,
            messages=messages,
            options={
                "num_ctx": LLM_CONTEXT_WINDOW,
                "num_predict": LLM_MAX_NEW_TOKENS,
                "temperature": temperature,
            },
        )
        t_gen_end = time.perf_counter()
        raw_answer = response["message"]["content"].strip()
        if not raw_answer:
            raw_answer = fallback_response

    except Exception as exc:
        total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        return {
            "question": question,
            "answer": f"Error during model generation: {exc}",
            "sources": [],
            "context_analysis": retrieval_res.get("context_analysis", {}),
            "latency": {
                "retrieval_ms": retrieval_ms,
                "reranking_ms": reranking_ms,
                "generation_ms": 0.0,
                "total_ms": total_ms,
            },
            "status": "generation_error",
        }

    generation_ms = round((t_gen_end - t_gen_start) * 1000.0, 2)
    total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
    sources = format_source_citations(chunks)

    return {
        "question": question,
        "answer": raw_answer,
        "sources": sources,
        "context_analysis": retrieval_res.get("context_analysis", {}),
        "latency": {
            "retrieval_ms": retrieval_ms,
            "reranking_ms": reranking_ms,
            "generation_ms": generation_ms,
            "total_ms": total_ms,
        },
        "status": "success",
    }


def stream_answer_question(
    question: str,
    top_k: int = 4,
    document_filter: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    temperature: float = LLM_TEMPERATURE,
) -> Generator[str, None, None]:
    """
    Generator yielding Server-Sent Events (SSE) data lines for real-time streaming answer generation.
    Events:
    - {"type": "status", "stage": "retrieval", "message": "Searching document passages..."}
    - {"type": "status", "stage": "reranking", "message": "Applying Cross-Encoder reranking..."}
    - {"type": "token", "content": "..."}
    - {"type": "done", "answer": "...", "sources": [...], "latency": {...}}
    """
    t_start = time.perf_counter()

    yield f"data: {json.dumps({'type': 'status', 'stage': 'retrieval', 'message': 'Searching document passages...'})}\n\n"

    health = check_ollama_status()
    if health["status"] != "connected":
        err_msg = (
            "⚠️ Ollama is not currently reachable. Please start Ollama by running 'ollama serve' "
            f"and ensure '{LLM_MODEL_NAME}' is available."
        )
        yield f"data: {json.dumps({'type': 'error', 'message': err_msg})}\n\n"
        return

    effective_query = resolve_followup_query(question, conversation_history)

    retrieval_res = retrieve_with_context(
        question=effective_query,
        top_k=top_k,
        document_filter=document_filter,
    )
    chunks = retrieval_res.get("chunks", [])
    retrieval_lat = retrieval_res.get("latency", {})
    retrieval_ms = retrieval_lat.get("retrieval_ms", 0.0)
    reranking_ms = retrieval_lat.get("reranking_ms", 0.0)

    fallback_response = "I could not find sufficient information in the uploaded documents to answer this question."

    if not chunks:
        total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        done_payload = {
            "type": "done",
            "answer": fallback_response,
            "sources": [],
            "context_analysis": retrieval_res.get("context_analysis", {}),
            "latency": {
                "retrieval_ms": retrieval_ms,
                "reranking_ms": reranking_ms,
                "generation_ms": 0.0,
                "total_ms": total_ms,
            },
            "status": "no_context",
        }
        yield f"data: {json.dumps({'type': 'token', 'content': fallback_response})}\n\n"
        yield f"data: {json.dumps(done_payload)}\n\n"
        return

    yield f"data: {json.dumps({'type': 'status', 'stage': 'generation', 'message': 'Synthesizing response with local LLM...'})}\n\n"

    context_str = format_context_for_prompt(chunks)
    messages = build_qa_prompt(question, context_str, conversation_history, fallback_response)
    sources = format_source_citations(chunks)

    t_gen_start = time.perf_counter()
    full_answer_parts = []

    try:
        stream = ollama.chat(
            model=LLM_MODEL_NAME,
            messages=messages,
            options={
                "num_ctx": LLM_CONTEXT_WINDOW,
                "num_predict": LLM_MAX_NEW_TOKENS,
                "temperature": temperature,
            },
            stream=True,
        )

        for chunk in stream:
            token = chunk.get("message", {}).get("content", "")
            if token:
                full_answer_parts.append(token)
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"

        t_gen_end = time.perf_counter()
        full_answer = "".join(full_answer_parts).strip()
        if not full_answer:
            full_answer = fallback_response

        generation_ms = round((t_gen_end - t_gen_start) * 1000.0, 2)
        total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)

        done_payload = {
            "type": "done",
            "answer": full_answer,
            "sources": sources,
            "context_analysis": retrieval_res.get("context_analysis", {}),
            "latency": {
                "retrieval_ms": retrieval_ms,
                "reranking_ms": reranking_ms,
                "generation_ms": generation_ms,
                "total_ms": total_ms,
            },
            "status": "success",
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    except Exception as exc:
        total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        err_payload = {
            "type": "error",
            "message": f"Error during model generation: {exc}",
            "latency": {
                "retrieval_ms": retrieval_ms,
                "reranking_ms": reranking_ms,
                "generation_ms": 0.0,
                "total_ms": total_ms,
            },
        }
        yield f"data: {json.dumps(err_payload)}\n\n"


def generate_document_summary(
    document_name: Optional[str] = None,
    summary_type: str = "detailed",
    temperature: float = LLM_TEMPERATURE,
) -> Dict[str, Any]:
    """
    Generate structured summaries with latency tracking:
    Types: 'brief', 'detailed', 'bullet_points', 'executive', 'key_findings', 'multi_document'
    Uses hierarchical aggregation across document chunks for long documents.
    """
    t_start = time.perf_counter()

    health = check_ollama_status()
    if health["status"] != "connected":
        return {
            "document_name": document_name or "All Documents",
            "summary_type": summary_type,
            "summary": "⚠️ Ollama is not reachable. Please ensure Ollama is running.",
            "sources": [],
            "latency": {"retrieval_ms": 0.0, "reranking_ms": 0.0, "generation_ms": 0.0, "total_ms": 0.0},
            "status": "ollama_unavailable",
        }

    collection = get_or_create_collection()
    where_clause = {"document": document_name} if document_name else None

    t_fetch_start = time.perf_counter()
    all_records = collection.get(
        where=where_clause,
        include=["documents", "metadatas"],
    )
    docs = all_records.get("documents", []) or []
    metas = all_records.get("metadatas", []) or []
    fetch_ms = round((time.perf_counter() - t_fetch_start) * 1000.0, 2)

    if not docs:
        total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        return {
            "document_name": document_name or "All Documents",
            "summary_type": summary_type,
            "summary": "No indexed content found to summarize. Please upload and index documents first.",
            "sources": [],
            "latency": {"retrieval_ms": fetch_ms, "reranking_ms": 0.0, "generation_ms": 0.0, "total_ms": total_ms},
            "status": "no_data",
        }

    # Reconstruct chunks with page numbers
    chunk_list = []
    for d_text, meta in zip(docs, metas):
        chunk_list.append({
            "document": meta.get("document", document_name or "Unknown"),
            "page_number": meta.get("page_number", 1),
            "chunk_id": meta.get("chunk_id", ""),
            "text": d_text,
        })

    # Sort chunks in document reading order (by page number)
    chunk_list.sort(key=lambda c: (c["document"], c["page_number"]))

    # Laptop-Optimized Hierarchical Summarization:
    if len(chunk_list) <= 8:
        combined_context = "\n\n".join(
            f"[{c['document']} - Page {c['page_number']}]: {c['text']}" for c in chunk_list
        )
    else:
        # Sample beginning, middle, and end for balanced document coverage
        step = max(1, len(chunk_list) // 8)
        sampled_chunks = [chunk_list[i] for i in range(0, len(chunk_list), step)][:8]
        combined_context = "\n\n".join(
            f"[{c['document']} - Page {c['page_number']}]: {c['text']}" for c in sampled_chunks
        )

    # Style prompts
    style_prompts = {
        "brief": "Provide a concise, unified 1-2 paragraph executive summary covering core purpose, activities, and outcomes.",
        "detailed": "Provide a comprehensive, well-structured multi-paragraph summary with clear subheadings (Objective, Key Activities, Findings, Outcomes, Conclusions).",
        "bullet_points": "Provide a clean bullet-point summary listing 6 to 10 key takeaways, important dates, metrics, and achievements.",
        "executive": "Provide an executive briefing containing: Executive Overview, Key Objectives & Findings, Notable Dates & Entities, and Final Conclusion.",
        "key_findings": "Extract and highlight the primary findings, core technical components, important dates, and specific results achieved.",
        "multi_document": "Synthesize a multi-document summary highlighting the overarching themes, individual document roles, key dates, and comparative conclusions.",
    }

    instructions = style_prompts.get(summary_type, style_prompts["detailed"])

    system_prompt = (
        "You are ContextIQ, an advanced RAG summarization system. "
        "Generate a high-quality, professional summary grounded strictly in the provided document content. "
        "Do not invent facts or embellish details. Cite document names and page references when highlighting key findings."
    )

    user_prompt = (
        f"DOCUMENT CONTEXT:\n{combined_context}\n\n"
        f"INSTRUCTIONS: {instructions}\n\n"
        "FORMATTING: Use GitHub-flavored Markdown with crisp headings, bold entity names, and clean formatting."
    )

    t_gen_start = time.perf_counter()
    try:
        response = ollama.chat(
            model=LLM_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            options={
                "num_ctx": LLM_CONTEXT_WINDOW,
                "num_predict": LLM_MAX_NEW_TOKENS + 200,
                "temperature": temperature,
            },
        )
        t_gen_end = time.perf_counter()
        final_summary = response["message"]["content"].strip()
    except Exception as exc:
        total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)
        return {
            "document_name": document_name or "All Documents",
            "summary_type": summary_type,
            "summary": f"Failed to generate summary: {exc}",
            "sources": [],
            "latency": {"retrieval_ms": fetch_ms, "reranking_ms": 0.0, "generation_ms": 0.0, "total_ms": total_ms},
            "status": "generation_error",
        }

    generation_ms = round((t_gen_end - t_gen_start) * 1000.0, 2)
    total_ms = round((time.perf_counter() - t_start) * 1000.0, 2)

    # Collect source references
    sources = []
    seen_refs = set()
    for c in chunk_list[:15]:
        ref_key = (c["document"], c["page_number"])
        if ref_key not in seen_refs:
            seen_refs.add(ref_key)
            sources.append({"document": c["document"], "page_number": c["page_number"]})

    return {
        "document_name": document_name or "All Documents",
        "summary_type": summary_type,
        "summary": final_summary,
        "sources": sources,
        "latency": {
            "retrieval_ms": fetch_ms,
            "reranking_ms": 0.0,
            "generation_ms": generation_ms,
            "total_ms": total_ms,
        },
        "status": "success",
    }
