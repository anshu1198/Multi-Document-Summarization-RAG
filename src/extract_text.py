
"""
PDF Text Extraction Module
Project: Multi-Document Summarization with Context Awareness using RAG
"""

import json
from pathlib import Path

import pymupdf

from config import RAW_DOCUMENTS_DIR, PROCESSED_DIR


def extract_pdf_text(pdf_path):
    """Extract text from a PDF, preserving page numbers and source name."""
    pdf_path = Path(pdf_path)
    pages = []

    with pymupdf.open(str(pdf_path)) as pdf:
        for page_number, page in enumerate(pdf, start=1):
            pages.append({
                "document": pdf_path.name,
                "page_number": page_number,
                "text": page.get_text("text").strip(),
            })

    return pages


def extract_all_pdfs(
    pdf_folder=RAW_DOCUMENTS_DIR,
    output_folder=PROCESSED_DIR,
):
    """Extract text from every PDF in the input folder."""
    pdf_folder = Path(pdf_folder)
    output_folder = Path(output_folder)

    if not pdf_folder.exists():
        raise FileNotFoundError(
            f"PDF input folder does not exist: {pdf_folder}"
        )

    pdf_files = sorted(pdf_folder.glob("*.pdf"))

    if not pdf_files:
        print(f"No PDF files found in {pdf_folder}")
        return []

    output_folder.mkdir(parents=True, exist_ok=True)
    extracted_files = []

    for pdf_path in pdf_files:
        try:
            pages = extract_pdf_text(pdf_path)
            output_path = output_folder / f"{pdf_path.stem}.json"

            with output_path.open("w", encoding="utf-8") as file:
                json.dump(
                    pages,
                    file,
                    ensure_ascii=False,
                    indent=2,
                )

            extracted_files.append(output_path)

            empty_pages = sum(
                not page["text"].strip() for page in pages
            )

            print(f"\nExtracted: {pdf_path.name}")
            print(f"Total pages: {len(pages)}")
            print(f"Pages without extractable text: {empty_pages}")
            print(f"Saved to: {output_path}")

        except (OSError, ValueError, RuntimeError) as exc:
            print(f"\nFailed to extract {pdf_path.name}: {exc}")

    print(
        f"\nExtraction completed for "
        f"{len(extracted_files)} PDF(s)."
    )
    return extracted_files


if __name__ == "__main__":
    extract_all_pdfs()
