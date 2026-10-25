
"""
Embedding Generation Module
Project: Multi-Document Summarization with Context Awareness using RAG

Generates embeddings for cleaned chunks from multiple documents.
Saves combined chunks and embeddings in exactly the same order.
"""

import json
import numpy as np

from sentence_transformers import SentenceTransformer

from config import (
    CHUNKS_DIR,
    PROCESSED_DIR,
    EMBEDDING_MODEL_NAME,
)


def load_embedding_model():
    """Load the pretrained embedding model."""
    return SentenceTransformer(EMBEDDING_MODEL_NAME)


def generate_embeddings(texts, model, batch_size=4):
    """Generate embeddings in small batches."""
    if not texts:
        raise ValueError("Cannot generate embeddings for an empty text list.")

    return model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
    )


def main():
    """Generate embeddings for chunks created from cleaned documents."""

    # Select only chunks generated from *_cleaned.json files.
    chunk_files = sorted(
        CHUNKS_DIR.glob("*_cleaned_chunks.json")
    )

    if not chunk_files:
        raise FileNotFoundError(
            f"No cleaned chunk files found in {CHUNKS_DIR}. "
            "Run preprocess.py and chunking.py first."
        )

    all_chunks = []

    for chunk_file in chunk_files:
        with chunk_file.open("r", encoding="utf-8") as file:
            chunks = json.load(file)

        if not isinstance(chunks, list):
            raise ValueError(
                f"Expected a list of chunks in {chunk_file.name}."
            )

        print(f"Loaded {len(chunks)} chunks from {chunk_file.name}")
        all_chunks.extend(chunks)

    if not all_chunks:
        raise ValueError("No text chunks found.")

    for index, chunk in enumerate(all_chunks):
        if not isinstance(chunk, dict):
            raise ValueError(f"Chunk {index} is not a dictionary.")

        if not isinstance(chunk.get("text"), str) or not chunk["text"].strip():
            raise ValueError(
                f"Chunk {index} has missing or empty text."
            )

    # Prevent duplicate chunk IDs across documents.
    chunk_ids = [chunk.get("chunk_id") for chunk in all_chunks]
    if len(chunk_ids) != len(set(chunk_ids)):
        raise ValueError(
            "Duplicate chunk IDs found. Regenerate chunks before embedding."
        )

    texts = [chunk["text"] for chunk in all_chunks]
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    # Save combined chunks in the same order as their embeddings.
    combined_chunks_file = PROCESSED_DIR / "all_chunks.json"

    with combined_chunks_file.open("w", encoding="utf-8") as file:
        json.dump(
            all_chunks,
            file,
            ensure_ascii=False,
            indent=2,
        )

    print(f"\nTotal cleaned chunks: {len(texts)}")
    print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")

    model = load_embedding_model()

    print("Generating embeddings...")
    embeddings = generate_embeddings(
        texts,
        model,
        batch_size=4,
    )

    if embeddings.ndim != 2 or len(embeddings) != len(all_chunks):
        raise ValueError(
            "Generated embeddings do not match the chunk count."
        )

    output_file = PROCESSED_DIR / "embeddings.npy"
    np.save(output_file, embeddings)

    print("\nEmbedding generation completed successfully!")
    print(f"Total chunks: {len(texts)}")
    print(f"Embedding shape: {embeddings.shape}")
    print(f"Combined chunks: {combined_chunks_file}")
    print(f"Embeddings: {output_file}")


if __name__ == "__main__":
    main()
