"""
FastAPI Application Entry Point
ContextIQ — AI Document Intelligence
Multi-Document Summarization with Context Awareness using RAG

Provides production-grade REST APIs for:
- System Health & Live Metrics
- Document Ingestion, Extraction, Chunking & Indexing
- Context-Aware Question Answering with Citations
- Multi-format & Hierarchical Summarization
- Multi-Document Comparison
- Strict Contradiction Detection
- Interaction History & Session Persistence
"""

import datetime
import os
import shutil
import sys
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

# Ensure root directory is on sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.config import (
    API_HOST,
    API_PORT,
    CORS_ORIGINS,
    RAW_DOCUMENTS_DIR,
    LLM_MODEL_NAME,
)
from backend.document_processor import (
    extract_pdf_pages,
    create_chunks_for_document,
    register_document_metadata,
)
from backend.vector_store import (
    index_chunks,
    delete_document_from_store,
    list_indexed_documents,
    get_database_metrics,
    get_or_create_collection,
)
from backend.summarizer import (
    check_ollama_status,
    answer_question,
    stream_answer_question,
    generate_document_summary,
)
from backend.contradiction_detector import run_contradiction_detection
from backend.comparator import compare_documents
from backend.history_manager import (
    load_history,
    record_history_event,
    clear_all_history,
    delete_history_item,
)
from backend.schemas import (
    HealthResponse,
    MetricsResponse,
    DocumentListResponse,
    DocumentUploadResponse,
    AskQuestionRequest,
    AskQuestionResponse,
    SummarizeRequest,
    SummarizeResponse,
    CompareRequest,
    CompareResponse,
    ContradictionRequest,
    ContradictionResponse,
    HistoryResponse,
)

# Initialize FastAPI App
app = FastAPI(
    title="ContextIQ — AI Document Intelligence API",
    description="Multi-Document Summarization with Context Awareness using RAG",
    version="2.0.0",
)

# Add CORS Middleware for smooth Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
def get_system_health():
    """Verify backend system status, Ollama connection, and ChromaDB health."""
    ollama_info = check_ollama_status()
    try:
        col = get_or_create_collection()
        chroma_status = "connected"
        doc_count = col.count()
    except Exception as exc:
        chroma_status = f"error: {exc}"
        doc_count = 0

    return {
        "status": "healthy" if ollama_info["status"] == "connected" and chroma_status == "connected" else "degraded",
        "ollama_status": ollama_info["status"],
        "target_model": LLM_MODEL_NAME,
        "model_ready": ollama_info.get("model_ready", False),
        "chroma_status": chroma_status,
        "indexed_documents_count": doc_count,
        "message": ollama_info["message"],
    }


@app.get("/api/metrics", response_model=MetricsResponse, tags=["Dashboard"])
def get_metrics():
    """Get real dashboard metrics from the vector database and history logs."""
    db_metrics = get_database_metrics()
    history = load_history()
    recent_queries_count = sum(1 for h in history if h.get("event_type") == "question")

    return {
        "total_documents": db_metrics["total_documents"],
        "total_pages": db_metrics["total_pages"],
        "total_chunks": db_metrics["total_chunks"],
        "recent_queries_count": recent_queries_count,
        "collection_name": db_metrics["collection_name"],
        "status": db_metrics["status"],
    }


@app.get("/api/documents", response_model=DocumentListResponse, tags=["Documents"])
def get_documents():
    """List all currently indexed documents with page and chunk metadata."""
    docs = list_indexed_documents()
    return {
        "total_documents": len(docs),
        "documents": docs,
    }


