
"""
Embedding Generation Module
Multi-Document Summarization with Context Awareness using RAG.

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
        raise ValueError(
            "Cannot generate embeddings for an empty text list."
        )

    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=True,
        convert_to_numpy=True,
    )

    embeddings = np.asarray(embeddings, dtype=np.float32)

    if embeddings.ndim != 2:
        raise ValueError("Generated embeddings must be a 2D array.")

    if len(embeddings) != len(texts):
        raise ValueError(
            "Generated embedding count does not match text count."
        )

    if not np.isfinite(embeddings).all():
        raise ValueError("Generated embeddings contain invalid values.")

    return embeddings


def main():
    """Generate embeddings for cleaned document chunks."""
    chunk_files = sorted(
        CHUNKS_DIR.glob("*_cleaned_chunks.json")
    )

    if not chunk_files:
        raise FileNotFoundError(
            f"No cleaned chunk files found in {CHUNKS_DIR}. "
            "Run preprocessing and chunking first."
        )

    all_chunks = []

    for chunk_file in chunk_files:
        with chunk_file.open("r", encoding="utf-8") as file:
            chunks = json.load(file)

        if not isinstance(chunks, list):
            raise ValueError(
                f"Expected a list of chunks in {chunk_file.name}."
            )

        print(
            f"Loaded {len(chunks)} chunks from {chunk_file.name}"
        )
        all_chunks.extend(chunks)

    if not all_chunks:
        raise ValueError("No text chunks found.")

    seen_ids = set()

    for index, chunk in enumerate(all_chunks):
        if not isinstance(chunk, dict):
            raise ValueError(
                f"Chunk {index} is not a dictionary."
            )

        text = chunk.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(
                f"Chunk {index} has missing or empty text."
            )

        chunk_id = chunk.get("chunk_id")

        if not isinstance(chunk_id, str) or not chunk_id.strip():
            raise ValueError(
                f"Chunk {index} is missing a valid chunk_id."
            )

        if chunk_id in seen_ids:
            raise ValueError(
                f"Duplicate chunk ID found: {chunk_id}"
            )

        seen_ids.add(chunk_id)

    texts = [chunk["text"] for chunk in all_chunks]
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    combined_chunks_file = PROCESSED_DIR / "all_chunks.json"
    embeddings_file = PROCESSED_DIR / "embeddings.npy"

    print(f"\nTotal cleaned chunks: {len(texts)}")
    print(f"Loading embedding model: {EMBEDDING_MODEL_NAME}")

    model = load_embedding_model()

    print("Generating embeddings...")
    embeddings = generate_embeddings(
        texts,
        model,
        batch_size=4,
    )

    # Save the outputs only after generation and validation succeed.
    with combined_chunks_file.open("w", encoding="utf-8") as file:
        json.dump(
            all_chunks,
            file,
            ensure_ascii=False,
            indent=2,
        )

    np.save(embeddings_file, embeddings)

    print("\nEmbedding generation completed successfully!")
    print(f"Total chunks: {len(all_chunks)}")
    print(f"Embedding shape: {embeddings.shape}")
    print(f"Combined chunks: {combined_chunks_file}")
    print(f"Embeddings: {embeddings_file}")


if __name__ == "__main__":
    main()
