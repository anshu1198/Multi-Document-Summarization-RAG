"""
Context Awareness Module
ContextIQ — AI Document Intelligence

Handles:
1. Lexical relationship & graph connected-component analysis between chunks
2. Conversational context tracking & follow-up query contextualization
"""

import re
from collections import Counter, defaultdict, deque
from itertools import combinations
from typing import Any, Dict, List, Optional, Set

STOP_WORDS: Set[str] = {
    "a", "an", "the", "and", "or", "but", "if", "then",
    "is", "am", "are", "was", "were", "be", "been", "being",
    "of", "to", "in", "on", "at", "by", "for", "from", "with",
    "as", "it", "its", "this", "that", "these", "those",
    "we", "they", "them", "their", "he", "she", "you", "your",
    "i", "me", "my", "our", "us", "not", "no", "do", "does",
    "did", "have", "has", "had", "can", "could", "will", "would",
    "should", "may", "might", "into", "about", "than", "also",
    "such", "which", "who", "what", "when", "where", "how",
    "all", "any", "each", "other", "more", "most", "some",
    "many", "much", "very", "there", "here", "only", "own",
    "per", "using", "used", "use", "based", "within",
}


def normalize_text(text: str) -> List[str]:
    """Convert text into normalized word tokens without stopwords."""
    if not isinstance(text, str):
        return []

    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)

    return [
        token for token in text.split()
        if token not in STOP_WORDS and len(token) > 1
    ]


def calculate_jaccard_similarity(text1: str, text2: str) -> float:
    """Calculate Jaccard similarity between two texts based on normalized terms."""
    words1 = set(normalize_text(text1))
    words2 = set(normalize_text(text2))

    if not words1 or not words2:
        return 0.0

    return len(words1 & words2) / len(words1 | words2)


def identify_shared_terms(text1: str, text2: str, limit: int = 10) -> List[str]:
    """Return the most frequent terms shared between two texts."""
    words1 = Counter(normalize_text(text1))
    words2 = Counter(normalize_text(text2))
    shared = words1.keys() & words2.keys()

    return sorted(
        shared,
        key=lambda word: (words1[word] + words2[word], min(words1[word], words2[word]), word),
        reverse=True,
    )[:limit]


def analyze_context(chunks: List[Dict[str, Any]], similarity_threshold: float = 0.10) -> Dict[str, Any]:
    """
    Analyze lexical relationships and build connected components (context groups)
    across retrieved chunks.
    """
    records = []
    for index, chunk in enumerate(chunks):
        text = chunk.get("text", "")
        meta = chunk.get("metadata", {})
        chunk_id = chunk.get("chunk_id") or meta.get("chunk_id") or str(index)
        doc = chunk.get("document") or meta.get("document", "Unknown")
        page = chunk.get("page_number") or meta.get("page_number", "Unknown")

        records.append({
            "chunk_id": str(chunk_id),
            "document": doc,
            "page_number": page,
            "text": text,
            "terms": set(normalize_text(text)),
        })

    relationships = []
    adjacency = defaultdict(set)

    for i, j in combinations(range(len(records)), 2):
        left = records[i]
        right = records[j]

        union = left["terms"] | right["terms"]
        intersection = left["terms"] & right["terms"]

        similarity = len(intersection) / len(union) if union else 0.0

        if similarity >= similarity_threshold and similarity > 0:
            shared_terms = sorted(
                intersection,
                key=lambda term: (
                    left["text"].lower().count(term) + right["text"].lower().count(term),
                    term,
                ),
                reverse=True,
            )[:10]

            relationships.append({
                "chunk_id_1": left["chunk_id"],
                "chunk_id_2": right["chunk_id"],
                "source_1": left["document"],
                "source_2": right["document"],
                "page_1": left["page_number"],
                "page_2": right["page_number"],
                "similarity": round(similarity, 4),
                "shared_terms": shared_terms,
                "relationship_type": "lexical_overlap",
            })

            adjacency[i].add(j)
            adjacency[j].add(i)

    # Connected components for context groups
    visited = set()
    context_groups = []

    for start in range(len(records)):
        if start in visited or not adjacency[start]:
            continue

        queue = deque([start])
        visited.add(start)
        component = []

        while queue:
            current = queue.popleft()
            component.append(current)
            for neighbor in sorted(adjacency[current]):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        context_groups.append({
            "group_id": len(context_groups) + 1,
            "chunk_ids": [records[idx]["chunk_id"] for idx in component],
            "sources": list(dict.fromkeys(records[idx]["document"] for idx in component)),
            "pages": list(dict.fromkeys(records[idx]["page_number"] for idx in component)),
        })

    return {
        "chunk_count": len(records),
        "relationship_count": len(relationships),
        "similarity_threshold": similarity_threshold,
        "relationships": relationships,
        "context_groups": context_groups,
    }


def resolve_followup_query(
    question: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
) -> str:
    """
    Contextualize follow-up queries (e.g. 'What is the duration?', 'Explain that in more detail',
    'What about the second one?') using the conversation history so vector retrieval
    finds relevant passages without contaminating prompts with irrelevant past history.
    """
    if not conversation_history:
        return question

    q_lower = question.strip().lower()

    # Detect if the query is a clear standalone question
    standalone_indicators = ["what is", "who is", "where is", "when did", "how many", "list the", "summarize"]
    tokens = normalize_text(question)

    # If it is long and descriptive, likely standalone
    if len(tokens) >= 5 and any(q_lower.startswith(ind) for ind in standalone_indicators):
        return question

    # Short follow-up phrases that refer to prior context
    follow_up_cues = [
        "what about", "and the", "duration", "dates", "why", "how so", "elaborate",
        "explain that", "more detail", "second", "first", "compare", "tell me more",
        "in 5 points", "briefly", "what else", "who", "when"
    ]

    is_followup = (
        len(tokens) < 4
        or any(cue in q_lower for cue in follow_up_cues)
        or any(pronoun in q_lower.split() for pronoun in ["it", "this", "that", "these", "they", "its"])
    )

    if not is_followup:
        return question

    # Retrieve last user question and last assistant response summary
    last_user_q = ""
    for msg in reversed(conversation_history):
        if msg.get("role") == "user":
            last_user_q = msg.get("content", "").strip()
            break

    if last_user_q:
        # Formulate contextualized search query
        contextualized = f"{last_user_q} {question}"
        return contextualized

    return question
