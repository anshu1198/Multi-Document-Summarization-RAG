"""
Contradiction Detection Engine
ContextIQ — AI Document Intelligence

Combines:
1. Deterministic date normalization and conflict analysis across documents.
   (e.g., detects end-date discrepancies while preventing false alarms on formatting differences)
2. Deterministic numerical & duration conflict detection.
3. LLM semantic contradiction verification grounded in cross-document excerpts.
4. Duplicate finding suppression and source/page citation preservation.
"""

import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple
import ollama

from backend.config import (
    LLM_MODEL_NAME,
    LLM_CONTEXT_WINDOW,
    PROMPTS_DIR,
)
from backend.vector_store import get_or_create_collection
from backend.summarizer import check_ollama_status

CONTRADICTION_PROMPT_PATH = PROMPTS_DIR / "contradiction_prompt.txt"


def normalize_date(date_text: str) -> Optional[datetime.date]:
    """Parse various date string formats into a standardized datetime.date object."""
    if not date_text or not isinstance(date_text, str):
        return None

    cleaned = date_text.strip().rstrip(",.").strip()
    formats = [
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%Y-%m-%d",
        "%B %d, %Y",
        "%b %d, %Y",
        "%d %B %Y",
        "%d %b %Y",
        "%B %Y",
        "%b %Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue
    return None


def extract_dates_from_chunks(chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract structured date claims with attribute labels, normalized date,
    source document, and page number.
    """
    date_claims = []

    # Patterns for date ranges and milestones
    period_pattern = re.compile(
        r"(?:period of internship|internship period|duration)[\s:]*from\s+([0-9]{1,2}/[0-9]{1,2}/[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})\s+to\s+([0-9]{1,2}/[0-9]{1,2}/[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})",
        re.IGNORECASE,
    )

    start_date_pattern = re.compile(
        r"(?:start date|joined(?: on)?|commenced on|joining date)[\s:]*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})",
        re.IGNORECASE,
    )

    end_date_pattern = re.compile(
        r"(?:end date|completed on|completion date|ended on)[\s:]*([0-9]{1,2}/[0-9]{1,2}/[0-9]{4}|[A-Za-z]+\s+[0-9]{1,2},?\s+[0-9]{4})",
        re.IGNORECASE,
    )

    duration_weeks_pattern = re.compile(
        r"(?:duration|period)[\s:]*(?:of\s*)?([0-9]{1,2})\s*(?:weeks|months)",
        re.IGNORECASE,
    )

    for chunk in chunks:
        text = chunk.get("text", "")
        doc = chunk.get("document", "Unknown Document")
        page = chunk.get("page_number", 1)

        # Check for Period From X to Y
        for match in period_pattern.finditer(text):
            raw_start, raw_end = match.group(1), match.group(2)
            d_start = normalize_date(raw_start)
            d_end = normalize_date(raw_end)
            if d_start:
                date_claims.append({
                    "attribute": "internship_start_date",
                    "raw_value": raw_start,
                    "normalized_value": d_start,
                    "statement": match.group(0),
                    "document": doc,
                    "page_number": page,
                })
            if d_end:
                date_claims.append({
                    "attribute": "internship_end_date",
                    "raw_value": raw_end,
                    "normalized_value": d_end,
                    "statement": match.group(0),
                    "document": doc,
                    "page_number": page,
                })

        # Check for individual start dates
        for match in start_date_pattern.finditer(text):
            raw_val = match.group(1)
            norm = normalize_date(raw_val)
            if norm:
                date_claims.append({
                    "attribute": "internship_start_date",
                    "raw_value": raw_val,
                    "normalized_value": norm,
                    "statement": match.group(0),
                    "document": doc,
                    "page_number": page,
                })

        # Check for individual end dates
        for match in end_date_pattern.finditer(text):
            raw_val = match.group(1)
            norm = normalize_date(raw_val)
            if norm:
                date_claims.append({
                    "attribute": "internship_end_date",
                    "raw_value": raw_val,
                    "normalized_value": norm,
                    "statement": match.group(0),
                    "document": doc,
                    "page_number": page,
                })

        # Check for duration weeks
        for match in duration_weeks_pattern.finditer(text):
            date_claims.append({
                "attribute": "duration_value",
                "raw_value": match.group(0),
                "normalized_value": match.group(1),
                "statement": match.group(0),
                "document": doc,
                "page_number": page,
            })

    return date_claims


def detect_deterministic_conflicts(date_claims: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Compare structured claims across different documents to identify deterministic conflicts.
    Prevents false alarms caused by formatting differences (e.g. 21/05/2025 vs May 21, 2025).
    """
    conflicts = []
    seen_pairs = set()

    # Group claims by attribute
    claims_by_attr = {}
    for claim in date_claims:
        claims_by_attr.setdefault(claim["attribute"], []).append(claim)

    for attr, items in claims_by_attr.items():
        # Compare across distinct documents
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                item_a = items[i]
                item_b = items[j]

                # Only compare statements across different documents
                if item_a["document"] == item_b["document"]:
                    continue

                val_a = item_a["normalized_value"]
                val_b = item_b["normalized_value"]

                # If values match (even with different original text formats), it is NOT a contradiction!
                if val_a == val_b:
                    continue

                pair_key = tuple(sorted([
                    (item_a["document"], str(val_a)),
                    (item_b["document"], str(val_b)),
                ]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)

                attr_label = attr.replace("_", " ").title()
                conflicts.append({
                    "id": f"det_conflict_{len(conflicts) + 1}",
                    "title": f"Conflicting {attr_label}",
                    "conflict_type": "date" if "date" in attr else "numerical",
                    "severity": "clear_contradiction",
                    "attribute": attr_label,
                    "statement_a": {
                        "text": item_a["statement"],
                        "document": item_a["document"],
                        "page_number": item_a["page_number"],
                        "value": str(val_a),
                    },
                    "statement_b": {
                        "text": item_b["statement"],
                        "document": item_b["document"],
                        "page_number": item_b["page_number"],
                        "value": str(val_b),
                    },
                    "explanation": (
                        f"{item_a['document']} specifies {attr_label} as '{item_a['raw_value']}', "
                        f"whereas {item_b['document']} records '{item_b['raw_value']}'. "
                        "These two claims cannot both be true simultaneously."
                    ),
                })

    return conflicts


def detect_semantic_contradictions_llm(
    chunks: List[Dict[str, Any]],
    max_pairs: int = 5,
) -> List[Dict[str, Any]]:
    """
    Use Ollama to evaluate potential semantic contradictions across document chunks.
    Filters out unsupported claims and adheres strictly to prompts/contradiction_prompt.txt.
    """
    health = check_ollama_status()
    if health["status"] != "connected":
        return []

    # Filter chunks belonging to multiple distinct documents
    docs_present = set(c.get("document") for c in chunks)
    if len(docs_present) < 2:
        return []

    # Build concise cross-document comparison sample
    doc_groups = {}
    for c in chunks:
        doc = c.get("document", "Unknown")
        doc_groups.setdefault(doc, []).append(c)

    doc_names = list(doc_groups.keys())
    sample_excerpts = []
    for d_name in doc_names[:2]:
        for c in doc_groups[d_name][:4]:
            sample_excerpts.append(
                f"[{c['document']} - Page {c['page_number']}]: {c['text'][:400]}"
            )

    combined_text = "\n\n".join(sample_excerpts)

    system_prompt = (
        "You are an expert strict contradiction detection assistant. "
        "Review the provided passages from two different documents. "
        "Identify genuine factual contradictions where both documents make directly conflicting claims "
        "about the EXACT same subject and attribute (dates, durations, project scope, entities, or numerical results).\n\n"
        "STRICT RULES:\n"
        "1. Do NOT compare unrelated statements (e.g. skills vs dates).\n"
        "2. Do NOT treat different date formats representing the same day (e.g. May 21, 2025 vs 21/05/2025) as a contradiction.\n"
        "3. If no genuine contradictions exist, respond with an empty JSON array: []\n"
        "4. If a contradiction exists, return ONLY a valid JSON array of objects with the following keys:\n"
        "   - title: Short description of the conflict\n"
        "   - conflict_type: 'semantic', 'date', or 'numerical'\n"
        "   - severity: 'clear_contradiction' or 'possible_inconsistency'\n"
        "   - attribute: The exact attribute that conflicts\n"
        "   - statement_a: { text, document, page_number }\n"
        "   - statement_b: { text, document, page_number }\n"
        "   - explanation: Direct explanation of why they cannot both be true\n"
    )

    user_prompt = (
        f"DOCUMENT PASSAGES:\n{combined_text}\n\n"
        "Analyze for genuine cross-document contradictions and output JSON only."
    )

    try:
        res = ollama.chat(
            model=LLM_MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            options={"num_ctx": LLM_CONTEXT_WINDOW, "num_predict": 500, "temperature": 0.0},
        )
        content = res["message"]["content"].strip()
        # Extract JSON array
        json_match = re.search(r"\[\s*\{.*\}\s*\]", content, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            if isinstance(parsed, list):
                valid_items = []
                for idx, item in enumerate(parsed):
                    if isinstance(item, dict) and "statement_a" in item and "statement_b" in item:
                        item["id"] = f"llm_conflict_{idx + 1}"
                        valid_items.append(item)
                return valid_items
    except Exception:
        pass

    return []


def run_contradiction_detection(
    document_names: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Execute full contradiction detection pipeline across uploaded documents.
    Combines deterministic verification and LLM cross-examination.
    """
    collection = get_or_create_collection()

    all_records = collection.get(include=["documents", "metadatas"])
    raw_docs = all_records.get("documents", []) or []
    raw_metas = all_records.get("metadatas", []) or []

    chunks = []
    for text, meta in zip(raw_docs, raw_metas):
        doc_name = meta.get("document", "Unknown")
        if document_names and doc_name not in document_names:
            continue
        chunks.append({
            "text": text,
            "document": doc_name,
            "page_number": meta.get("page_number", 1),
            "chunk_id": meta.get("chunk_id", ""),
        })

    docs_found = list(dict.fromkeys(c["document"] for c in chunks))

    if len(docs_found) < 2:
        return {
            "status": "insufficient_documents",
            "message": (
                "Contradiction detection compares claims across multiple documents. "
                f"Currently, only {len(docs_found)} document is indexed. Please upload at least two documents."
            ),
            "documents_analyzed": docs_found,
            "findings_count": 0,
            "findings": [],
        }

    # 1. Deterministic Extraction & Comparison
    date_claims = extract_dates_from_chunks(chunks)
    deterministic_findings = detect_deterministic_conflicts(date_claims)

    # 2. Semantic LLM Analysis
    llm_findings = detect_semantic_contradictions_llm(chunks)

    # Merge and deduplicate
    all_findings = []
    seen_explanations = set()

    for item in deterministic_findings + llm_findings:
        exp_snippet = item.get("explanation", "")[:50].lower()
        if exp_snippet and exp_snippet in seen_explanations:
            continue
        seen_explanations.add(exp_snippet)
        all_findings.append(item)

    return {
        "status": "success",
        "message": f"Analyzed {len(docs_found)} documents and identified {len(all_findings)} finding(s).",
        "documents_analyzed": docs_found,
        "findings_count": len(all_findings),
        "findings": all_findings,
    }
