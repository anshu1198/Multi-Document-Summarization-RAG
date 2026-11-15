# ContextIQ System Architecture

This document provides a technical walkthrough of the **ContextIQ** multi-document retrieval-augmented generation (RAG) architecture, detailing data flow, neural models, vector storage, and algorithmic pipelines.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Client["Client Tier (Frontend)"]
        UI["React 18 + TypeScript SPA"]
        Vite["Vite Dev Server (:5173) / Static Assets"]
        SSE["SSE Stream Receiver (EventSource / Fetch)"]
    end

    subgraph API["Application Tier (FastAPI Backend :8000)"]
        Router["FastAPI Application Router"]
        DocProc["Document Ingestion Pipeline (PyMuPDF)"]
        Retriever["Two-Stage Hybrid Retrieval Engine"]
        ContextMgr["Context-Awareness & Graph Analyzer"]
        Summarizer["Hierarchical Summarization Engine"]
        Detector["Contradiction Detection Engine"]
        History["JSON Interaction Logger"]
    end

    subgraph Neural["Inference & Storage Tier (Local)"]
        ModelMgr["ModelManager (Cached Singletons)"]
        BiEncoder["SentenceTransformer (all-MiniLM-L6-v2)"]
        CrossEnc["Cross-Encoder (ms-marco-MiniLM-L6-v2)"]
        Chroma["ChromaDB (HNSW Cosine Vector Store)"]
        Ollama["Local Ollama Server (:11434)"]
        LLM["Meta Llama 3.2 (3B Parameters)"]
    end

    UI -->|REST & SSE Requests| Router
    Router --> DocProc
    Router --> Retriever
    Router --> Summarizer
    Router --> Detector
    Router --> History

    DocProc -->|Page Text & Chunks| BiEncoder
    BiEncoder -->|Dense Embeddings| Chroma
    Retriever -->|Dense Query Vector| Chroma
    Chroma -->|Candidate Chunks| Retriever
    Retriever -->|Top Candidates| CrossEnc
    CrossEnc -->|Reranked Passages| ContextMgr
    ContextMgr -->|Grounded Context & Citations| Ollama
    Ollama --> LLM
    LLM -->|Streamed Tokens / Answers| Router
    Router -->|SSE Events / JSON| SSE
```

---

## 2. Ingestion & Document Processing Pipeline

The ingestion pipeline handles heterogeneous PDF documents, extracting textual content, preserving structural provenance, and generating overlapping chunks suitable for semantic search.

1. **Extraction (`backend/document_processor.py`)**:
   - Uses **PyMuPDF (`pymupdf`)** for fast, high-fidelity native PDF extraction.
   - Normalizes non-printable characters, un-hyphenates broken words, and strips header/footer noise.
   - Detects empty, scanned (OCR-required), or corrupted pages to prevent blank vector indexing.
2. **Chunking**:
   - Uses a sliding window chunking algorithm: **180 words per chunk** with **30 words overlap**.
   - Preserves complete document metadata on each chunk:
     - `document`: Source filename
     - `page_number`: Origin page index
     - `chunk_id`: Deterministic unique identifier (`{doc_stem}_p{page}_c{chunk}`)
     - `word_count`: Exact length
     - `timestamp`: Ingestion time
3. **Deduplication**:
   - Computes SHA-256 hashes of incoming files to prevent duplicate indexing across uploads.

---

## 3. Two-Tier Retrieval & Neural Reranking

ContextIQ implements a **two-tier retrieval pipeline** optimized for CPU efficiency and high precision:

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant API as FastAPI Backend
    participant Bi as all-MiniLM-L6-v2
    participant DB as ChromaDB (Cosine)
    participant CE as ms-marco-MiniLM-L6-v2
    participant Ollama as Ollama (Llama 3.2:3b)

    User->>API: Query: "What was the internship duration?"
    API->>Bi: Encode query string to 384-d dense vector
    Bi-->>API: Dense vector (float32)
    API->>DB: Query top candidate chunks (k=10)
    DB-->>API: 10 Candidate passages + distance metrics
    Note over API,CE: Pre-filter top candidates (k=6) by cosine
    API->>CE: Score (Query, Passage) pairs with Cross-Encoder
    CE-->>API: Neural relevance logits
    Note over API: Sort by relevance logit -> Top 3 passages
    API->>Ollama: Grounded Prompt with Citations & Context
    Ollama-->>User: Streamed Answer with Page Numbers
```

- **Stage 1: Dense Retrieval (Bi-Encoder)**
  - Model: `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors).
  - Stored in **ChromaDB** using an HNSW index with cosine distance (`hnsw:space: cosine`).
  - Fetches top candidate chunks (default $K=10$).
- **Stage 2: Neural Reranking (Cross-Encoder)**
  - Model: `cross-encoder/ms-marco-MiniLM-L6-v2`.
  - Performs cross-attention across the query and candidate chunk simultaneously, capturing fine-grained token-level interactions that bi-encoders miss.
  - **Performance Optimization**: Prior to running the heavier Cross-Encoder model, candidates are pre-filtered to the top 6 using fast cosine ranking, reducing inference time by ~40% on CPU while retaining recall.

---

## 4. Context Awareness & Graph Analysis

ContextIQ does not treat retrieved chunks as isolated islands; it models relationships across chunks and past conversational turns.

1. **Lexical Relationship Graph (`backend/context_awareness.py`)**:
   - Extracts non-stopword tokens from retrieved passages.
   - Computes pairwise Jaccard similarities and identifies shared thematic keywords.
   - Builds an adjacency matrix and computes connected components to group related topics.
2. **Conversational Follow-Up Resolution**:
   - Analyzes conversational history turns to resolve pronouns ("it", "that", "the second one") and implicit follow-ups ("What about the dates?").
   - Synthesizes a contextualized search query without polluting the LLM's prompt window with irrelevant prior context.

---

## 5. Local LLM Integration & Streaming

- **Model**: Meta `llama3.2:3b` hosted via local **Ollama** (`http://127.0.0.1:11434`).
- **Connection Caching**: Health probes are cached with a 30-second TTL to eliminate redundant HTTP checks before inference.
- **Strict Grounding Guardrails**: Prompts enforce zero outside-world hallucination. If retrieved passages do not contain facts to answer the question, the system falls back gracefully.
- **Server-Sent Events (SSE) Streaming**: Tokens are streamed to the frontend via `POST /api/qa/ask/stream`, providing low time-to-first-token (TTFT) and real-time status feedback (`retrieval` $\to$ `reranking` $\to$ `generation` $\to$ `done`).
- **Latency Breakdown**: Every request tracks exact wall-clock latency for:
  - $\text{Retrieval Latency } (T_{\text{retr}})$
  - $\text{Reranking Latency } (T_{\text{rerank}})$
  - $\text{Generation Latency } (T_{\text{gen}})$
  - $\text{Total Latency } (T_{\text{total}})$

---

## 6. Multi-Format Summarization & Contradiction Detection

- **Hierarchical Summarization**: For documents exceeding the local LLM context budget, the engine samples evenly distributed chunks across introduction, technical sections, and conclusions to produce holistic summaries without truncation.
- **Contradiction Detection**:
  - Deterministic date extraction parses and normalizes formats (`DD/MM/YYYY`, `Month DD, YYYY`, `YYYY-MM-DD`).
  - Matches shared attributes across documents (e.g. `internship_end_date`) and flags conflicting values with page references.
  - Semantic contradiction checks use grounded reasoning for non-date factual discrepancies.
