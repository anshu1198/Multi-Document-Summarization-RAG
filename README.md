# Multi-Document Summarization with Context Awareness using RAG

## Overview

Multi-Document Summarization with Context Awareness using Retrieval-Augmented Generation (RAG) is a Python-based project designed to retrieve relevant information from documents and generate context-aware, source-grounded answers using a Large Language Model (LLM).

The system combines PDF text extraction, text preprocessing, overlapping chunking, semantic embeddings, vector-based retrieval, cosine-similarity-based reranking, lexical context relationship analysis, and LLM-based answer generation.

The goal is to improve the relevance and traceability of generated answers by grounding them in retrieved document passages and their associated source information.

## Objectives

- Extract text from PDF documents while preserving page-level metadata.
- Clean and preprocess extracted text.
- Divide documents into overlapping chunks to preserve contextual continuity.
- Generate semantic embeddings using Sentence Transformers.
- Store and retrieve document chunks using ChromaDB.
- Rerank retrieved passages using cosine similarity.
- Analyze lexical relationships between retrieved passages.
- Generate context-aware answers grounded in retrieved document excerpts.
- Preserve source information, including document names and page numbers.
- Evaluate retrieval performance using information retrieval metrics.

## System Architecture

The project follows a modular RAG pipeline.

1. **Document extraction:** Extract text and page information from PDF files using PyMuPDF.
2. **Preprocessing:** Clean extracted text and prepare it for chunking.
3. **Chunking:** Divide document text into overlapping chunks while preserving metadata.
4. **Embedding generation:** Convert text chunks into numerical vectors using Sentence Transformers.
5. **Vector storage:** Store embeddings, text, and metadata in ChromaDB.
6. **Retrieval:** Retrieve candidate passages relevant to a user's question.
7. **Reranking:** Reorder retrieved passages using cosine similarity.
8. **Context awareness:** Analyze lexical overlap and relationships between retrieved passages.
9. **Answer generation:** Use Ollama with Llama 3.2 3B to generate answers grounded in retrieved context.
10. **Evaluation:** Assess retrieval performance and, where implemented, the quality and grounding of generated answers.

## Technology Stack

| Component | Technology |
|---|---|
| Programming language | Python |
| Embedding model | Sentence Transformers — `all-MiniLM-L6-v2` |
| Vector database | ChromaDB |
| Large Language Model | Llama 3.2 3B |
| LLM runtime | Ollama |
| PDF extraction | PyMuPDF |
| Numerical computing | NumPy |
| Version control | Git and GitHub |

## Project Structure

