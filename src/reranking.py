
"""
Reranking Module
Multi-Document Summarization with Context Awareness using RAG.

Ranks retrieved chunks by query-to-chunk cosine similarity.
Uses embeddings already returned by ChromaDB.
"""

import numpy as np


def cosine_similarity(vector_a, vector_b):
    """Calculate cosine similarity between two vectors."""
    vector_a = np.asarray(vector_a, dtype=np.float32).reshape(-1)
    vector_b = np.asarray(vector_b, dtype=np.float32).reshape(-1)

    if vector_a.shape != vector_b.shape:
        raise ValueError("Both vectors must have the same dimensions.")

    norm_a = np.linalg.norm(vector_a)
    norm_b = np.linalg.norm(vector_b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(np.dot(vector_a, vector_b) / (norm_a * norm_b))


def rerank_results(query_embedding, results, top_k=None):
    """Return retrieved chunks sorted by cosine similarity."""
    if not isinstance(results, dict):
        raise TypeError("results must be a ChromaDB result dictionary.")

    ids = results.get("ids")
    documents = results.get("documents")
    metadatas = results.get("metadatas")
    embeddings = results.get("embeddings")

    if not ids or not ids[0]:
        return []

    ids = ids[0]
    documents = documents[0] if documents and documents[0] else []
    metadatas = metadatas[0] if metadatas and metadatas[0] else []

    if embeddings is None or len(embeddings) == 0:
        raise ValueError(
            "ChromaDB results must include embeddings."
        )

    vectors = embeddings[0]

    if len(ids) != len(vectors):
        raise ValueError(
            "The number of result IDs does not match the number "
            "of returned embeddings."
        )

    if top_k is not None and top_k < 0:
        raise ValueError("top_k cannot be negative.")

    query_embedding = np.asarray(
        query_embedding, dtype=np.float32
    ).reshape(-1)

    ranked_chunks = []

    for index, chunk_id in enumerate(ids):
        vector = vectors[index]

        if vector is None:
            continue

        ranked_chunks.append({
            "chunk_id": chunk_id,
            "text": (
                documents[index]
                if index < len(documents)
                else ""
            ),
            "metadata": (
                metadatas[index]
                if index < len(metadatas) and metadatas[index]
                else {}
            ),
            "similarity_score": cosine_similarity(
                query_embedding, vector
            )
        })

    ranked_chunks.sort(
        key=lambda chunk: chunk["similarity_score"],
        reverse=True
    )

    return (
        ranked_chunks
        if top_k is None
        else ranked_chunks[:top_k]
    )
