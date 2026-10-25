# Multi-Document Summarization with Context Awareness using RAG

## Overview

This project aims to develop a Retrieval-Augmented Generation (RAG) system that retrieves relevant information from multiple documents and generates context-aware, source-grounded answers.

The system combines semantic retrieval, embedding-based document representation, context relationship analysis, and large language model (LLM) generation.

## Objectives

- Extract and preprocess text from PDF documents.
- Divide documents into overlapping text chunks while preserving source metadata.
- Generate vector embeddings for semantic retrieval.
- Store and retrieve document chunks using ChromaDB.
- Rerank retrieved passages using cosine similarity.
- Identify lexical relationships between retrieved passages.
- Generate answers grounded in retrieved document excerpts, with source attribution.

## Technology Stack

- **Language:** Python
- **Embeddings:** Sentence Transformers (`all-MiniLM-L6-v2`)
- **Vector Database:** ChromaDB
- **LLM Integration:** Ollama with Llama 3.2 3B
- **PDF Processing:** PyMuPDF
- **Numerical Computing:** NumPy

## Project Structure

```text
Multi-Document-Summarization-RAG/
├── src/
│   ├── app.py
│   ├── config.py
│   ├── extract_text.py
│   ├── preprocess.py
│   ├── chunking.py
│   ├── embeddings.py
│   ├── vector_store.py
│   ├── retrieval.py
│   ├── reranking.py
│   ├── context_awareness.py
│   ├── summarizer.py
│   └── evaluation.py
├── prompts/
├── notebooks/
├── metadata.csv
├── requirements.txt
├── .gitignore
└── README.md
```

## Current Progress

The following components have been implemented:

- PDF text extraction and preprocessing.
- Overlapping text chunking with source metadata.
- Embedding generation using Sentence Transformers.
- Persistent vector storage using ChromaDB.
- Retrieval and cosine-similarity-based reranking.
- Preliminary lexical context relationship analysis.
- Initial RAG summarization integration using Ollama.

The document-processing and vector-storage stages have been executed. End-to-end integration, retrieval validation, summarization testing, and evaluation are still in progress.

## Planned Evaluation

The system will be evaluated using retrieval metrics such as Precision@K, Recall@K, Mean Reciprocal Rank, and Hit Rate, alongside qualitative assessment of summary relevance, factual grounding, and source attribution.

## Setup

Create and activate a Python virtual environment, then install the dependencies:

```bash
pip install -r requirements.txt
```

Place PDF documents in `data/raw_documents/` and run the document-processing scripts in sequence:

```bash
python src/extract_text.py
python src/preprocess.py
python src/chunking.py
python src/embeddings.py
python src/vector_store.py
```

Then use the retrieval module to validate relevant passage retrieval:

```bash
python src/retrieval.py
```

LLM-based summarization requires Ollama and the configured model to be available. Run this stage on a machine with sufficient memory.

## Project Status

**In development.** Retrieval validation, end-to-end integration, and evaluation are ongoing.

## Author

Anshu Shah

## License

No license has been selected yet.
