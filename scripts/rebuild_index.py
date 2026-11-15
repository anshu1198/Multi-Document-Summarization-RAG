"""
scripts/rebuild_index.py
========================
Utility script to re-process all PDFs in data/raw/ and rebuild the
ChromaDB vector index from scratch.

Usage:
    python scripts/rebuild_index.py [--force]

Options:
    --force     Wipe existing ChromaDB collection before re-indexing.
                Without this flag, already-indexed documents are skipped
                (upsert behavior — safe to re-run).

WARNING: --force will DELETE all existing vectors. Use only if you want
         a full fresh index.
"""
import sys
import argparse
import logging
from pathlib import Path

# Ensure project root is in path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.config import RAW_DOCUMENTS_DIR, CHROMA_COLLECTION_NAME, VECTOR_DB_DIR
from backend.document_processor import (
    extract_pdf_pages,
    create_chunks_for_document,
    register_document_metadata,
)
from backend.vector_store import index_chunks
import chromadb

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("rebuild_index")


def main():
    parser = argparse.ArgumentParser(description="Rebuild ContextIQ vector index.")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Delete existing collection and re-index all documents.",
    )
    args = parser.parse_args()

    if args.force:
        logger.warning(
            "--force specified. Deleting existing ChromaDB collection '%s'.",
            CHROMA_COLLECTION_NAME,
        )
        try:
            client = chromadb.PersistentClient(path=str(VECTOR_DB_DIR))
            client.delete_collection(CHROMA_COLLECTION_NAME)
            logger.info("Collection deleted successfully.")
        except Exception as e:
            logger.warning("Could not delete collection (may not exist yet): %s", e)

    pdf_files = sorted(RAW_DOCUMENTS_DIR.glob("*.pdf"))
    if not pdf_files:
        logger.warning("No PDF files found in %s", RAW_DOCUMENTS_DIR)
        logger.info("Place your PDF documents into the data/raw/ folder and re-run.")
        return

    logger.info("Found %d PDF file(s) to process:", len(pdf_files))
    for f in pdf_files:
        logger.info("  - %s", f.name)

    success_count = 0
    fail_count = 0

    for pdf_path in pdf_files:
        logger.info("")
        logger.info("── Processing: %s ──", pdf_path.name)
        try:
            # Step 1: Extract pages with PyMuPDF
            pages, extraction_info = extract_pdf_pages(pdf_path)
            if not pages:
                logger.error(
                    "  [FAILED] No text extracted. Reason: %s",
                    extraction_info.get("error", "unknown"),
                )
                fail_count += 1
                continue

            page_count = extraction_info.get("page_count", len(pages))
            is_scanned = extraction_info.get("is_scanned", False)
            logger.info("  Extracted %d pages. Scanned=%s", page_count, is_scanned)

            # Step 2: Create overlapping chunks
            chunks = create_chunks_for_document(pages, pdf_path.name)
            logger.info("  Created %d semantic chunks.", len(chunks))

            if not chunks:
                logger.warning("  [SKIP] No chunks generated — document may be empty or unreadable.")
                fail_count += 1
                continue

            # Step 3: Register in metadata store
            import datetime as _dt
            file_size = pdf_path.stat().st_size
            register_document_metadata({
                "document_name": pdf_path.name,
                "page_count": page_count,
                "chunk_count": len(chunks),
                "file_size": file_size,
                "is_scanned": is_scanned,
                "upload_date": _dt.datetime.now().isoformat(),
            })

            # Step 4: Index into ChromaDB (upsert — safe to re-run)
            indexed_count = index_chunks(chunks)
            logger.info("  [OK] Indexed %d chunks into ChromaDB.", indexed_count)
            success_count += 1

        except Exception as exc:
            logger.exception("  [EXCEPTION] %s — %s", pdf_path.name, exc)
            fail_count += 1

    logger.info("")
    logger.info("══════════════════════════════════════════")
    logger.info(
        "Done.  Succeeded: %d  |  Failed: %d  |  Total: %d",
        success_count,
        fail_count,
        len(pdf_files),
    )
    logger.info("══════════════════════════════════════════")


if __name__ == "__main__":
    main()
