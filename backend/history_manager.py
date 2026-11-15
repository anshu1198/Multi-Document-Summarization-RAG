"""
History Management Module
ContextIQ — AI Document Intelligence

Persists and retrieves:
- Previous questions & answers
- Generated summaries
- Document comparisons
- Contradiction detection runs

Stored in data/history.json for genuine persistence across sessions.
"""

import datetime
import json
import uuid
from typing import Any, Dict, List, Optional
from backend.config import HISTORY_FILE


def load_history() -> List[Dict[str, Any]]:
    """Load persisted history items from JSON disk storage."""
    if not HISTORY_FILE.exists():
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception:
        return []


def save_history(items: List[Dict[str, Any]]):
    """Persist history items to JSON file."""
    HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)


def record_history_event(
    event_type: str,
    title: str,
    content: Any,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Record an interaction in history.
    event_type: 'question', 'summary', 'comparison', 'contradiction'
    """
    history = load_history()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    entry = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "title": title,
        "timestamp": now_iso,
        "content": content,
        "metadata": metadata or {},
    }

    # Prepend new item (most recent first)
    history.insert(0, entry)
    # Retain up to 200 items
    history = history[:200]
    save_history(history)
    return entry


def clear_all_history():
    """Clear all persisted history."""
    save_history([])


def delete_history_item(item_id: str) -> bool:
    """Delete a specific history item by ID."""
    history = load_history()
    filtered = [h for h in history if h.get("id") != item_id]
    if len(filtered) != len(history):
        save_history(filtered)
        return True
    return False
