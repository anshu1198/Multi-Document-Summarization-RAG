"""
Model Manager Singleton
ContextIQ — AI Document Intelligence

Provides thread-safe, cached singleton instances of:
1. SentenceTransformer (all-MiniLM-L6-v2)
2. CrossEncoder (cross-encoder/ms-marco-MiniLM-L6-v2)

Prevents reloading large neural models repeatedly on laptop hardware.
"""

import os
import threading
from typing import Optional
from sentence_transformers import SentenceTransformer, CrossEncoder

from backend.config import EMBEDDING_MODEL_NAME, CROSS_ENCODER_MODEL_NAME

# Ensure Hugging Face hub handles offline cached access smoothly
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

_lock = threading.Lock()
_embedding_model: Optional[SentenceTransformer] = None
_cross_encoder_model: Optional[CrossEncoder] = None


def get_embedding_model(model_name: str = EMBEDDING_MODEL_NAME) -> SentenceTransformer:
    """Return cached SentenceTransformer model instance (lazy singleton)."""
    global _embedding_model
    if _embedding_model is None:
        with _lock:
            if _embedding_model is None:
                # Try loading with local cache first to avoid slow network checks
                try:
                    _embedding_model = SentenceTransformer(model_name, local_files_only=True)
                except Exception:
                    _embedding_model = SentenceTransformer(model_name)
    return _embedding_model


def get_cross_encoder_model(model_name: str = CROSS_ENCODER_MODEL_NAME) -> CrossEncoder:
    """Return cached CrossEncoder model instance (lazy singleton)."""
    global _cross_encoder_model
    if _cross_encoder_model is None:
        with _lock:
            if _cross_encoder_model is None:
                try:
                    _cross_encoder_model = CrossEncoder(model_name, local_files_only=True)
                except Exception:
                    _cross_encoder_model = CrossEncoder(model_name)
    return _cross_encoder_model
