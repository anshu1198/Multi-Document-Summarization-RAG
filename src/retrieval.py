"""
Retrieval Module
Multi-Document Summarization with Context Awareness using RAG.

Pipeline:
1. Load the sentence embedding model.
2. Retrieve candidate chunks from ChromaDB.
3. Rerank candidates using cosine similarity or Cross-Encoder.
4. Analyze lexical relationships between selected chunks.
5. Return ranked chunks and context analysis.
"""

from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

from config import (
    EMBEDDING_MODEL_NAME,
    CHROMA_COLLECTION_NAME,
    VECTOR_DB_DIR,
    DEFAULT_TOP_K,
    DEFAULT_CANDIDATE_K,
    CONTEXT_SIMILARITY_THRESHOLD,
)

from reranking import rerank_results, cross_encoder_rerank
from context_awareness import analyze_context


MODEL_NAME = EMBEDDING_MODEL_NAME
COLLECTION_NAME = CHROMA_COLLECTION_NAME
VECTOR_DB_PATH = Path(VECTOR_DB_DIR)


def load_embedding_model(model_name=MODEL_NAME):
    """Load the sentence embedding model."""
    return SentenceTransformer(model_name)


def load_collection(
    db_path=VECTOR_DB_PATH,
    collection_name=COLLECTION_NAME,
):
    """Connect to the persistent ChromaDB collection."""

    db_path = Path(db_path)

    if not db_path.exists():
        raise FileNotFoundError(
            f"Vector database directory not found: {db_path}. "
            "Build the vector store before retrieval."
        )

    client = chromadb.PersistentClient(path=str(db_path))

    try:
        collection = client.get_collection(name=collection_name)

    except Exception as exc:
        raise RuntimeError(
            f"Could not open collection '{collection_name}' "
            f"at '{db_path}'. Build the vector store first."
        ) from exc

    if collection.count() == 0:
        raise RuntimeError(
            "The ChromaDB collection contains no chunks."
        )

    return client, collection


def retrieve_chunks(
    question,
    model,
    collection,
    top_k=DEFAULT_TOP_K,
    candidate_k=DEFAULT_CANDIDATE_K,
    reranking_method="cross_encoder",
):
    """
    Retrieve and rerank relevant chunks.

    Supported methods:
    - cosine: Baseline cosine similarity reranking.
    - cross_encoder: Cross-Encoder relevance reranking.
    """

    if not isinstance(question, str) or not question.strip():
        raise ValueError("Question cannot be empty.")

    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    if candidate_k < 1:
        raise ValueError("candidate_k must be at least 1.")

    if reranking_method not in {"cosine", "cross_encoder"}:
        raise ValueError(
            "reranking_method must be 'cosine' or 'cross_encoder'."
        )

    total_chunks = collection.count()

    if total_chunks == 0:
        return []

    cleaned_question = question.strip()

    question_embedding = model.encode(
        [cleaned_question],
        convert_to_numpy=True,
    )[0]

    number_to_fetch = min(candidate_k, total_chunks)

    results = collection.query(
        query_embeddings=[question_embedding.tolist()],
        n_results=number_to_fetch,
        include=[
            "documents",
            "metadatas",
            "distances",
            "embeddings",
        ],
    )

    ids = (results.get("ids") or [[]])[0]
    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]
    embeddings = results.get("embeddings")

    if not ids:
        return []

    reranking_input = {
        "ids": [ids],
        "documents": [documents],
        "metadatas": [metadatas],
        "embeddings": embeddings,
    }

    # Step 1: Baseline cosine similarity ranking
    cosine_ranked = rerank_results(
        query_embedding=question_embedding,
        results=reranking_input,
        top_k=len(ids),
    )

    # Step 2: Select reranking approach
    if reranking_method == "cosine":

        ranked = cosine_ranked[:min(top_k, len(ids))]

    else:

        ranked = cross_encoder_rerank(
            query=cleaned_question,
            results=cosine_ranked,
            top_k=min(top_k, len(ids)),
        )

    # Attach ChromaDB distance scores
    distance_by_id = {
        chunk_id: distances[index]
        for index, chunk_id in enumerate(ids)
        if index < len(distances)
    }

    for chunk in ranked:
        chunk["distance"] = distance_by_id.get(
            chunk["chunk_id"]
        )

    return ranked


