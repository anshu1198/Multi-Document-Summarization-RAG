
"""
RAG Summarization Module
Multi-Document Summarization with Context Awareness using RAG.

Pipeline:
1. Load the embedding model and vector database.
2. Retrieve and rerank relevant chunks.
3. Analyze lexical relationships between chunks.
4. Generate a grounded answer using Ollama.
5. Analyze potential contradictions using a dedicated prompt.
"""

import json
import ollama

from config import (
    LLM_MODEL_NAME,
    LLM_CONTEXT_WINDOW,
    LLM_MAX_NEW_TOKENS,
    LLM_TEMPERATURE,
    DEFAULT_TOP_K,
    DEFAULT_CANDIDATE_K,
    PROMPTS_DIR,
)

from retrieval import (
    load_embedding_model,
    load_collection,
    retrieve_with_context,
)


LLM_MODEL = LLM_MODEL_NAME

SUMMARIZATION_PROMPT_PATH = (
    PROMPTS_DIR / "summarization_prompt.txt"
)

CONTRADICTION_PROMPT_PATH = (
    PROMPTS_DIR / "contradiction_prompt.txt"
)


def load_prompt(prompt_path):
    """Load and validate a prompt file."""
    if not prompt_path.is_file():
        raise FileNotFoundError(
            f"Prompt file not found: {prompt_path}"
        )

    prompt = prompt_path.read_text(
        encoding="utf-8"
    ).strip()

    if not prompt:
        raise ValueError(
            f"Prompt file is empty: {prompt_path}"
        )

    return prompt


def load_summarization_prompt():
    """Load the summarization instructions."""
    return load_prompt(SUMMARIZATION_PROMPT_PATH)


def load_contradiction_prompt():
    """Load the contradiction analysis instructions."""
    return load_prompt(CONTRADICTION_PROMPT_PATH)


def build_context(retrieved_chunks):
    """Format retrieved chunks with their source metadata."""
    context_parts = []

    for index, chunk in enumerate(
        retrieved_chunks,
        start=1,
    ):
        metadata = chunk.get("metadata") or {}

        document = (
            metadata.get("document")
            or metadata.get("source")
            or metadata.get("filename")
            or "Unknown document"
        )

        page = metadata.get(
            "page_number",
            metadata.get("page", "Unknown"),
        )

        context_parts.append(
            f"[Chunk {index}]\n"
            f"Chunk ID: {chunk.get('chunk_id', 'Unknown')}\n"
            f"Source: {document}\n"
            f"Page: {page}\n"
            f"Text:\n{chunk.get('text', '')}"
        )

    return "\n\n---\n\n".join(context_parts)


def build_context_relationships(context_analysis):
    """Format lexical relationships and context groups for the LLM."""
    if not isinstance(context_analysis, dict):
        return "No context relationship analysis is available."

    relationship_data = {
        "relationship_method": "lexical_overlap",
        "relationships": context_analysis.get(
            "relationships", []
        ),
        "context_groups": context_analysis.get(
            "context_groups", []
        ),
        "interpretation_limit": (
            "Shared vocabulary does not prove semantic "
            "agreement, relevance, or contradiction."
        ),
    }

    return json.dumps(
        relationship_data,
        ensure_ascii=False,
        indent=2,
    )


def generate_answer(
    question,
    retrieved_chunks,
    context_analysis=None,
):
    """Generate a source-grounded answer using Ollama."""
    if not retrieved_chunks:
        return (
            "No relevant context was retrieved. "
            "Try rephrasing your question or checking "
            "the source documents."
        )

    system_prompt = load_summarization_prompt()

    context_text = build_context(
        retrieved_chunks
    )

    relationship_text = build_context_relationships(
        context_analysis or {}
    )

    user_prompt = (
        f"QUESTION:\n{question}\n\n"
        f"RETRIEVED DOCUMENT EXCERPTS:\n"
        f"{context_text}\n\n"
        f"CONTEXT RELATIONSHIP ANALYSIS:\n"
        f"{relationship_text}\n\n"
        "Answer the question using the supplied document "
        "evidence. Follow the summarization instructions "
        "and cite sources when available."
    )

    response = ollama.chat(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        options={
            "num_ctx": LLM_CONTEXT_WINDOW,
            "num_predict": LLM_MAX_NEW_TOKENS,
            "temperature": LLM_TEMPERATURE,
        },
    )

    return response["message"]["content"].strip()


