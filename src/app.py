"""
Main Application Entry Point (Backward-Compatible Forwarder)
ContextIQ — AI Document Intelligence
Multi-Document Summarization with Context Awareness using RAG
"""

import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SRC_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

# Import FastAPI app from backend
from backend.app import app, run_cli_interactive

if __name__ == "__main__":
    import uvicorn
    from backend.config import API_HOST, API_PORT

    if len(sys.argv) > 1 and sys.argv[1] == "--cli":
        run_cli_interactive()
    else:
        print(f"Starting ContextIQ Server from src/app.py on http://{API_HOST}:{API_PORT} ...")
        uvicorn.run(app, host=API_HOST, port=API_PORT)
