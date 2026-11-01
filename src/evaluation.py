
"""
Evaluation Module
Project: Multi-Document Summarization with Context Awareness using RAG

Evaluates retrieval quality using:
- Precision@K
- Recall@K
- Mean Reciprocal Rank (MRR)
- Hit Rate@K

Requires manually verified relevance judgments.
These metrics do not independently measure summary quality.
"""

import json
from pathlib import Path
from typing import Iterable

from config import RESULTS_DIR
from retrieval import (
    load_embedding_model,
    load_collection,
    retrieve_with_context,
)


def _validate_ids(values, name):
    """Validate that chunk IDs are supplied as an iterable."""
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
    """Fraction of known relevant chunks found in the top-k."""
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
    """Return 1 if a relevant chunk appears in the top-k."""
    if k <= 0:
        raise ValueError("k must be greater than zero.")

    retrieved = _validate_ids(retrieved_ids, "retrieved_ids")[:k]
    relevant = set(_validate_ids(relevant_ids, "relevant_ids"))

    return float(any(item in relevant for item in retrieved))


def evaluate_retrieval(retrieved_ids, relevant_ids, k=5):
    """Calculate retrieval metrics for one query."""
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
        ),
    }


def evaluate_multiple_queries(query_results, k=5):
    """Calculate per-query and mean retrieval metrics."""
    if k <= 0:
        raise ValueError("k must be greater than zero.")

    results = []

    for index, item in enumerate(query_results, start=1):
        if not isinstance(item, dict):
            raise TypeError(f"Query result {index} must be a dictionary.")

        if "retrieved_ids" not in item or "relevant_ids" not in item:
            raise ValueError(
                f"Query result {index} must contain "
                "'retrieved_ids' and 'relevant_ids'."
            )

        metrics = evaluate_retrieval(
            item["retrieved_ids"],
            item["relevant_ids"],
            k=k,
        )

        results.append({"query_number": index, **metrics})

    metric_names = [
        f"precision@{k}",
        f"recall@{k}",
        "reciprocal_rank",
        f"hit_rate@{k}",
    ]

    means = {
        name: (
            sum(row[name] for row in results) / len(results)
            if results else 0.0
        )
        for name in metric_names
    }

    return {
        "query_count": len(results),
        "k": k,
        "per_query": results,
        "mean_metrics": means,
    }


def run_retrieval_evaluation(test_cases, k=3, candidate_k=10):
    """
    Evaluate the actual retrieval pipeline.

    Each test case must contain:
        question: str
        relevant_chunk_ids: list[str]

    Relevance labels must be manually verified.
    """
    client, collection = load_collection()
    model = load_embedding_model()
    query_results = []

    for case in test_cases:
        question = case["question"]
        relevant_ids = case["relevant_chunk_ids"]

        output = retrieve_with_context(
            question=question,
            model=model,
            collection=collection,
            top_k=k,
            candidate_k=candidate_k,
        )

        # retrieval.py returns chunk_id values from the reranker.
        retrieved_ids = [
            chunk["chunk_id"]
            for chunk in output.get("chunks", [])
        ]

        query_results.append({
            "question": question,
            "retrieved_ids": retrieved_ids,
            "relevant_ids": relevant_ids,
        })

    metrics = evaluate_multiple_queries(query_results, k=k)

    report = {
        **metrics,
        "results": [
            {
                "question": case["question"],
                "retrieved_ids": result["retrieved_ids"],
                "relevant_ids": result["relevant_ids"],
                **{
                    key: value
                    for key, value in result.items()
                    if key not in {"retrieved_ids", "relevant_ids"}
                },
            }
            for case, result in zip(test_cases, query_results)
        ],
    }

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = RESULTS_DIR / "retrieval_evaluation.json"
    output_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"Evaluation report saved to: {output_path}")
    print("Mean retrieval metrics:")
    print(json.dumps(metrics["mean_metrics"], indent=2))

    return report


if __name__ == "__main__":
    print("Retrieval evaluation module is ready.")
    print("Add verified test questions and relevant chunk IDs")
    print("before running the full evaluation.")
