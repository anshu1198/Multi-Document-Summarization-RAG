"""
Vector Store Management Module
ContextIQ — AI Document Intelligence

Manages ChromaDB collections, embeddings storage, document indexing,
document deletion, and collection statistics.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import chromadb

from backend.config import VECTOR_DB_DIR, CHROMA_COLLECTION_NAME
from backend.model_manager import get_embedding_model
from backend.document_processor import (
    load_metadata_store,
    remove_document_metadata,
    register_document_metadata,
)

_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[Any] = None


def get_vector_client(db_path: Path = VECTOR_DB_DIR) -> chromadb.PersistentClient:
    """Return persistent ChromaDB client instance."""
    global _client
    if _client is None:
        db_path = Path(db_path)
        db_path.mkdir(parents=True, exist_ok=True)
        _client = chromadb.PersistentClient(path=str(db_path))
    return _client


def get_or_create_collection(
    collection_name: str = CHROMA_COLLECTION_NAME,
) -> Any:
    """Return or create the primary ChromaDB collection with cosine metric."""
    global _collection
    client = get_vector_client()
    try:
        _collection = client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    except Exception:
        _collection = client.get_collection(name=collection_name)
    return _collection


def index_chunks(chunks: List[Dict[str, Any]], batch_size: int = 16) -> int:
    """
    Generate embeddings using cached SentenceTransformer and index chunks into ChromaDB.
    Returns the count of indexed chunks.
    """
    if not chunks:
        return 0

    collection = get_or_create_collection()
    model = get_embedding_model()

    ids = [chunk["chunk_id"] for chunk in chunks]
    texts = [chunk["text"] for chunk in chunks]
    metadatas = [
        {
            "document": str(chunk.get("document", "unknown")),
            "page_number": int(chunk.get("page_number", 1)),
            "chunk_id": str(chunk["chunk_id"]),
            "word_count": int(chunk.get("word_count", len(chunk["text"].split()))),
            "timestamp": str(chunk.get("timestamp", "")),
        }
        for chunk in chunks
    ]

    # Batch embedding generation
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i : i + batch_size]
        batch_vecs = model.encode(batch_texts, convert_to_numpy=True)
        all_embeddings.extend(batch_vecs.tolist())

    # Upsert into ChromaDB
    collection.upsert(
        ids=ids,
        documents=texts,
        embeddings=all_embeddings,
        metadatas=metadatas,
    )

    return len(ids)


def delete_document_from_store(document_name: str) -> int:
    """
    Remove all chunks associated with a document from ChromaDB and the metadata registry.
    Returns the number of removed chunks.
    """
    collection = get_or_create_collection()
    results = collection.get(
        where={"document": document_name},
        include=["metadatas"],
    )
    ids_to_delete = results.get("ids", [])
    if ids_to_delete:
        collection.delete(ids=ids_to_delete)

    # Remove from metadata file
    remove_document_metadata(document_name)
    return len(ids_to_delete)


def list_indexed_documents() -> List[Dict[str, Any]]:
    """Return metadata summary for all currently indexed documents."""
    collection = get_or_create_collection()
    store = load_metadata_store()
    registered_docs = store.get("documents", {})

    # Discover documents present in ChromaDB
    records = collection.get(include=["metadatas"])
    metadatas = records.get("metadatas", []) or []

    doc_stats = {}
    for meta in metadatas:
        if not meta:
            continue
        doc_name = meta.get("document", "unknown")
        page = meta.get("page_number", 1)
        if doc_name not in doc_stats:
            doc_stats[doc_name] = {
                "document_name": doc_name,
                "chunk_count": 0,
                "pages": set(),
                "timestamp": meta.get("timestamp", ""),
            }
        doc_stats[doc_name]["chunk_count"] += 1
        doc_stats[doc_name]["pages"].add(page)

    documents_list = []
    for doc_name, stats in doc_stats.items():
        reg_info = registered_docs.get(doc_name, {})
        page_count = len(stats["pages"]) if stats["pages"] else reg_info.get("page_count", 1)
        documents_list.append({
            "document_name": doc_name,
            "page_count": max(page_count, reg_info.get("page_count", 1)),
            "chunk_count": stats["chunk_count"],
            "upload_date": reg_info.get("upload_date", stats["timestamp"]),
            "file_size": reg_info.get("file_size", 0),
            "status": "ready",
            "is_scanned": reg_info.get("is_scanned", False),
        })

    return sorted(documents_list, key=lambda d: d["document_name"])


def get_database_metrics() -> Dict[str, Any]:
    """Return live metrics for the dashboard."""
    collection = get_or_create_collection()
    docs = list_indexed_documents()
    total_chunks = collection.count()
    total_pages = sum(d["page_count"] for d in docs)
    total_documents = len(docs)

    return {
        "total_documents": total_documents,
        "total_pages": total_pages,
        "total_chunks": total_chunks,
        "collection_name": CHROMA_COLLECTION_NAME,
        "status": "healthy",
    }
