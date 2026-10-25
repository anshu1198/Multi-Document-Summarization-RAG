
"""
Evaluation Module
Project: Multi-Document Summarization with Context Awareness using RAG

Evaluates retrieval quality using:
- Precision@K
- Recall@K
- Mean Reciprocal Rank (MRR)
- Hit Rate@K

Requires relevance judgments (the IDs of chunks known to be relevant
to each query). These metrics do not independently judge summary quality.
"""

from typing import Iterable, Sequence


def _validate_ids(values, name):
    """Validate that chunk IDs are supplied as an iterable of IDs."""
    if isinstance(values, (str, bytes)) or values is None:
        raise TypeError(f"{name} must be an iterable of chunk IDs.")

    try:
        return list(values)
    except TypeError as exc:
        raise TypeError(
            f"{name} must be an iterable of chunk IDs."
        ) from exc


def precision_at_k(retrieved_ids, relevant_ids, k=5):
    """Fraction of the top-k retrieved chunks that are relevant."""
    if k <= 0:
        raise ValueError("k must be greater than zero.")

    retrieved = _validate_ids(retrieved_ids, "retrieved_ids")[:k]
    relevant = set(_validate_ids(relevant_ids, "relevant_ids"))

    if not retrieved:
        return 0.0

    return sum(item in relevant for item in retrieved) / len(retrieved)


def recall_at_k(retrieved_ids, relevant_ids, k=5):
    """Fraction of all known relevant chunks found in the top-k."""
    if k <= 0:
        raise ValueError("k must be greater than zero.")

    retrieved = _validate_ids(retrieved_ids, "retrieved_ids")[:k]
    relevant = set(_validate_ids(relevant_ids, "relevant_ids"))

    if not relevant:
        return 0.0

    return len(set(retrieved) & relevant) / len(relevant)


def reciprocal_rank(retrieved_ids, relevant_ids):
    """Reciprocal rank of the first relevant retrieved chunk."""
    retrieved = _validate_ids(retrieved_ids, "retrieved_ids")
    relevant = set(_validate_ids(relevant_ids, "relevant_ids"))

    for rank, chunk_id in enumerate(retrieved, start=1):
        if chunk_id in relevant:
            return 1.0 / rank

    return 0.0


def hit_rate_at_k(retrieved_ids, relevant_ids, k=5):
    """Return 1 if any relevant chunk appears in the top-k; else 0."""
    if k <= 0:
        raise ValueError("k must be greater than zero.")

    retrieved = _validate_ids(retrieved_ids, "retrieved_ids")[:k]
    relevant = set(_validate_ids(relevant_ids, "relevant_ids"))

    return float(any(item in relevant for item in retrieved))


def evaluate_retrieval(retrieved_ids, relevant_ids, k=5):
    """Calculate all supported retrieval metrics for one query."""
    return {
        f"precision@{k}": precision_at_k(
            retrieved_ids, relevant_ids, k
        ),
        f"recall@{k}": recall_at_k(
            retrieved_ids, relevant_ids, k
        ),
        "reciprocal_rank": reciprocal_rank(
            retrieved_ids, relevant_ids
        ),
        f"hit_rate@{k}": hit_rate_at_k(
            retrieved_ids, relevant_ids, k
        )
    }


def evaluate_multiple_queries(query_results, k=5):
    """
    Calculate per-query and mean retrieval metrics.

    Args:
        query_results: Iterable of dictionaries, each containing:
            {
                "retrieved_ids": [...],
                "relevant_ids": [...]
            }
        k: Number of top retrieved results to evaluate.

    Returns:
        Dictionary containing per-query results and mean metrics.
    """
    if k <= 0:
        raise ValueError("k must be greater than zero.")

    results = []

    for index, query_result in enumerate(query_results, start=1):
        if not isinstance(query_result, dict):
            raise TypeError(
                f"Query result {index} must be a dictionary."
            )

        if "retrieved_ids" not in query_result:
            raise ValueError(
                f"Query result {index} is missing 'retrieved_ids'."
            )

        if "relevant_ids" not in query_result:
            raise ValueError(
                f"Query result {index} is missing 'relevant_ids'."
            )

        metrics = evaluate_retrieval(
            query_result["retrieved_ids"],
            query_result["relevant_ids"],
            k=k
        )

        results.append({
            "query_number": index,
            **metrics
        })

    metric_names = [
        f"precision@{k}",
        f"recall@{k}",
        "reciprocal_rank",
        f"hit_rate@{k}"
    ]

    if not results:
        return {
            "query_count": 0,
            "k": k,
            "per_query": [],
            "mean_metrics": {name: 0.0 for name in metric_names}
        }

    mean_metrics = {
        name: sum(row[name] for row in results) / len(results)
        for name in metric_names
    }

    return {
        "query_count": len(results),
        "k": k,
        "per_query": results,
        "mean_metrics": mean_metrics
    }
