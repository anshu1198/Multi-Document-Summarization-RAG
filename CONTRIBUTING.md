# Contributing to ContextIQ

Thank you for your interest in contributing to **ContextIQ — Multi-Document Summarization with Context Awareness using RAG**!

---

## 🛠️ Local Development Setup

### 1. Prerequisites
- **Python 3.10+** (tested on Python 3.14)
- **Node.js 18+** & npm
- **Ollama** installed with `llama3.2:3b` pulled:
  ```bash
  ollama pull llama3.2:3b
  ```

### 2. Backend Setup
1. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # Linux/macOS:
   source .venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the development backend:
   ```bash
   uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```

### 3. Frontend Setup
1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```
2. Start the Vite dev server with hot reload:
   ```bash
   npm run dev
   ```
   The dev server will run on `http://localhost:5173` and automatically proxy `/api` requests to `http://localhost:8000`.

---

## 🧪 Running Tests & Quality Checks

Before submitting any changes, ensure all backend and frontend checks pass:

### Run Backend Tests
```bash
pytest tests/ -v
```

### Run Frontend Typecheck & Build
```bash
cd frontend
npm run build
```

---

## 📝 Pull Request Guidelines

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Commit Conventions**:
   Use clear, conventional commit messages:
   - `feat:` New features
   - `fix:` Bug fixes
   - `docs:` Documentation updates
   - `perf:` Performance improvements
   - `test:` Test additions or updates
3. **Keep Grounding Strict**:
   Ensure modifications to prompts or retrieval pipelines do not loosen grounding constraints or introduce hallucinations.
4. **Preserve Privacy & Data**:
   Never commit personal PDFs, vector database files, or local `.env` secrets. Ensure `.gitignore` rules are respected.
