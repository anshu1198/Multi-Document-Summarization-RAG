
"""
Main Application Entry Point
Multi-Document Summarization with Context Awareness using RAG.
"""

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent

if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from retrieval import (
    load_embedding_model,
    load_collection,
    retrieve_with_context,
)


def main():
    """Run the interactive retrieval interface."""
    print("=" * 60)
    print("MULTI-DOCUMENT SUMMARIZATION WITH CONTEXT AWARENESS")
    print("Retrieval-Augmented Generation (RAG)")
    print("=" * 60)
    print("Retrieval mode only; no LLM generation will run here.")
    print("Type 'exit' to quit.\n")

    try:
        client, collection = load_collection()

        if collection.count() == 0:
            print("The vector database is empty.")
            print("Prepare the chunks, embeddings, and vector store first.")
            return

        print("Loading embedding model...")
        model = load_embedding_model()
        print("Ready!\n")

        while True:
            question = input("Enter your question: ").strip()

            if question.lower() in {"exit", "quit"}:
                print("Exiting application.")
                break

            if not question:
                print("Please enter a question.")
                continue

            result = retrieve_with_context(
                question=question,
                model=model,
                collection=collection,
                top_k=3,
                candidate_k=10,
            )

            print("\nRelevant context:\n")

            for index, chunk in enumerate(result["chunks"], start=1):
                metadata = chunk.get("metadata", {})
                print(f"Source {index}: {metadata.get('document', 'Unknown')}")
                print(f"Page: {metadata.get('page_number', 'Unknown')}")
                print(f"Relevance score: {chunk.get('similarity_score', 0):.4f}")
                print(chunk.get("text", ""))
                print("-" * 60)

            print("\nContext analysis:")
            print(result.get("context_analysis", {}))
            print()

    except (KeyboardInterrupt, EOFError):
        print("\nApplication stopped.")
    except Exception as error:
        print(f"\nApplication error: {error}")
        print("Check that retrieval.py and the vector database are configured.")


if __name__ == "__main__":
    main()
