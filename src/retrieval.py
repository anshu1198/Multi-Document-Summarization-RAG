
"""
Retrieval Module
Project: Multi-Document Summarization with Context Awareness using RAG

Pipeline:
1. Load the sentence embedding model.
2. Retrieve candidate chunks from ChromaDB.
3. Rerank candidates using cosine similarity.
4. Analyze lexical relationships between selected chunks.
5. Return text, source metadata, and ranking scores.
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
from reranking import rerank_results
from context_awareness import analyze_context


MODEL_NAME = EMBEDDING_MODEL_NAME
COLLECTION_NAME = CHROMA_COLLECTION_NAME
VECTOR_DB_PATH = Path(VECTOR_DB_DIR)


def load_embedding_model(model_name=MODEL_NAME):
    """Load the embedding model used for document embeddings."""
    return SentenceTransformer(model_name)


def load_collection(
    db_path=VECTOR_DB_PATH,
    collection_name=COLLECTION_NAME,
):
    """Connect to the existing persistent ChromaDB collection."""
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
):
    """
    Retrieve candidate chunks, rerank them, and analyze context.

    Returns a list of chunk dictionaries with text, metadata,
    cosine similarity, distance, and lexical relationship details.
    """
    if not isinstance(question, str) or not question.strip():
        raise ValueError("Question cannot be empty.")

    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    if candidate_k < 1:
        raise ValueError("candidate_k must be at least 1.")

    total_chunks = collection.count()

    if total_chunks == 0:
        return []

    question_embedding = model.encode(
        [question.strip()],
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

    if not ids:
        return []

    reranking_input = {
        "ids": [ids],
        "documents": [documents],
        "metadatas": [metadatas],
        "embeddings": results.get("embeddings"),
    }

    ranked = rerank_results(
        query_embedding=question_embedding,
        results=reranking_input,
        top_k=min(top_k, len(ids)),
    )

    distance_by_id = {
        chunk_id: distances[index]
        for index, chunk_id in enumerate(ids)
        if index < len(distances)
    }

    for chunk in ranked:
        chunk["distance"] = distance_by_id.get(chunk["chunk_id"])

    context_analysis = analyze_context(
        ranked,
        similarity_threshold=CONTEXT_SIMILARITY_THRESHOLD,
    )

    relationships = context_analysis["relationships"]
    related_chunk_ids = set()

    for relationship in relationships:
        related_chunk_ids.add(relationship["chunk_id_1"])
        related_chunk_ids.add(relationship["chunk_id_2"])

    for chunk in ranked:
        chunk["context_relationships"] = [
            relationship
            for relationship in relationships
            if chunk["chunk_id"] in (
                relationship["chunk_id_1"],
                relationship["chunk_id_2"],
            )
        ]
        chunk["has_lexical_context_link"] = (
            chunk["chunk_id"] in related_chunk_ids
        )

    return ranked


def retrieve_with_context(
    question,
    model,
    collection,
    top_k=DEFAULT_TOP_K,
    candidate_k=DEFAULT_CANDIDATE_K,
):
    """Return retrieved chunks and their overall context analysis."""
    chunks = retrieve_chunks(
        question=question,
        model=model,
        collection=collection,
        top_k=top_k,
        candidate_k=candidate_k,
    )

    return {
        "question": question,
        "chunks": chunks,
        "context_analysis": analyze_context(
            chunks,
            similarity_threshold=CONTEXT_SIMILARITY_THRESHOLD,
        ),
    }


def main():
    """Run an interactive retrieval-only session."""
    print("=" * 60)
    print("RAG RETRIEVAL AND CONTEXT ANALYSIS")
    print("=" * 60)

    client, collection = load_collection()
    print(f"Vector database loaded: {collection.count()} chunks")

    print(f"Loading embedding model: {MODEL_NAME}")
    model = load_embedding_model()
    print("Ready. No LLM generation will run in this script.")

    while True:
        try:
            question = input(
                "\nEnter your question (or type 'exit' to quit): "
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
            )

            print(f"\nRetrieved chunks: {len(result['chunks'])}")

            for index, chunk in enumerate(result["chunks"], start=1):
                metadata = chunk.get("metadata") or {}

                print(f"\n--- Result {index} ---")
                print("Chunk ID:", chunk["chunk_id"])
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
                    round(chunk["similarity_score"], 4),
                )
                print("Text:")
                print(chunk["text"][:1000])

            analysis = result["context_analysis"]
            print(
                "\nContext relationships:",
                analysis["relationship_count"],
            )
            print("Context groups:", len(analysis["context_groups"]))

        except (KeyboardInterrupt, EOFError):
            print("\nRetrieval stopped.")
            break


if __name__ == "__main__":
    main()
