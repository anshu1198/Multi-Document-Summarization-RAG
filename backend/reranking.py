"""
Reranking Module
ContextIQ — AI Document Intelligence

Provides:
1. Baseline Cosine Similarity reranking using stored vectors.
2. Cross-Encoder reranking using cached ms-marco-MiniLM-L6-v2 model.
"""

from typing import Any, Dict, List, Optional
import numpy as np

from backend.model_manager import get_cross_encoder_model


def cosine_similarity(vector_a: np.ndarray, vector_b: np.ndarray) -> float:
    """Calculate cosine similarity between two 1D vectors."""
    a = np.asarray(vector_a, dtype=np.float32).reshape(-1)
    b = np.asarray(vector_b, dtype=np.float32).reshape(-1)

    if a.shape != b.shape:
        return 0.0

    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)

    if norm_a == 0 or norm_b == 0:
        return 0.0

    return float(np.dot(a, b) / (norm_a * norm_b))


def rerank_by_cosine(
    query_embedding: np.ndarray,
    results: Dict[str, Any],
    top_k: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Rerank candidate chunks using cosine similarity between query and chunk vectors.
    """
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    embeddings = results.get("embeddings")

    if not ids:
        return []

    vectors = embeddings[0] if embeddings is not None and len(embeddings) > 0 else []

    ranked = []
    for idx, chunk_id in enumerate(ids):
        doc_text = documents[idx] if idx < len(documents) else ""
        meta = metadatas[idx] if idx < len(metadatas) and metadatas[idx] else {}

        score = 0.0
        if len(vectors) > idx and vectors[idx] is not None:
            score = cosine_similarity(query_embedding, vectors[idx])

        ranked.append({
            "chunk_id": str(chunk_id),
            "text": doc_text,
            "metadata": meta,
            "similarity_score": score,
        })

    ranked.sort(key=lambda c: c["similarity_score"], reverse=True)
    return ranked if top_k is None else ranked[:top_k]


def cross_encoder_rerank(
    query: str,
    chunks: List[Dict[str, Any]],
    top_k: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Rerank retrieved chunks using cached Cross-Encoder model.
    Laptop-optimized: uses cached singleton rather than reloading weights.
    """
    if not query or not chunks:
        return []

    model = get_cross_encoder_model()
    pairs = [(query, chunk["text"]) for chunk in chunks]

    scores = model.predict(pairs)

    reranked = []
    for chunk, score in zip(chunks, scores):
        updated = chunk.copy()
        # Convert logits or probability to a clean float
        score_val = float(score)
        updated["cross_encoder_score"] = score_val
        # Normalize into a 0.0 - 1.0 display confidence when appropriate
        updated["score"] = score_val
        reranked.append(updated)

    reranked.sort(key=lambda c: c.get("cross_encoder_score", 0.0), reverse=True)
    return reranked if top_k is None else reranked[:top_k]