@app.post("/api/documents/upload", response_model=List[DocumentUploadResponse], tags=["Documents"])
async def upload_documents(files: List[UploadFile] = File(...)):
    """
    Upload one or multiple PDF documents.
    Pipeline:
    1. Validate PDF format and file size
    2. Save raw file into data/raw/
    3. Extract text per page using PyMuPDF (with scanned / empty detection)
    4. Generate overlapping semantic chunks
    5. Compute embeddings and upsert into ChromaDB
    6. Persist document metadata
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    upload_results = []
    RAW_DOCUMENTS_DIR.mkdir(parents=True, exist_ok=True)

    for upload_file in files:
        filename = upload_file.filename or "uploaded_document.pdf"
        if not filename.lower().endswith(".pdf"):
            upload_results.append({
                "message": f"File '{filename}' skipped: Only PDF files are supported.",
                "document_name": filename,
                "page_count": 0,
                "chunk_count": 0,
                "warning": "Unsupported file format.",
                "status": "failed",
            })
            continue

        dest_path = RAW_DOCUMENTS_DIR / filename
        try:
            # Save uploaded bytes to disk
            with open(dest_path, "wb") as buffer:
                shutil.copyfileobj(upload_file.file, buffer)

            file_size = dest_path.stat().st_size

            # Extract pages with PyMuPDF
            pages, summary = extract_pdf_pages(dest_path)

            # Generate chunks
            chunks = create_chunks_for_document(pages, document_name=filename)

            if not chunks:
                upload_results.append({
                    "message": f"Document '{filename}' has no extractable text chunks (may be scanned).",
                    "document_name": filename,
                    "page_count": len(pages),
                    "chunk_count": 0,
                    "warning": summary.get("warning") or "No text could be extracted.",
                    "status": "failed",
                })
                continue

            # Index into ChromaDB
            indexed_count = index_chunks(chunks)

            # Register metadata
            now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
            register_document_metadata({
                "document_name": filename,
                "page_count": len(pages),
                "chunk_count": indexed_count,
                "file_size": file_size,
                "upload_date": now_iso,
                "is_scanned": summary.get("is_scanned", False),
            })

            upload_results.append({
                "message": f"Document '{filename}' successfully extracted, embedded, and indexed.",
                "document_name": filename,
                "page_count": len(pages),
                "chunk_count": indexed_count,
                "warning": summary.get("warning"),
                "status": "ready",
            })

        except Exception as exc:
            upload_results.append({
                "message": f"Failed to process '{filename}': {str(exc)}",
                "document_name": filename,
                "page_count": 0,
                "chunk_count": 0,
                "warning": str(exc),
                "status": "failed",
            })

    return upload_results


@app.delete("/api/documents/{document_name}", tags=["Documents"])
def delete_document(document_name: str):
    """Delete a document and all its chunks from ChromaDB and metadata registry."""
    deleted_chunks = delete_document_from_store(document_name)

    # Remove raw file if present
    raw_path = RAW_DOCUMENTS_DIR / document_name
    if raw_path.exists():
        try:
            raw_path.unlink()
        except Exception:
            pass

    return {
        "message": f"Document '{document_name}' deleted successfully.",
        "document_name": document_name,
        "deleted_chunks": deleted_chunks,
        "status": "deleted",
    }


@app.post("/api/qa/ask", response_model=AskQuestionResponse, tags=["RAG QA"])
def ask_question_endpoint(req: AskQuestionRequest):
    """
    Context-aware question answering with source citations and page numbers.
    Supports follow-up questions using conversation history and includes latency breakdown.
    """
    res = answer_question(
        question=req.question,
        top_k=req.top_k,
        document_filter=req.document_filter,
        conversation_history=req.conversation_history,
        temperature=req.temperature,
    )

    # Record in history
    record_history_event(
        event_type="question",
        title=req.question[:80],
        content={
            "question": req.question,
            "answer": res["answer"],
            "sources": res.get("sources", []),
            "document_filter": req.document_filter,
            "latency": res.get("latency", {}),
        },
    )

    return res


@app.post("/api/qa/ask/stream", tags=["RAG QA"])
def ask_question_stream_endpoint(req: AskQuestionRequest):
    """
    Real-time streaming question answering using Server-Sent Events (SSE).
    Yields pipeline status events, token chunks as generated, and final citation/latency metrics.
    """
    generator = stream_answer_question(
        question=req.question,
        top_k=req.top_k,
        document_filter=req.document_filter,
        conversation_history=req.conversation_history,
        temperature=req.temperature,
    )
    return StreamingResponse(generator, media_type="text/event-stream")


@app.post("/api/summarize", response_model=SummarizeResponse, tags=["Summarization"])
def summarize_endpoint(req: SummarizeRequest):
    """
    Generate document or multi-document summaries.
    Types: 'brief', 'detailed', 'bullet_points', 'executive', 'key_findings', 'multi_document'
    """
    res = generate_document_summary(
        document_name=req.document_name,
        summary_type=req.summary_type,
        temperature=req.temperature,
    )

    # Record in history
    record_history_event(
        event_type="summary",
        title=f"{req.summary_type.replace('_', ' ').title()} - {req.document_name or 'Multi-Document'}",
        content={
            "document_name": req.document_name or "All Documents",
            "summary_type": req.summary_type,
            "summary": res["summary"],
            "sources": res.get("sources", []),
            "latency": res.get("latency", {}),
        },
    )

    return res


@app.post("/api/compare", response_model=CompareResponse, tags=["Multi-Document Comparison"])
def compare_endpoint(req: CompareRequest):
    """Compare content across two or more documents."""
    res = compare_documents(document_names=req.document_names)

    if res.get("report"):
        record_history_event(
            event_type="comparison",
            title=f"Comparison: {' vs '.join(req.document_names[:2])}",
            content=res,
        )

    return res


@app.post("/api/contradictions/detect", response_model=ContradictionResponse, tags=["Contradictions"])
def detect_contradictions_endpoint(req: ContradictionRequest):
    """
    Detect factual and date/numerical contradictions across uploaded documents.
    Grounded with source citations and page numbers.
    """
    res = run_contradiction_detection(document_names=req.document_names)

    record_history_event(
        event_type="contradiction",
        title=f"Contradiction Scan ({res.get('findings_count', 0)} findings)",
        content=res,
    )

    return res


@app.get("/api/context/explore", tags=["Context Awareness"])
def get_context_exploration(document_names: Optional[str] = Query(None)):
    """
    Explore cross-document relationships, lexical graph overlap, shared concepts,
    and topical clusters across indexed documents in ChromaDB.
    """
    from backend.context_awareness import analyze_context, normalize_text
    col = get_or_create_collection()
    where_clause = None
    if document_names:
        doc_list = [d.strip() for d in document_names.split(",") if d.strip()]
        if len(doc_list) == 1:
            where_clause = {"document": doc_list[0]}
        elif len(doc_list) > 1:
            where_clause = {"document": {"$in": doc_list}}

    records = col.get(where=where_clause, include=["documents", "metadatas"])
    texts = records.get("documents", []) or []
    metas = records.get("metadatas", []) or []

    chunks = []
    for t, m in zip(texts, metas):
        chunks.append({
            "text": t,
            "document": m.get("document", "Unknown"),
            "page_number": m.get("page_number", 1),
            "chunk_id": m.get("chunk_id", ""),
        })

    doc_buckets = {}
    for c in chunks:
        doc_buckets.setdefault(c["document"], []).append(c)

    sampled = []
    for d_name, d_chunks in doc_buckets.items():
        step = max(1, len(d_chunks) // 8)
        sampled.extend(d_chunks[::step][:8])

    analysis = analyze_context(sampled, similarity_threshold=0.08)

    term_doc_map = {}
    for c in sampled:
        tokens = set(normalize_text(c["text"]))
        for tok in tokens:
            term_doc_map.setdefault(tok, set()).add(c["document"])

    cross_doc_terms = [
        {"term": tok, "doc_count": len(docs), "documents": list(docs)}
        for tok, docs in term_doc_map.items()
        if len(docs) > 1
    ]
    cross_doc_terms.sort(key=lambda x: x["doc_count"], reverse=True)

    return {
        "status": "success",
        "total_documents": len(doc_buckets),
        "total_sampled_chunks": len(sampled),
        "relationships_count": len(analysis.get("relationships", [])),
        "relationships": analysis.get("relationships", []),
        "context_groups": analysis.get("context_groups", []),
        "cross_document_concepts": cross_doc_terms[:25],
        "documents": list(doc_buckets.keys()),
    }


@app.get("/api/history", response_model=HistoryResponse, tags=["History"])
def get_history():
    """Retrieve persisted history of past interactions."""
    items = load_history()
    return {
        "total_items": len(items),
        "items": items,
    }


@app.delete("/api/history", tags=["History"])
def clear_history():
    """Clear all persisted history."""
    clear_all_history()
    return {"message": "History cleared successfully.", "status": "cleared"}


@app.delete("/api/history/{item_id}", tags=["History"])
def delete_single_history_item(item_id: str):
    """Delete a single history entry by ID."""
    removed = delete_history_item(item_id)
    if not removed:
        raise HTTPException(status_code=404, detail="History item not found.")
    return {"message": f"History item {item_id} deleted.", "status": "deleted"}


# Mount Frontend Static Assets if built
FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")


def run_cli_interactive():
    """Interactive command-line interface for testing without a browser."""
    print("=" * 60)
    print("ContextIQ — AI Document Intelligence (Interactive CLI)")
    print("=" * 60)
    print("Checking Ollama status...")
    status_info = check_ollama_status()
    print(f"Ollama: {status_info['status']} | Model: {LLM_MODEL_NAME}")
    print("Type 'exit' to quit.\n")

    history = []
    while True:
        try:
            q = input("\nEnter your question: ").strip()
            if q.lower() in ["exit", "quit"]:
                break
            if not q:
                continue

            print("\nGenerating grounded answer...")
            res = answer_question(question=q, conversation_history=history)
            print("\nANSWER:")
            print("-" * 50)
            print(res["answer"])

            print("\nSOURCES:")
            print("-" * 50)
            for s in res.get("sources", []):
                print(f"- {s['document']}, page {s['page_number']} (Score: {s['score']:.4f})")

            history.append({"role": "user", "content": q})
            history.append({"role": "assistant", "content": res["answer"]})

        except (KeyboardInterrupt, EOFError):
            break
        except Exception as exc:
            print(f"Error: {exc}")


if __name__ == "__main__":
    import uvicorn

    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        run_cli_interactive()
    else:
        print(f"Starting ContextIQ Backend on http://{API_HOST}:{API_PORT}")
        uvicorn.run("backend.app:app", host=API_HOST, port=API_PORT, reload=True)
