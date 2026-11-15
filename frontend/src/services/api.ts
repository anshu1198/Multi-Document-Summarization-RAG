import {
  HealthStatus,
  DashboardMetrics,
  DocumentItem,
  SourceCitation,
  LatencyMetrics,
  SummaryResult,
  ComparisonResult,
  ContradictionResult,
  HistoryItem,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const errJson = await res.json();
      errorMsg = errJson.detail || errJson.message || errorMsg;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse<HealthStatus>(res);
  },

  async getMetrics(): Promise<DashboardMetrics> {
    const res = await fetch(`${API_BASE}/api/metrics`);
    return handleResponse<DashboardMetrics>(res);
  },

  async getDocuments(): Promise<{ total_documents: number; documents: DocumentItem[] }> {
    const res = await fetch(`${API_BASE}/api/documents`);
    return handleResponse<{ total_documents: number; documents: DocumentItem[] }>(res);
  },

  async uploadDocuments(files: File[]): Promise<any[]> {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }
    const res = await fetch(`${API_BASE}/api/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<any[]>(res);
  },

  async deleteDocument(docName: string): Promise<{ message: string; deleted_chunks: number }> {
    const res = await fetch(`${API_BASE}/api/documents/${encodeURIComponent(docName)}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string; deleted_chunks: number }>(res);
  },

  async askQuestion(
    question: string,
    documentFilter?: string | null,
    topK: number = 4,
    temperature: number = 0.1,
    conversationHistory?: { role: string; content: string }[]
  ): Promise<{
    question: string;
    answer: string;
    sources: SourceCitation[];
    context_analysis?: any;
    latency?: LatencyMetrics;
    status: string;
  }> {
    const res = await fetch(`${API_BASE}/api/qa/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        document_filter: documentFilter || null,
        top_k: topK,
        temperature,
        conversation_history: conversationHistory || null,
      }),
    });
    return handleResponse(res);
  },

  async askQuestionStream(
    question: string,
    documentFilter: string | null = null,
    topK: number = 4,
    temperature: number = 0.1,
    conversationHistory: { role: string; content: string }[] | null = null,
    callbacks: {
      onStatus?: (stage: string, message: string) => void;
      onToken?: (token: string) => void;
      onDone?: (data: { answer: string; sources: SourceCitation[]; latency?: LatencyMetrics; context_analysis?: any }) => void;
      onError?: (err: Error) => void;
    } = {}
  ): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/api/qa/ask/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          document_filter: documentFilter || null,
          top_k: topK,
          temperature,
          conversation_history: conversationHistory || null,
        }),
      });

      if (!res.ok) {
        let errDetail = `Server error HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          errDetail = errJson.detail || errJson.message || errDetail;
        } catch {
          // ignore
        }
        throw new Error(errDetail);
      }

      if (!res.body) {
        throw new Error('Response stream unavailable');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === 'status' && callbacks.onStatus) {
              callbacks.onStatus(parsed.stage, parsed.message);
            } else if (parsed.type === 'token' && callbacks.onToken) {
              callbacks.onToken(parsed.content);
            } else if (parsed.type === 'done' && callbacks.onDone) {
              callbacks.onDone({
                answer: parsed.answer,
                sources: parsed.sources || [],
                latency: parsed.latency,
                context_analysis: parsed.context_analysis,
              });
            } else if (parsed.type === 'error' && callbacks.onError) {
              callbacks.onError(new Error(parsed.message || 'Streaming error'));
            }
          } catch {
            // ignore non-json chunk
          }
        }
      }
    } catch (err: any) {
      if (callbacks.onError) {
        callbacks.onError(err);
      } else {
        throw err;
      }
    }
  },

  async generateSummary(
    documentName?: string | null,
    summaryType: string = 'detailed',
    temperature: number = 0.1
  ): Promise<SummaryResult> {
    const res = await fetch(`${API_BASE}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_name: documentName || null,
        summary_type: summaryType,
        temperature,
      }),
    });
    return handleResponse<SummaryResult>(res);
  },

  async compareDocuments(documentNames: string[]): Promise<ComparisonResult> {
    const res = await fetch(`${API_BASE}/api/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_names: documentNames,
      }),
    });
    return handleResponse<ComparisonResult>(res);
  },

  async detectContradictions(documentNames?: string[] | null): Promise<ContradictionResult> {
    const res = await fetch(`${API_BASE}/api/contradictions/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_names: documentNames || null,
      }),
    });
    return handleResponse<ContradictionResult>(res);
  },

  async getHistory(): Promise<{ total_items: number; items: HistoryItem[] }> {
    const res = await fetch(`${API_BASE}/api/history`);
    return handleResponse<{ total_items: number; items: HistoryItem[] }>(res);
  },

  async clearHistory(): Promise<{ message: string; status: string }> {
    const res = await fetch(`${API_BASE}/api/history`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string; status: string }>(res);
  },

  async deleteHistoryItem(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/api/history/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ message: string }>(res);
  },
};
