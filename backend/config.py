"""
Central Configuration for:
ContextIQ — AI Document Intelligence
Multi-Document Summarization with Context Awareness using RAG
"""

import os
from pathlib import Path

# Base directories
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

DATA_DIR = PROJECT_ROOT / "data"
RAW_DOCUMENTS_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
CHUNKS_DIR = PROCESSED_DIR / "chunks"
VECTOR_DB_DIR = DATA_DIR / "vector_db"

RESULTS_DIR = PROJECT_ROOT / "results"
PROMPTS_DIR = PROJECT_ROOT / "prompts"

# Ensure all critical storage directories exist
for directory in [DATA_DIR, RAW_DOCUMENTS_DIR, PROCESSED_DIR, CHUNKS_DIR, VECTOR_DB_DIR, RESULTS_DIR, PROMPTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Persistence files
METADATA_FILE = DATA_DIR / "documents_metadata.json"
HISTORY_FILE = DATA_DIR / "history.json"

# Embedding model
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")

# Cross-Encoder reranking model
CROSS_ENCODER_MODEL_NAME = os.getenv("CROSS_ENCODER_MODEL_NAME", "cross-encoder/ms-marco-MiniLM-L6-v2")

# Local language model (Ollama)
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "llama3.2:3b")
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://127.0.0.1:11434")

# ChromaDB Collection
CHROMA_COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "document_chunks")

# Retrieval settings
DEFAULT_TOP_K = int(os.getenv("DEFAULT_TOP_K", "3"))
DEFAULT_CANDIDATE_K = int(os.getenv("DEFAULT_CANDIDATE_K", "10"))
CONTEXT_SIMILARITY_THRESHOLD = float(os.getenv("CONTEXT_SIMILARITY_THRESHOLD", "0.10"))
SCORE_THRESHOLD = float(os.getenv("SCORE_THRESHOLD", "0.05"))

# LLM Generation settings
LLM_CONTEXT_WINDOW = int(os.getenv("LLM_CONTEXT_WINDOW", "2048"))
LLM_MAX_NEW_TOKENS = int(os.getenv("LLM_MAX_NEW_TOKENS", "600"))
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.1"))
LLM_REQUEST_TIMEOUT = float(os.getenv("LLM_REQUEST_TIMEOUT", "45.0"))

# Supported document types
SUPPORTED_DOCUMENT_EXTENSIONS = {".pdf"}

# API Server Settings
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))
CORS_ORIGINS = ["*"]
