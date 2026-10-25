
"""
RAG Summarization Module
Project: Multi-Document Summarization with Context Awareness using RAG

Pipeline:
1. Load the embedding model and ChromaDB collection.
2. Retrieve and rerank relevant document chunks.
3. Analyze lexical relationships between chunks.
4. Generate a grounded answer using Ollama.
"""

import ollama

from config import (
    LLM_MODEL_NAME,
    LLM_CONTEXT_WINDOW,
    LLM_MAX_NEW_TOKENS,
    LLM_TEMPERATURE,
    DEFAULT_TOP_K,
    DEFAULT_CANDIDATE_K,
)
from retrieval import (
    load_embedding_model,
    load_collection,
    retrieve_with_context,
)


LLM_MODEL = LLM_MODEL_NAME


def build_context(retrieved_chunks):
    """Format retrieved chunks with their source metadata."""
    context_parts = []

    for chunk in retrieved_chunks:
        metadata = chunk.get("metadata") or {}

        document = (
            metadata.get("document")
            or metadata.get("source")
            or metadata.get("filename")
            or "Unknown document"
        )
        page = metadata.get("page_number", metadata.get("page", "Unknown"))

        context_parts.append(
            f"Source: {document}\n"
            f"Page: {page}\n"
            f"Text:\n{chunk.get('text', '')}"
        )

    return "\n\n---\n\n".join(context_parts)


def generate_answer(question, retrieved_chunks):
    """Generate a grounded answer from retrieved document context."""
    if not retrieved_chunks:
        return (
            "No relevant context was retrieved. "
            "Try rephrasing your question or checking the source documents."
        )

    context_text = build_context(retrieved_chunks)

    system_prompt = """
You are a careful research assistant using retrieval-augmented generation.

Rules:
1. Answer using only the supplied document excerpts.
2. Do not invent facts or fill gaps with outside knowledge.
3. If the excerpts do not support an answer, say so clearly.
4. Cite the source document and page number when available.
5. Explain relationships between excerpts only when supported by evidence.
6. If sources appear inconsistent, describe the differences and cite both.
   Do not claim a contradiction is proven without sufficient evidence.
7. Keep the answer clear, organized, and appropriately concise.
""".strip()

    user_prompt = (
        f"QUESTION:\n{question}\n\n"
        f"RETRIEVED DOCUMENT EXCERPTS:\n{context_text}\n\n"
        "Answer using these excerpts and cite the sources."
    )

    response = ollama.chat(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        options={
            "num_ctx": LLM_CONTEXT_WINDOW,
            "num_predict": LLM_MAX_NEW_TOKENS,
            "temperature": LLM_TEMPERATURE,
        },
    )

    return response["message"]["content"]


def answer_question(
    question,
    embedding_model,
    collection,
    top_k=DEFAULT_TOP_K,
):
    """Retrieve context, analyze relationships, and generate an answer."""
    pipeline_result = retrieve_with_context(
        question=question,
        model=embedding_model,
        collection=collection,
        top_k=top_k,
        candidate_k=max(top_k, DEFAULT_CANDIDATE_K),
    )

    chunks = pipeline_result["chunks"]
    answer = generate_answer(question, chunks)

    sources = []

    for chunk in chunks:
        metadata = chunk.get("metadata") or {}

        sources.append({
            "document": (
                metadata.get("document")
                or metadata.get("source")
                or "Unknown document"
            ),
            "page_number": (
                metadata.get("page_number")
                or metadata.get("page")
                or "Unknown"
            ),
            "chunk_id": chunk.get("chunk_id"),
            "similarity_score": chunk.get("similarity_score"),
        })

    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "context_analysis": pipeline_result["context_analysis"],
    }


def main():
    """Interactive entry point for the RAG question-answering pipeline."""
    print("=" * 60)
    print("MULTI-DOCUMENT SUMMARIZATION WITH CONTEXT AWARENESS")
    print("=" * 60)
    print("Loading vector database and embedding model...")

    _, collection = load_collection()
    embedding_model = load_embedding_model()

    print(f"Loaded {collection.count()} document chunks.")
    print(f"LLM model: {LLM_MODEL}")
    print("Type 'exit' to quit.\n")

    while True:
        try:
            question = input("Ask a question: ").strip()

            if question.lower() in {"exit", "quit"}:
                print("Goodbye!")
                break

            if not question:
                print("Please enter a question.\n")
                continue

            print("\nRetrieving context and generating answer...\n")

            result = answer_question(
                question=question,
                embedding_model=embedding_model,
                collection=collection,
            )

            print("ANSWER")
            print("-" * 60)
            print(result["answer"])

            print("\nSOURCES")
            print("-" * 60)

            for source in result["sources"]:
                print(
                    f"- {source['document']}, "
                    f"page {source['page_number']}"
                )

            analysis = result["context_analysis"]
            print(
                "\nLexical relationships:",
                analysis["relationship_count"],
            )
            print("Context groups:", len(analysis["context_groups"]))
            print()

        except (KeyboardInterrupt, EOFError):
            print("\nApplication stopped.")
            break
        except Exception as exc:
            print(f"\nPipeline error: {exc}")
            print(
                "Check the vector database, dependencies, and Ollama "
                "model availability before retrying.\n"
            )


if __name__ == "__main__":
    main()