def retrieve_with_context(
    question,
    model,
    collection,
    top_k=DEFAULT_TOP_K,
    candidate_k=DEFAULT_CANDIDATE_K,
    reranking_method="cross_encoder",
):
    """
    Retrieve chunks and analyze relationships between them.
    """

    chunks = retrieve_chunks(
        question=question,
        model=model,
        collection=collection,
        top_k=top_k,
        candidate_k=candidate_k,
        reranking_method=reranking_method,
    )

    context_analysis = analyze_context(
        chunks,
        similarity_threshold=CONTEXT_SIMILARITY_THRESHOLD,
    )

    relationships = context_analysis["relationships"]
    relationships_by_id = {}

    for relationship in relationships:

        for chunk_id in (
            relationship["chunk_id_1"],
            relationship["chunk_id_2"],
        ):

            relationships_by_id.setdefault(
                chunk_id, []
            ).append(relationship)

    for chunk in chunks:

        chunk_id = str(chunk.get("chunk_id", ""))

        chunk["context_relationships"] = (
            relationships_by_id.get(chunk_id, [])
        )

        chunk["has_lexical_context_link"] = bool(
            chunk["context_relationships"]
        )

    return {
        "question": question,
        "chunks": chunks,
        "context_analysis": context_analysis,
        "reranking_method": reranking_method,
    }


def main():
    """Run an interactive retrieval-only session."""

    print("=" * 60)
    print("RAG RETRIEVAL AND CONTEXT ANALYSIS")
    print("=" * 60)

    _, collection = load_collection()

    print(
        f"Vector database loaded: {collection.count()} chunks"
    )

    print(f"Loading embedding model: {MODEL_NAME}")

    model = load_embedding_model()

    print("Embedding model loaded successfully.")

    print("\nAvailable reranking methods:")
    print("1. Cosine Similarity (Baseline)")
    print("2. Cross-Encoder (Improved Reranking)")

    while True:

        try:

            method_choice = input(
                "\nSelect reranking method (1 or 2): "
            ).strip()

            if method_choice == "1":
                reranking_method = "cosine"

            elif method_choice == "2":
                reranking_method = "cross_encoder"

            else:
                print("Invalid choice. Please enter 1 or 2.")
                continue

            question = input(
                "\nEnter your question "
                "(or type 'exit' to quit): "
            ).strip()

            if question.lower() in {"exit", "quit"}:

                print("Exiting.")
                break

            if not question:

                print("Please enter a question.")
                continue

            result = retrieve_with_context(
                question=question,
                model=model,
                collection=collection,
                reranking_method=reranking_method,
            )

            print(
                f"\nReranking method: "
                f"{result['reranking_method']}"
            )

            print(
                f"Retrieved chunks: {len(result['chunks'])}"
            )

            for index, chunk in enumerate(
                result["chunks"], start=1
            ):

                metadata = chunk.get("metadata") or {}

                print(f"\n--- Result {index} ---")

                print(
                    "Chunk ID:",
                    chunk.get("chunk_id", "Unknown"),
                )

                print(
                    "Document:",
                    metadata.get("document", "Unknown"),
                )

                print(
                    "Page:",
                    metadata.get("page_number", "Unknown"),
                )

                print(
                    "Cosine similarity:",
                    round(
                        chunk.get("similarity_score", 0.0),
                        4,
                    ),
                )

                if "cross_encoder_score" in chunk:

                    print(
                        "Cross-Encoder score:",
                        round(
                            chunk["cross_encoder_score"],
                            4,
                        ),
                    )

                print("Text:")

                print(chunk.get("text", "")[:1000])

            analysis = result["context_analysis"]

            print(
                "\nLexical relationships:",
                analysis["relationship_count"],
            )

            print(
                "Context groups:",
                len(analysis["context_groups"]),
            )

        except (KeyboardInterrupt, EOFError):

            print("\nRetrieval stopped.")
            break

        except Exception as exc:

            print(f"\nRetrieval error: {exc}")


if __name__ == "__main__":
    main()