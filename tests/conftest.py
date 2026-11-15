"""
conftest.py — pytest configuration for ContextIQ tests.
Ensures the project root is on sys.path so `import backend` works
regardless of where pytest is invoked from.
"""
import sys
from pathlib import Path

# Insert project root so both `backend` and `src` packages are importable.
PROJECT_ROOT = Path(__file__).parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
