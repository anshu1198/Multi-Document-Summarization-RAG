export interface LatencyMetrics {
  retrieval_ms: number;
  reranking_ms: number;
  generation_ms: number;
  total_ms: number;
}

export interface HealthStatus {
  status: string;
  ollama_status: string;
  target_model: string;
  model_ready: boolean;
  chroma_status: string;
  indexed_documents_count: number;
  message: string;
}

export interface DashboardMetrics {
  total_documents: number;
  total_pages: number;
  total_chunks: number;
  recent_queries_count: number;
  collection_name: string;
  status: string;
}

export interface DocumentItem {
  document_name: string;
  name?: string;
  page_count: number;
  chunk_count: number;
  upload_date: string;
  file_size: number;
  status: 'ready' | 'processing' | 'failed';
  is_scanned?: boolean;
  category?: string;
}

export interface SourceCitation {
  document: string;
  page_number: number;
  chunk_id: string;
  score: number;
  text: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  latency?: LatencyMetrics;
  isStreaming?: boolean;
  statusMessage?: string;
  timestamp: string;
  isError?: boolean;
}

export interface SummaryResult {
  document_name: string;
  summary_type: string;
  summary: string;
  sources: { document: string; page_number: number }[];
  latency?: LatencyMetrics;
  status: string;
  selected_documents?: string[];
  key_insights?: string[];
  important_topics?: string[];
}

export interface ComparisonResult {
  status: string;
  documents: string[];
  report: string | null;
  message?: string;
  sources?: { document: string; page_number: number }[];
}

export interface ContradictionStatement {
  text: string;
  document: string;
  page_number: number;
  value?: string;
}

export interface ContradictionFinding {
  id: string;
  title: string;
  conflict_type: 'date' | 'numerical' | 'semantic';
  severity: 'clear_contradiction' | 'possible_inconsistency';
  attribute: string;
  statement_a: ContradictionStatement;
  statement_b: ContradictionStatement;
  explanation: string;
}

export interface ContradictionResult {
  status: string;
  message: string;
  documents_analyzed: string[];
  findings_count: number;
  findings: ContradictionFinding[];
}

export interface HistoryItem {
  id: string;
  event_type: 'question' | 'summary' | 'comparison' | 'contradiction';
  title: string;
  timestamp: string;
  content: any;
  metadata: Record<string, any>;
}

export interface ContextRelationship {
  chunk_id_1: string;
  chunk_id_2: string;
  source_1: string;
  source_2: string;
  page_1: number;
  page_2: number;
  similarity: number;
  shared_terms: string[];
  relationship_type: string;
}

export interface ContextGroup {
  group_id: number;
  chunk_ids: string[];
  sources: string[];
  pages: number[];
}

export interface CrossDocConcept {
  term: string;
  doc_count: number;
  documents: string[];
}

export interface ContextExplorationResult {
  status: string;
  total_documents: number;
  total_sampled_chunks: number;
  relationships_count: number;
  relationships: ContextRelationship[];
  context_groups: ContextGroup[];
  cross_document_concepts: CrossDocConcept[];
  documents: string[];
}

export type ActiveTab =
  | 'overview'
  | 'dashboard'
  | 'documents'
  | 'upload'
  | 'summarizer'
  | 'ask'
  | 'context'
  | 'compare'
  | 'contradictions'
  | 'history'
  | 'settings';
