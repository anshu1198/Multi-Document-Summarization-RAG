# ContextIQ - Start All Servers
# Run this from the project root directory:
#   powershell -ExecutionPolicy Bypass -File start_all.ps1

$Host.UI.RawUI.WindowTitle = "ContextIQ - Launching"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ContextIQ -- AI Document Intelligence" -ForegroundColor Cyan
Write-Host "  Multi-Document Summarization with Context Awareness RAG" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$VenvActivate = "C:\Users\chari\Downloads\Multi-Document-Summarization-RAG-main (1)\.venv\Scripts\Activate.ps1"
$FrontendDir = Join-Path $ProjectRoot "frontend"

# --- Check venv ---
if (-not (Test-Path $VenvActivate)) {
    Write-Host "[ERROR] Virtual environment not found at:" -ForegroundColor Red
    Write-Host "        $VenvActivate" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please ensure you have created a venv at the above path." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# --- Check Ollama ---
Write-Host "[CHECK] Verifying Ollama is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 3 -UseBasicParsing -ErrorAction Stop
    Write-Host "[OK]    Ollama is running." -ForegroundColor Green
} catch {
    Write-Host "[WARN]  Ollama does not appear to be running at http://127.0.0.1:11434" -ForegroundColor Yellow
    Write-Host "        Start Ollama and ensure 'llama3.2:3b' is pulled before uploading documents." -ForegroundColor Yellow
    Write-Host "        Command: ollama run llama3.2:3b" -ForegroundColor Gray
}

Write-Host ""

# --- Launch Backend in new window ---
Write-Host "[INFO]  Starting Backend (FastAPI) in a new terminal window..." -ForegroundColor Cyan
$BackendCmd = "& '$VenvActivate'; Set-Location '$ProjectRoot'; uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCmd -WindowStyle Normal

Start-Sleep -Seconds 3

# --- Launch Frontend dev server in new window ---
Write-Host "[INFO]  Starting Frontend (Vite) in a new terminal window..." -ForegroundColor Cyan
$FrontendCmd = "Set-Location '$FrontendDir'; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCmd -WindowStyle Normal

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Both servers launched!" -ForegroundColor Green
Write-Host ""
Write-Host "  Production UI  : http://localhost:8000" -ForegroundColor White
Write-Host "  Dev UI (hot-reload): http://localhost:5173" -ForegroundColor White
Write-Host "  API Docs       : http://localhost:8000/docs" -ForegroundColor White
Write-Host "  API Health     : http://localhost:8000/api/health" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: Use the Production UI (port 8000) for demos." -ForegroundColor Gray
Write-Host "     Use Dev UI (port 5173) for active frontend development." -ForegroundColor Gray
Write-Host ""
Read-Host "Press Enter to close this launcher"
