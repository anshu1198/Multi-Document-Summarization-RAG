"""
Multi-Document Comparison Module
ContextIQ — AI Document Intelligence

Generates comparative analysis between two or more documents:
- Overview of each document
- Similarities
- Differences
- Important Dates & Milestones
- Key Findings & Conclusions
- Conflicting Points
"""

from typing import Any, Dict, List, Optional
import ollama

from backend.config import LLM_MODEL_NAME, LLM_CONTEXT_WINDOW
from backend.vector_store import get_or_create_collection
from backend.summarizer import check_ollama_status


def compare_documents(
    document_names: List[str],
) -> Dict[str, Any]:
    """Compare content across two or more documents."""
    if not document_names or len(document_names) < 2:
        return {
            "status": "error",
            "message": "Please select at least two documents for comparison.",
            "documents": document_names or [],
            "report": None,
        }

    health = check_ollama_status()
    if health["status"] != "connected":
        return {
            "status": "ollama_unavailable",
            "message": "Ollama service is not reachable.",
            "documents": document_names,
            "report": None,
        }

    collection = get_or_create_collection()

    doc_summaries = {}
    sources = []

    for doc_name in document_names:
        records = collection.get(
            where={"document": doc_name},
            include=["documents", "metadatas"],
        )
        texts = records.get("documents", []) or []
        metas = records.get("metadatas", []) or []

        if not texts:
            continue

        sample_text = "\n".join(texts[:6])
        doc_summaries[doc_name] = sample_text

        for meta in metas[:5]:
            sources.append({
                "document": doc_name,
                "page_number": meta.get("page_number", 1),
            })

    if len(doc_summaries) < 2:
        return {
            "status": "error",
            "message": "Could not retrieve sufficient text for at least two chosen documents.",
            "documents": document_names,
            "report": None,
        }

    context_blocks = []
    for doc_name, text in doc_summaries.items():
        context_blocks.append(f"=== DOCUMENT: {doc_name} ===\n{text[:1500]}")

    combined_context = "\n\n".join(context_blocks)

    system_prompt = (
        "You are ContextIQ's multi-document comparison specialist. "
        "Your task is to produce a structured, thorough, and objective comparative report "
        "analyzing the provided documents.\n\n"
        "Generate a report with the following exact markdown sections:\n"
        "### 1. Executive Overview\n"
        "Brief overview of each document's core topic, author, or organization.\n\n"
        "### 2. Key Similarities\n"
        "Specific overlapping objectives, methodologies, or findings.\n\n"
        "### 3. Key Differences\n"
        "Differences in duration, scope, focus areas, tools, or conclusions.\n\n"
        "### 4. Important Dates & Milestones\n"
        "Tabular or bulleted comparison of all dates (start dates, completion dates, milestones).\n\n"
        "### 5. Notable Findings & Contrasts\n"
        "Points of agreement or potential discrepancies.\n\n"
        "### 6. Summary Conclusion\n"
        "Overall takeaway from synthesizing these documents together."
    )

    user_prompt = (
        f"DOCUMENT PASSAGES FOR COMPARISON:\n{combined_context}\n\n"
        "Generate the comprehensive comparative report now."
    )

    try:
        res = ollama.chat(
            model=LLM_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            options={"num_ctx": LLM_CONTEXT_WINDOW, "num_predict": 700, "temperature": 0.1},
        )
        report_text = res["message"]["content"].strip()

        return {
            "status": "success",
            "documents": document_names,
            "report": report_text,
            "sources": sources,
        }
    except Exception as exc:
        return {
            "status": "error",
            "message": f"Failed to generate comparison report: {exc}",
            "documents": document_names,
            "report": None,
        }