def analyze_contradictions(retrieved_chunks):
    """
    Analyze retrieved passages for potential contradictions.

    The analysis is based only on the supplied passages.
    Its results require verification against the original
    documents.
    """
    if not retrieved_chunks:
        return (
            "No retrieved document context is available "
            "for contradiction analysis."
        )

    system_prompt = load_contradiction_prompt()
    context_text = build_context(retrieved_chunks)

    user_prompt = (
        "Analyze the following retrieved document passages "
        "for potential contradictions.\n\n"
        f"{context_text}\n\n"
        "Distinguish genuine conflicts from differences in "
        "wording, context, or time. Cite document names and "
        "page numbers when available. Do not invent evidence."
    )

    response = ollama.chat(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": user_prompt,
            },
        ],
        options={
            "num_ctx": LLM_CONTEXT_WINDOW,
            "num_predict": LLM_MAX_NEW_TOKENS,
            "temperature": LLM_TEMPERATURE,
        },
    )

    return response["message"]["content"].strip()


def answer_question(
    question,
    embedding_model,
    collection,
    top_k=DEFAULT_TOP_K,
):
    """
    Retrieve context, analyze relationships, generate an
    answer, and check the retrieved passages for contradictions.
    """
    pipeline_result = retrieve_with_context(
        question=question,
        model=embedding_model,
        collection=collection,
        top_k=top_k,
        candidate_k=max(
            top_k,
            DEFAULT_CANDIDATE_K,
        ),
    )

    chunks = pipeline_result.get("chunks", [])

    context_analysis = pipeline_result.get(
        "context_analysis", {}
    )

    answer = generate_answer(
        question=question,
        retrieved_chunks=chunks,
        context_analysis=context_analysis,
    )

    contradiction_analysis = analyze_contradictions(
        chunks
    )

    sources = []

    for chunk in chunks:
        metadata = chunk.get("metadata") or {}

        sources.append({
            "document": (
                metadata.get("document")
                or metadata.get("source")
                or metadata.get("filename")
                or "Unknown document"
            ),
            "page_number": metadata.get(
                "page_number",
                metadata.get("page", "Unknown"),
            ),
            "chunk_id": chunk.get("chunk_id"),
            "similarity_score": chunk.get(
                "similarity_score"
            ),
        })

    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "context_analysis": context_analysis,
        "contradiction_analysis": contradiction_analysis,
    }


def main():
    """Interactive entry point for the RAG application."""
    print("=" * 60)
    print("MULTI-DOCUMENT SUMMARIZATION WITH CONTEXT AWARENESS")
    print("=" * 60)

    try:
        # Validate both prompts before loading the models.
        load_summarization_prompt()
        load_contradiction_prompt()

        print("Loading vector database and embedding model...")

        _, collection = load_collection()

        if collection.count() == 0:
            print(
                "The vector database is empty. "
                "Prepare it first."
            )
            return

        embedding_model = load_embedding_model()

        print(
            f"Loaded {collection.count()} document chunks."
        )
        print(f"LLM model: {LLM_MODEL}")
        print("Type 'exit' to quit.\n")

        while True:
            try:
                question = input(
                    "Ask a question: "
                ).strip()

                if question.lower() in {
                    "exit",
                    "quit",
                }:
                    print("Exiting application.")
                    break

                if not question:
                    print("Please enter a question.\n")
                    continue

                print(
                    "\nRetrieving context, generating an answer, "
                    "and analyzing contradictions...\n"
                )

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

                print("\nCONTEXT ANALYSIS")
                print("-" * 60)
                print(
                    "Lexical relationships:",
                    analysis.get(
                        "relationship_count", 0
                    ),
                )
                print(
                    "Context groups:",
                    len(
                        analysis.get(
                            "context_groups", []
                        )
                    ),
                )

                print("\nCONTRADICTION ANALYSIS")
                print("-" * 60)
                print(
                    result["contradiction_analysis"]
                )
                print()

            except (KeyboardInterrupt, EOFError):
                print("\nApplication stopped.")
                break

            except Exception as exc:
                print(f"\nPipeline error: {exc}")
                print(
                    "Check the retrieved data, prompt files, "
                    "dependencies, and Ollama availability.\n"
                )

    except Exception as exc:
        print(
            f"\nUnable to initialize summarization: {exc}"
        )


if __name__ == "__main__":
    main()
