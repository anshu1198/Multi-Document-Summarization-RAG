"""
RAG Summarization Module (Enhanced & Backward-Compatible)
ContextIQ — AI Document Intelligence
Multi-Document Summarization with Context Awareness using RAG
"""

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SRC_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from backend.config import (
    LLM_MODEL_NAME,
    LLM_CONTEXT_WINDOW,
    LLM_MAX_NEW_TOKENS,
    LLM_TEMPERATURE,
    DEFAULT_TOP_K,
    DEFAULT_CANDIDATE_K,
    PROMPTS_DIR,
)
from backend.model_manager import get_embedding_model
from backend.vector_store import get_or_create_collection, get_vector_client
from backend.retrieval import retrieve_with_context
from backend.summarizer import answer_question, generate_document_summary
from backend.contradiction_detector import run_contradiction_detection

LLM_MODEL = LLM_MODEL_NAME
SUMMARIZATION_PROMPT_PATH = PROMPTS_DIR / "summarization_prompt.txt"


def load_embedding_model():
    """Load cached embedding model."""
    return get_embedding_model()


def load_collection():
    """Connect to the persistent ChromaDB collection."""
    client = get_vector_client()
    collection = get_or_create_collection()
    return client, collection


def main():
    """Interactive entry point for terminal testing."""
    print("=" * 60)
    print("MULTI-DOCUMENT SUMMARIZATION WITH CONTEXT AWARENESS")
    print("=" * 60)

    try:
        embedding_model = load_embedding_model()
        client, collection = load_collection()
        print(f"Loaded {collection.count()} document chunks.")
        print(f"LLM model: {LLM_MODEL}")
        print("Type 'exit' to quit.\n")

        while True:
            q = input("Enter your question (or type exit to quit): ").strip()
            if q.lower() in ["exit", "quit"]:
                break
            if not q:
                continue

            result = answer_question(question=q)
            print("\nANSWER")
            print("-" * 60)
            print(result["answer"])

            print("\nSOURCES")
            print("-" * 60)
            for s in result.get("sources", []):
                print(f"- {s['document']}, page {s['page_number']}")

    except (KeyboardInterrupt, EOFError):
        print("\nExiting.")


if __name__ == "__main__":
    main()
