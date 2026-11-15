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
  page_count: number;
  chunk_count: number;
  upload_date: string;
  file_size: number;
  status: 'ready' | 'processing' | 'failed';
  is_scanned?: boolean;
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

export type ActiveTab =
  | 'dashboard'
  | 'upload'
  | 'ask'
  | 'summarizer'
  | 'compare'
  | 'contradictions'
  | 'history'
  | 'settings';
