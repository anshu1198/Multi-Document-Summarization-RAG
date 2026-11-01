
"""
Context Awareness Module
Multi-Document Summarization with Context Awareness using RAG.

Analyzes lexical relationships between retrieved chunks.
Lexical overlap is not proof of semantic similarity or contradiction.
"""

import re
from collections import Counter, defaultdict, deque
from itertools import combinations


STOP_WORDS = {
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
    "per", "using", "used", "use", "based", "within"
}


def normalize_text(text):
    """Convert text into normalized word tokens."""
    if not isinstance(text, str):
        return []

    text = text.lower()
    text = re.sub(r"https?://\S+|www\.\S+", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)

    return [
        token for token in text.split()
        if token not in STOP_WORDS and len(token) > 1
    ]


def calculate_similarity(text1, text2):
    """Calculate Jaccard similarity between two texts."""
    words1 = set(normalize_text(text1))
    words2 = set(normalize_text(text2))

    if not words1 or not words2:
        return 0.0

    return len(words1 & words2) / len(words1 | words2)


def identify_shared_terms(text1, text2, limit=10):
    """Return frequently occurring terms shared by two texts."""
    words1 = Counter(normalize_text(text1))
    words2 = Counter(normalize_text(text2))
    shared = words1.keys() & words2.keys()

    return sorted(
        shared,
        key=lambda word: (
            words1[word] + words2[word],
            min(words1[word], words2[word]),
            word
        ),
        reverse=True
    )[:limit]


def _get_chunk_text(chunk):
    """Extract text from a string or chunk dictionary."""
    if isinstance(chunk, str):
        return chunk

    if isinstance(chunk, dict):
        for key in ("text", "content", "chunk_text"):
            value = chunk.get(key)
            if isinstance(value, str):
                return value

    return ""


def _get_chunk_metadata(chunk, index):
    """Extract chunk ID, source document, and page number."""
    if not isinstance(chunk, dict):
        return {
            "chunk_id": str(index),
            "source": None,
            "page_number": None
        }

    metadata = chunk.get("metadata", {})
    if not isinstance(metadata, dict):
        metadata = {}

    chunk_id = (
        chunk.get("chunk_id")
        or chunk.get("id")
        or metadata.get("chunk_id")
        or str(index)
    )

    source = (
        chunk.get("source")
        or chunk.get("source_file")
        or chunk.get("document")
        or metadata.get("source")
        or metadata.get("source_file")
        or metadata.get("filename")
        or metadata.get("document")
    )

    page_number = (
        chunk.get("page_number")
        or chunk.get("page")
        or metadata.get("page_number")
        or metadata.get("page")
    )

    return {
        "chunk_id": str(chunk_id),
        "source": source,
        "page_number": page_number
    }


def compare_chunks(chunk1, chunk2):
    """Compare two chunks using lexical similarity."""
    text1 = _get_chunk_text(chunk1)
    text2 = _get_chunk_text(chunk2)
    similarity = calculate_similarity(text1, text2)

    return {
        "similarity": round(similarity, 4),
        "shared_terms": identify_shared_terms(text1, text2),
        "related_by_word_overlap": (
            similarity >= 0.10 and similarity > 0
        ),
        "relationship_type": (
            "lexical_overlap"
            if similarity >= 0.10 and similarity > 0
            else "weak_or_no_lexical_overlap"
        )
    }


def analyze_context(chunks, similarity_threshold=0.10):
    """
    Analyze lexical relationships between retrieved chunks.

    Builds a graph where chunks are nodes and sufficiently similar
    pairs are edges. Connected components form context groups.

    This method does not independently detect contradictions,
    semantic equivalence, or factual agreement.
    """
    if not 0 <= similarity_threshold <= 1:
        raise ValueError(
            "similarity_threshold must be between 0 and 1."
        )

    records = []

    for index, chunk in enumerate(chunks):
        text = _get_chunk_text(chunk)

        records.append({
            **_get_chunk_metadata(chunk, index),
            "text": text,
            "terms": set(normalize_text(text))
        })

    relationships = []
    adjacency = defaultdict(set)

    for i, j in combinations(range(len(records)), 2):
        left = records[i]
        right = records[j]

        union = left["terms"] | right["terms"]
        intersection = left["terms"] & right["terms"]

        similarity = (
            len(intersection) / len(union)
            if union else 0.0
        )

        if similarity >= similarity_threshold and similarity > 0:
            shared_terms = sorted(
                intersection,
                key=lambda term: (
                    left["text"].lower().count(term)
                    + right["text"].lower().count(term),
                    term
                ),
                reverse=True
            )[:10]

            relationships.append({
                "chunk_id_1": left["chunk_id"],
                "chunk_id_2": right["chunk_id"],
                "source_1": left["source"],
                "source_2": right["source"],
                "page_1": left["page_number"],
                "page_2": right["page_number"],
                "similarity": round(similarity, 4),
                "shared_terms": shared_terms,
                "relationship_type": "lexical_overlap",
                "interpretation": (
                    "The chunks share vocabulary; their semantic "
                    "relationship requires further verification."
                )
            })

            adjacency[i].add(j)
            adjacency[j].add(i)

    # Find connected components of related chunks.
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
            "chunk_ids": [
                records[i]["chunk_id"] for i in component
            ],
            "sources": list(dict.fromkeys(
                records[i]["source"]
                for i in component
                if records[i]["source"] is not None
            )),
            "pages": list(dict.fromkeys(
                records[i]["page_number"]
                for i in component
                if records[i]["page_number"] is not None
            ))
        })

    chunk_summaries = [
        {
            "chunk_id": record["chunk_id"],
            "source": record["source"],
            "page_number": record["page_number"],
            "word_count": len(normalize_text(record["text"])),
            "text": record["text"]
        }
        for record in records
    ]

    return {
        "chunk_count": len(records),
        "relationship_count": len(relationships),
        "similarity_threshold": similarity_threshold,
        "chunks": chunk_summaries,
        "relationships": relationships,
        "context_groups": context_groups
    }
