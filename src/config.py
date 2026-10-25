
"""
Central configuration for:
Multi-Document Summarization with Context Awareness using RAG
"""

from pathlib import Path

# Project directories
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = PROJECT_ROOT / "data"
RAW_DOCUMENTS_DIR = DATA_DIR / "raw_documents"
PROCESSED_DIR = DATA_DIR / "processed"
CHUNKS_DIR = PROCESSED_DIR / "chunks"
VECTOR_DB_DIR = DATA_DIR / "vector_db"
RESULTS_DIR = PROJECT_ROOT / "results"
PROMPTS_DIR = PROJECT_ROOT / "prompts"

# Embedding model
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Local language model (run on your friend's laptop)
LLM_MODEL_NAME = "llama3.2:3b"

# ChromaDB
CHROMA_COLLECTION_NAME = "document_chunks"

# Retrieval and context settings
DEFAULT_TOP_K = 3
DEFAULT_CANDIDATE_K = 10
CONTEXT_SIMILARITY_THRESHOLD = 0.10

# Generation settings
LLM_CONTEXT_WINDOW = 2048
LLM_MAX_NEW_TOKENS = 350
LLM_TEMPERATURE = 0.2

# Supported document type
SUPPORTED_DOCUMENT_EXTENSIONS = {".pdf"}