```text
Multi-Document-Summarization-RAG/
├── data/
│   ├── raw_documents/
│   ├── processed/
│   │   └── chunks/
│   └── vector_db/
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
│   ├── summarization_prompt.txt
│   └── contradiction_prompt.txt
├── notebooks/
│   └── experiments.ipynb
├── results/
├── metadata.csv
├── requirements.txt
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.10 or later, subject to compatibility with the installed dependencies.
- pip for Python package management.
- Git for version control.
- Ollama for local LLM inference.
- Sufficient RAM and storage for embedding generation, vector retrieval, and LLM inference.

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/anshu1198/Multi-Document-Summarization-RAG.git
cd Multi-Document-Summarization-RAG
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

If you are using Command Prompt instead of PowerShell:

```bat
.venv\Scripts\activate.bat
```

### 3. Install Python dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Install and configure Ollama

Install Ollama from the official website:

https://ollama.com/

After installing it, download the configured model:

```bash
ollama pull llama3.2:3b
```

Ensure the Ollama service is running before using the LLM-based summarization functionality.

## Preparing Documents

Place the PDF files you want to analyze inside:

```text
data/raw_documents/
```

The project is configured to process PDF documents. Scanned PDFs containing images rather than selectable text may require OCR before their contents can be retrieved effectively.

## Running the Pipeline

Run the following commands from the project root directory, in order.

### 1. Extract PDF text

```bash
python src/extract_text.py
```

Extracted text and page-level metadata are saved under `data/processed/`.

### 2. Preprocess extracted text

```bash
python src/preprocess.py
```

This step cleans the extracted text and prepares it for chunking.

### 3. Create overlapping chunks

```bash
python src/chunking.py
```

This step divides the cleaned text into smaller chunks while retaining source document and page information.

### 4. Generate embeddings

```bash
python src/embeddings.py
```

This step generates vector embeddings using the configured Sentence Transformers model.

### 5. Build the vector database

```bash
python src/vector_store.py
```

This step stores the document chunks, embeddings, and metadata in ChromaDB.

### 6. Test retrieval

```bash
python src/retrieval.py
```

Use this module to inspect retrieved passages and evaluate their relevance to a question.

### 7. Run the application

```bash
python src/app.py
```

The application provides an interactive retrieval interface for asking questions about the indexed documents.

### 8. Run LLM-based summarization

```bash
python src/summarizer.py
```

This module is intended to generate context-aware answers using the retrieved document passages and the configured Ollama model.

**Note:** The pipeline commands and their integration should be validated against the current implementation before treating the entire workflow as production-ready.

## Context Awareness

The context-awareness module analyzes lexical overlap between retrieved passages to identify relationships and group related chunks.

This can help organize related information from different parts of the documents.

The current lexical approach is a preliminary method. Shared vocabulary does not necessarily imply semantic similarity, and lexical overlap alone cannot reliably establish contradictions. More advanced semantic relationship and contradiction detection can be explored as future improvements.

## Evaluation

The project includes retrieval evaluation metrics designed to measure the relevance of retrieved passages.

Planned metrics include:

- **Precision@K:** Measures the proportion of retrieved passages that are relevant within the top K results.
- **Recall@K:** Measures the proportion of all known relevant passages that appear in the top K results.
- **Mean Reciprocal Rank (MRR):** Measures how highly the first relevant result appears in the ranking.
- **Hit Rate@K:** Measures whether at least one relevant passage appears among the top K results.

Additional qualitative evaluation can examine:

- Answer relevance to the user's question.
- Factual consistency with retrieved passages.
- Source attribution accuracy.
- Context integration across document passages.
- Handling of missing or inconsistent information.

Reliable evaluation requires test questions and corresponding ground-truth relevant chunk IDs. Generated answers should also be reviewed against the original documents.

## Current Progress

The project has implemented modules for:

- PDF text extraction.
- Text preprocessing.
- Overlapping text chunking with source metadata.
- Embedding generation using Sentence Transformers.
- Persistent vector storage using ChromaDB.
- Retrieval and cosine-similarity-based reranking.
- Preliminary lexical context relationship analysis.
- LLM-based answer generation integration using Ollama.
- Retrieval evaluation metrics.

The document-processing and vector-storage stages have been executed previously. However, the latest versions of the modules still require end-to-end validation to confirm that retrieval, context analysis, summarization, and evaluation work together correctly.

## Limitations

- The current context analysis is based primarily on lexical overlap.
- Answer quality depends on the relevance and completeness of retrieved passages.
- LLM inference can require substantial memory and computational resources.
- Scanned PDFs may require OCR.
- Retrieval and generation quality depend on suitable evaluation data and testing.
- The system may fail to answer questions when the relevant information is absent from the indexed documents.

## Future Enhancements

- Improve semantic context relationship detection.
- Add more reliable contradiction detection across document passages.
- Support additional document formats.
- Improve retrieval through hybrid search and advanced reranking.
- Add a user interface for document upload and question answering.
- Expand automated evaluation and answer-grounding checks.
- Optimize inference and memory usage for resource-constrained systems.

## Author

**Anshu Shah**

GitHub: https://github.com/anshu1198

## Project Status

**In development.**

The project is being developed incrementally, with end-to-end integration, retrieval validation, summarization testing, and evaluation remaining important validation steps.
