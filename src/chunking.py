
"""
Text Chunking Module
Project: Multi-Document Summarization with Context Awareness using RAG

Creates overlapping text chunks from cleaned document pages.
Preserves document names, page numbers, and unique chunk IDs.
"""

import json
from pathlib import Path

from config import PROCESSED_DIR, CHUNKS_DIR


def chunk_text(text, max_words=180, overlap_words=30):
    """Split text into overlapping word chunks."""
    if max_words <= 0:
        raise ValueError("max_words must be greater than 0.")

    if overlap_words < 0 or overlap_words >= max_words:
        raise ValueError(
            "overlap_words must be non-negative and less than max_words."
        )

    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = min(start + max_words, len(words))
        chunks.append(" ".join(words[start:end]))

        if end >= len(words):
            break

        start = end - overlap_words

    return chunks


def create_chunks(input_file, output_folder=CHUNKS_DIR):
    """Create chunks from one cleaned document JSON file."""
    input_file = Path(input_file)
    output_folder = Path(output_folder)

    if not input_file.exists():
        raise FileNotFoundError(
            f"Input file not found: {input_file}"
        )

    with input_file.open("r", encoding="utf-8") as file:
        pages = json.load(file)

    if not isinstance(pages, list):
        raise ValueError(
            f"Expected a list of page records in {input_file.name}."
        )

    all_chunks = []
    chunk_number = 0

    for page in pages:
        if not isinstance(page, dict):
            continue

        page_text = page.get("text", "").strip()

        if not page_text:
            continue

        for chunk in chunk_text(page_text):
            chunk_number += 1

            all_chunks.append({
                "document": page.get(
                    "document",
                    input_file.stem.removesuffix("_cleaned"),
                ),
                "page_number": page.get("page_number", 0),
                "chunk_id": (
                    f"{input_file.stem}_chunk_{chunk_number}"
                ),
                "text": chunk,
            })

    output_folder.mkdir(parents=True, exist_ok=True)
    output_file = output_folder / f"{input_file.stem}_chunks.json"

    with output_file.open("w", encoding="utf-8") as file:
        json.dump(
            all_chunks,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print(f"Document: {input_file.name}")
    print(f"Total chunks created: {len(all_chunks)}")
    print(f"Saved to: {output_file}")

    return output_file


def main():
    """Process all cleaned document JSON files."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    CHUNKS_DIR.mkdir(parents=True, exist_ok=True)

    cleaned_files = sorted(
        PROCESSED_DIR.glob("*_cleaned.json")
    )

    if not cleaned_files:
        print("No cleaned JSON files found.")
        print("Run extract_text.py and preprocess.py first.")
        return

    total_chunks = 0

    for json_file in cleaned_files:
        print(f"\nProcessing: {json_file.name}")
        output_file = create_chunks(json_file, CHUNKS_DIR)

        with output_file.open("r", encoding="utf-8") as file:
            total_chunks += len(json.load(file))

    print("\nChunking completed.")
    print(f"Documents processed: {len(cleaned_files)}")
    print(f"Total chunks created: {total_chunks}")


if __name__ == "__main__":
    main()
