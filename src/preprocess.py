
"""
Text Preprocessing Module
Project: Multi-Document Summarization with Context Awareness using RAG

Cleans extracted document text before chunking and embedding.
Preserves document names and page numbers.
"""

import json
import re

from config import PROCESSED_DIR


def clean_text(text):
    """Normalize whitespace and remove common extraction artifacts."""
    if not isinstance(text, str):
        raise TypeError("text must be a string.")

    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\u00a0", " ")

    text = "".join(
        char for char in text
        if char in "\n\t" or char.isprintable()
    )

    # Join words split across lines by PDF extraction.
    text = re.sub(r"(?<=\w)-\s*\n\s*(?=\w)", "", text)

    # Normalize spaces while preserving paragraph boundaries.
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]*\n+", "\n\n", text)

    return text.strip()


def preprocess_pages(pages):
    """Clean page records while preserving their metadata."""
    if not isinstance(pages, list):
        raise TypeError("pages must be a list of page dictionaries.")

    cleaned_pages = []

    for index, page in enumerate(pages, start=1):
        if not isinstance(page, dict):
            raise TypeError(
                f"Page record {index} must be a dictionary."
            )

        if "text" not in page:
            raise ValueError(
                f"Page record {index} is missing 'text'."
            )

        cleaned_page = dict(page)
        cleaned_page["text"] = clean_text(page["text"])
        cleaned_page.setdefault("page_number", index)

        cleaned_pages.append(cleaned_page)

    return cleaned_pages


def preprocess_json(input_path, output_path):
    """Clean one extracted JSON file and save the result."""
    from pathlib import Path

    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(
            f"Input file not found: {input_path}"
        )

    with input_path.open("r", encoding="utf-8") as file:
        pages = json.load(file)

    cleaned_pages = preprocess_pages(pages)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(
            cleaned_pages,
            file,
            ensure_ascii=False,
            indent=2,
        )

    return cleaned_pages


def main():
    """Preprocess all extracted document JSON files."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    json_files = sorted(
        file for file in PROCESSED_DIR.glob("*.json")
        if not file.name.endswith("_chunks.json")
        and file.name != "all_chunks.json"
    )

    if not json_files:
        print("No extracted document JSON files found.")
        return

    for input_file in json_files:
        # Save cleaned text separately to avoid overwriting extraction output.
        output_file = input_file.with_name(
            f"{input_file.stem}_cleaned.json"
        )

        try:
            cleaned_pages = preprocess_json(input_file, output_file)
            print(
                f"Processed {input_file.name}: "
                f"{len(cleaned_pages)} pages"
            )
            print(f"Saved to: {output_file}")
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            print(f"Could not process {input_file.name}: {exc}")


if __name__ == "__main__":
    main()
