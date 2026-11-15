"""
Pydantic API Schemas
ContextIQ — AI Document Intelligence

Defines structured data contracts for API validation.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# Health & Metrics
class LatencyMetrics(BaseModel):
    retrieval_ms: float = 0.0
    reranking_ms: float = 0.0
    generation_ms: float = 0.0
    total_ms: float = 0.0


class HealthResponse(BaseModel):
    status: str
    ollama_status: str
    target_model: str
    model_ready: bool
    chroma_status: str
    indexed_documents_count: int
    message: str


class MetricsResponse(BaseModel):
    total_documents: int
    total_pages: int
    total_chunks: int
    recent_queries_count: int
    collection_name: str
    status: str


# Document Management
class DocumentInfo(BaseModel):
    document_name: str
    page_count: int
    chunk_count: int
    upload_date: str
    file_size: int
    status: str
    is_scanned: bool = False


class DocumentListResponse(BaseModel):
    total_documents: int
    documents: List[DocumentInfo]


class DocumentUploadResponse(BaseModel):
    message: str
    document_name: str
    page_count: int
    chunk_count: int
    warning: Optional[str] = None
    status: str


# Question Answering
class AskQuestionRequest(BaseModel):
    question: str = Field(..., description="The user's question about the documents")
    document_filter: Optional[str] = Field(None, description="Optional document name to constrain retrieval")
    top_k: int = Field(4, ge=1, le=10, description="Number of passages to retrieve")
    temperature: float = Field(0.1, ge=0.0, le=1.0, description="Generation temperature")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        None, description="Previous conversation turns [{'role': 'user'|'assistant', 'content': '...'}]"
    )


class SourceCitation(BaseModel):
    document: str
    page_number: int
    chunk_id: str
    score: float
    text: str


class AskQuestionResponse(BaseModel):
    question: str
    answer: str
    sources: List[SourceCitation]
    context_analysis: Optional[Dict[str, Any]] = None
    latency: Optional[LatencyMetrics] = None
    status: str


# Summarization
class SummarizeRequest(BaseModel):
    document_name: Optional[str] = Field(None, description="Document name, or None for multi-document summary")
    summary_type: str = Field(
        "detailed",
        description="One of: 'brief', 'detailed', 'bullet_points', 'executive', 'key_findings', 'multi_document'",
    )
    temperature: float = Field(0.1, ge=0.0, le=1.0)


class SummarizeResponse(BaseModel):
    document_name: str
    summary_type: str
    summary: str
    sources: List[Dict[str, Any]]
    latency: Optional[LatencyMetrics] = None
    status: str


# Multi-Document Comparison
class CompareRequest(BaseModel):
    document_names: List[str] = Field(..., min_length=2, description="List of document names to compare")


class CompareResponse(BaseModel):
    status: str
    documents: List[str]
    report: Optional[str] = None
    message: Optional[str] = None
    sources: Optional[List[Dict[str, Any]]] = None


# Contradiction Detection
class ContradictionStatement(BaseModel):
    text: str
    document: str
    page_number: int
    value: Optional[str] = None


class ContradictionFinding(BaseModel):
    id: str
    title: str
    conflict_type: str  # 'date', 'numerical', 'semantic'
    severity: str  # 'clear_contradiction', 'possible_inconsistency'
    attribute: str
    statement_a: ContradictionStatement
    statement_b: ContradictionStatement
    explanation: str


class ContradictionRequest(BaseModel):
    document_names: Optional[List[str]] = Field(None, description="Optional subset of documents to evaluate")


class ContradictionResponse(BaseModel):
    status: str
    message: str
    documents_analyzed: List[str]
    findings_count: int
    findings: List[ContradictionFinding]


# History
class HistoryItem(BaseModel):
    id: str
    event_type: str
    title: str
    timestamp: str
    content: Any
    metadata: Dict[str, Any]


class HistoryResponse(BaseModel):
    total_items: int
    items: List[HistoryItem]
