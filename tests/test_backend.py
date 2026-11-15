"""
Backend Test Suite
ContextIQ — AI Document Intelligence

Tests all major API endpoints using FastAPI TestClient:
- Health & Metrics
- Document retrieval & Q&A
- Multi-format Summarization
- Contradiction Detection
- History Logging & Persistence
"""

import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app import app

client = TestClient(app)


def test_health_endpoint():
    """Test /api/health returns 200 and valid JSON."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "target_model" in data
    assert data["target_model"] == "llama3.2:3b"


def test_metrics_endpoint():
    """Test /api/metrics returns live metrics."""
    response = client.get("/api/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "total_documents" in data
    assert "total_chunks" in data
    assert data["total_chunks"] >= 0


def test_list_documents():
    """Test /api/documents returns indexed documents."""
    response = client.get("/api/documents")
    assert response.status_code == 200
    data = response.json()
    assert "documents" in data
    assert isinstance(data["documents"], list)


def test_ask_question_grounded():
    """Test /api/qa/ask returns answer with citations and latency metrics."""
    payload = {
        "question": "What is the internship company mentioned in the report?",
        "top_k": 3,
        "temperature": 0.0,
    }
    response = client.post("/api/qa/ask", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "answer" in data
    assert "sources" in data
    assert len(data["sources"]) > 0
    assert "latency" in data
    assert data["latency"]["total_ms"] > 0


def test_streaming_qa():
    """Test /api/qa/ask/stream returns Server-Sent Events stream."""
    payload = {
        "question": "What is the report topic?",
        "top_k": 2,
        "temperature": 0.0,
    }
    response = client.post("/api/qa/ask/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers.get("content-type", "")
    assert "data:" in response.text


def test_summarization():
    """Test /api/summarize returns structured summary."""
    payload = {
        "summary_type": "brief",
        "temperature": 0.0,
    }
    response = client.post("/api/summarize", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert len(data["summary"]) > 20


def test_history_logging():
    """Test /api/history returns persisted log entries."""
    response = client.get("/api/history")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert isinstance(data["items"], list)
