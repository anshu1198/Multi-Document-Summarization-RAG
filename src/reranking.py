"""
Reranking Module
Multi-Document Summarization with Context Awareness using RAG.

Supports:
1. Baseline cosine similarity reranking.
2. Cross-Encoder reranking for improved relevance.
"""

import numpy as np
from sentence_transformers import CrossEncoder


# Cross-Encoder model configuration
CROSS_ENCODER_MODEL_NAME = "cross-encoder/ms-marco-MiniLM-L6-v2"


def cosine_similarity(vector_a, vector_b):
    """Calculate cosine similarity between two vectors."""

    vector_a = np.asarray(vector_a, dtype=np.float32).reshape(-1)
    vector_b = np.asarray(vector_b, dtype=np.float32).reshape(-1)

    if vector_a.shape != vector_b.shape:
        raise ValueError(
            "Query and chunk embeddings must have the same dimensions."
        )

    norm_a = np.linalg.norm(vector_a)
    norm_b = np.linalg.norm(vector_b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(np.dot(vector_a, vector_b) / (norm_a * norm_b))


def rerank_results(query_embedding, results, top_k=None):
    """
    Baseline reranking using cosine similarity.

    Uses embeddings returned by ChromaDB.
    """

    if not isinstance(results, dict):
        raise TypeError("results must be a ChromaDB result dictionary.")

    if top_k is not None and top_k < 0:
        raise ValueError("top_k cannot be negative.")

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
        raise ValueError("ChromaDB results must include embeddings.")

    vectors = embeddings[0]

    if len(ids) != len(vectors):
        raise ValueError(
            "The number of result IDs does not match the number "
            "of returned embeddings."
        )

    query_embedding = np.asarray(
        query_embedding, dtype=np.float32
    ).reshape(-1)

    ranked_chunks = []

    for index, chunk_id in enumerate(ids):

        vector = vectors[index]

        if vector is None:
            continue

        score = cosine_similarity(query_embedding, vector)

        metadata = (
            metadatas[index]
            if index < len(metadatas) and metadatas[index]
            else {}
        )

        ranked_chunks.append({
            "chunk_id": str(chunk_id),
            "text": (
                documents[index]
                if index < len(documents) and documents[index]
                else ""
            ),
            "metadata": metadata,
            "similarity_score": score,
        })

    ranked_chunks.sort(
        key=lambda chunk: chunk["similarity_score"],
        reverse=True,
    )

    return (
        ranked_chunks
        if top_k is None
        else ranked_chunks[:top_k]
    )


def cross_encoder_rerank(query, results, top_k=None):
    """
    Rerank retrieved chunks using Cross-Encoder relevance scores.

    Args:
        query: User's natural language query.
        results: List of chunks retrieved using cosine similarity.
        top_k: Number of top results to return.

    Returns:
        Chunks ranked by Cross-Encoder relevance score.
    """

    if not isinstance(query, str):
        raise TypeError("query must be a string.")

    if not isinstance(results, list):
        raise TypeError("results must be a list of retrieved chunks.")

    if top_k is not None and top_k < 0:
        raise ValueError("top_k cannot be negative.")

    if not results:
        return []

    # Load Cross-Encoder model
    model = CrossEncoder(CROSS_ENCODER_MODEL_NAME)

    # Prepare query-document pairs
    pairs = [
        (query, chunk["text"])
        for chunk in results
    ]

    # Predict relevance scores
    scores = model.predict(pairs)

    reranked_chunks = []

    # Attach Cross-Encoder scores to chunks
    for chunk, score in zip(results, scores):

        reranked_chunk = chunk.copy()

        reranked_chunk["cross_encoder_score"] = float(score)

        reranked_chunks.append(reranked_chunk)

    # Sort chunks by Cross-Encoder score
    reranked_chunks.sort(
        key=lambda chunk: chunk["cross_encoder_score"],
        reverse=True,
    )

    # Return top-k results
    return (
        reranked_chunks
        if top_k is None
        else reranked_chunks[:top_k]
    )