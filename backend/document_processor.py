"""
Document Ingestion & Processing Module
ContextIQ — AI Document Intelligence

Handles:
1. Multi-PDF text extraction with PyMuPDF
2. Robust sanitization & artifact cleaning
3. Scanned / empty / corrupted PDF detection
4. Overlapping semantic chunking
5. Metadata preservation (Doc ID, Doc Name, Page Number, Chunk ID, Timestamp)
"""

import datetime
import hashlib
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import pymupdf

from backend.config import (
    RAW_DOCUMENTS_DIR,
    PROCESSED_DIR,
    CHUNKS_DIR,
    METADATA_FILE,
    SUPPORTED_DOCUMENT_EXTENSIONS,
)


def compute_file_hash(file_bytes: bytes) -> str:
    """Compute SHA-256 hash to detect duplicate documents."""
    return hashlib.sha256(file_bytes).hexdigest()


def clean_text(text: str) -> str:
    """Normalize whitespace and remove common PDF extraction artifacts."""
    if not isinstance(text, str):
        return ""

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00a0", " ")

    # Filter out non-printable characters while preserving newlines and tabs
    text = "".join(char for char in text if char in "\n\t" or char.isprintable())

    # Join hyphenated words split across lines
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)

    # Normalize spaces while retaining double newlines as paragraph boundaries
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]*\n+", "\n\n", text)

    return text.strip()


def extract_pdf_pages(file_path: Path) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extract text and page-level metadata from a PDF file using PyMuPDF.
    Returns:
        (pages_list, extraction_summary)
    """
    file_path = Path(file_path)
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if file_path.suffix.lower() not in SUPPORTED_DOCUMENT_EXTENSIONS:
        raise ValueError(f"Unsupported file format: {file_path.suffix}. Expected PDF.")

    pages = []
    empty_pages = 0
    total_characters = 0

    try:
        with pymupdf.open(str(file_path)) as doc:
            page_count = len(doc)
            if page_count == 0:
                raise ValueError("PDF document has 0 pages.")

            for page_idx, page in enumerate(doc, start=1):
                raw_text = page.get_text("text") or ""
                cleaned = clean_text(raw_text)

                if not cleaned:
                    empty_pages += 1
                else:
                    total_characters += len(cleaned)

                pages.append({
                    "document": file_path.name,
                    "page_number": page_idx,
                    "text": cleaned,
                    "raw_character_count": len(raw_text),
                })

    except pymupdf.FileDataError as exc:
        raise ValueError(f"Corrupted or invalid PDF file: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Error opening PDF: {exc}") from exc

    is_scanned_likely = (total_characters < 50 and page_count > 0) or (empty_pages == page_count)

    summary = {
        "document_name": file_path.name,
        "page_count": len(pages),
        "empty_pages": empty_pages,
        "total_characters": total_characters,
        "is_scanned": is_scanned_likely,
        "warning": (
            "Document appears to be scanned or contains image-only pages. Text extraction yielded little or no text."
            if is_scanned_likely else None
        ),
    }

    return pages, summary


def chunk_text(text: str, max_words: int = 180, overlap_words: int = 30) -> List[str]:
    """Split text into overlapping word windows to preserve context."""
    if not isinstance(text, str) or not text.strip():
        return []

    words = text.split()
    if len(words) <= max_words:
        return [" ".join(words)]

    chunks = []
    start = 0
    while start < len(words):
        end = min(start + max_words, len(words))
        chunks.append(" ".join(words[start:end]))
        if end >= len(words):
            break
        start = end - overlap_words

    return chunks


def create_chunks_for_document(
    pages: List[Dict[str, Any]],
    document_name: str,
    max_words: int = 180,
    overlap_words: int = 30,
) -> List[Dict[str, Any]]:
    """Generate structured overlapping chunks from extracted pages with unique IDs."""
    doc_stem = Path(document_name).stem
    sanitized_stem = re.sub(r"[^\w\-_.]", "_", doc_stem)
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    chunks = []
    chunk_counter = 0

    for page in pages:
        page_num = page.get("page_number", 1)
        text = page.get("text", "").strip()
        if not text:
            continue

        page_chunks = chunk_text(text, max_words=max_words, overlap_words=overlap_words)
        for sub_idx, chunk_content in enumerate(page_chunks, start=1):
            chunk_counter += 1
            chunk_id = f"{sanitized_stem}_p{page_num}_c{chunk_counter}"
            chunks.append({
                "chunk_id": chunk_id,
                "document": document_name,
                "page_number": page_num,
                "text": chunk_content,
                "word_count": len(chunk_content.split()),
                "timestamp": now_iso,
            })

    return chunks


def load_metadata_store() -> Dict[str, Any]:
    """Load the metadata registry of indexed documents."""
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"documents": {}}
    return {"documents": {}}


def save_metadata_store(data: Dict[str, Any]):
    """Persist the metadata registry to disk."""
    METADATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def register_document_metadata(doc_info: Dict[str, Any]):
    """Register or update document details in the central metadata store."""
    store = load_metadata_store()
    doc_name = doc_info["document_name"]
    store["documents"][doc_name] = doc_info
    save_metadata_store(store)


def remove_document_metadata(document_name: str):
    """Remove a document from the central metadata store."""
    store = load_metadata_store()
    if document_name in store.get("documents", {}):
        del store["documents"][document_name]
        save_metadata_store(store)
