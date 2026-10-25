
"""
Vector Store Module
Project: Multi-Document Summarization with Context Awareness using RAG

Stores document chunks and their precomputed embeddings in ChromaDB.
"""

import json
from pathlib import Path

import chromadb
import numpy as np

from config import (
    VECTOR_DB_DIR,
    CHROMA_COLLECTION_NAME,
    PROCESSED_DIR,
)


def create_vector_store(chunks, embeddings, database_path=None):
    """Validate and store chunks and embeddings in ChromaDB."""
    if not isinstance(chunks, list) or not chunks:
        raise ValueError("Chunks must be a non-empty list.")

    embeddings = np.asarray(embeddings, dtype=np.float32)

    if embeddings.ndim != 2:
        raise ValueError("Embeddings must be a 2D array.")

    if len(chunks) != len(embeddings):
        raise ValueError(
            f"Mismatch: {len(chunks)} chunks but "
            f"{len(embeddings)} embeddings."
        )

    if embeddings.shape[1] == 0:
        raise ValueError("Embedding vectors cannot be empty.")

    ids = []
    documents = []
    metadatas = []

    for index, chunk in enumerate(chunks):
        if not isinstance(chunk, dict):
            raise ValueError(f"Chunk {index} must be a dictionary.")

        text = chunk.get("text")
        if not isinstance(text, str) or not text.strip():
            raise ValueError(
                f"Chunk {index} must contain non-empty text."
            )

        try:
            page_number = int(chunk.get("page_number", 0))
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"Chunk {index} has an invalid page number."
            ) from exc

        ids.append(f"chunk_{index}")
        documents.append(text)
        metadatas.append({
            "document": str(chunk.get("document", "unknown_document")),
            "page_number": page_number,
            "chunk_id": str(chunk.get("chunk_id", f"chunk_{index}")),
        })

    path = Path(database_path or VECTOR_DB_DIR)
    path.mkdir(parents=True, exist_ok=True)

    client = chromadb.PersistentClient(path=str(path))

    collection = client.get_or_create_collection(
        name=CHROMA_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    # Remove previous records to avoid retaining outdated chunks.
    existing_ids = collection.get(include=[])["ids"]

    if existing_ids:
        collection.delete(ids=existing_ids)

    collection.upsert(
        ids=ids,
        documents=documents,
        embeddings=embeddings.tolist(),
        metadatas=metadatas,
    )

    return collection


def main():
    """Build the vector store from combined chunks and embeddings."""
    chunks_file = PROCESSED_DIR / "all_chunks.json"
    embeddings_file = PROCESSED_DIR / "embeddings.npy"

    if not chunks_file.exists():
        raise FileNotFoundError(
            f"Combined chunks file not found: {chunks_file}. "
            "Run chunking.py and embeddings.py first."
        )

    if not embeddings_file.exists():
        raise FileNotFoundError(
            f"Embeddings file not found: {embeddings_file}. "
            "Run embeddings.py first."
        )

    with chunks_file.open("r", encoding="utf-8") as file:
        chunks = json.load(file)

    embeddings = np.load(embeddings_file, allow_pickle=False)

    collection = create_vector_store(chunks, embeddings)

    print("\nVector store built successfully.")
    print("Combined chunks:", len(chunks))
    print("Embedding shape:", embeddings.shape)
    print("Database records:", collection.count())
    print("Database location:", VECTOR_DB_DIR)


if __name__ == "__main__":
    main()
