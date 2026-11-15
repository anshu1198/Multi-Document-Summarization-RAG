import React from 'react';
import {
  Cpu,
  Database,
  Layers,
  ShieldCheck,
  Activity,
  Server,
  FileCode,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { HealthStatus } from '../types';

interface SettingsPageProps {
  health: HealthStatus | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, onRefresh }) => {
  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-200">
      {/* System Health Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                System Diagnostics & Services
              </h2>
              <p className="text-xs text-slate-500">Live operational status of the RAG backend</p>
            </div>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              health?.status === 'healthy'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{health?.status === 'healthy' ? 'All Systems Operational' : 'Degraded'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Ollama LLM Runtime</span>
              <Server className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {health?.ollama_status === 'connected' ? 'Connected' : 'Offline'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Model: {health?.target_model || 'llama3.2:3b'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Vector Database</span>
              <Database className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {health?.chroma_status === 'connected' ? 'Connected (ChromaDB)' : 'Offline'}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Collection: document_chunks
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Active Chunks</span>
              <Layers className="w-4 h-4 text-violet-500" />
            </div>
            <div className="text-sm font-bold text-slate-900">
              {health?.indexed_documents_count ?? 0} Chunks
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Cosine Space Metric
            </div>
          </div>
        </div>
      </div>

      {/* RAG Architecture Reference for Faculty / Academic Presentation */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Academic Project Architecture & AI Pipeline
            </h3>
            <p className="text-xs text-slate-500">
              B.Tech Project: Multi-Document Summarization with Context Awareness using RAG
            </p>
          </div>
        </div>

        <div className="overflow-hidden border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Stage</th>
                <th className="py-2.5 px-4">Component</th>
                <th className="py-2.5 px-4">Technology</th>
                <th className="py-2.5 px-4">Implementation Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">1. Ingestion</td>
                <td className="py-2.5 px-4">PDF Text Extraction</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600">PyMuPDF (fitz)</td>
                <td className="py-2.5 px-4">Preserves page numbers, source metadata, and filters artifacts</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">2. Chunking</td>
                <td className="py-2.5 px-4">Sliding Window</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600">Python Regex</td>
                <td className="py-2.5 px-4">180 words with 30-word overlap for contextual continuity</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">3. Embedding</td>
                <td className="py-2.5 px-4">Dense Embeddings</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600">all-MiniLM-L6-v2</td>
                <td className="py-2.5 px-4">384-dimensional dense vectors stored in ChromaDB</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">4. Reranking</td>
                <td className="py-2.5 px-4">Cross-Encoder</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600">ms-marco-MiniLM-L6-v2</td>
                <td className="py-2.5 px-4">Re-scores (Query, Passage) pairs to eliminate false matches</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">5. Context Awareness</td>
                <td className="py-2.5 px-4">Lexical Graph & History</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600">Jaccard Connected Comps</td>
                <td className="py-2.5 px-4">Identifies cross-chunk thematic overlap and resolves follow-ups</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">6. Verification</td>
                <td className="py-2.5 px-4">Contradiction Detection</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600">Deterministic + LLM</td>
                <td className="py-2.5 px-4">Date normalization flags chronological & factual discrepancies</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">7. Generation</td>
                <td className="py-2.5 px-4">Local LLM Inference</td>
                <td className="py-2.5 px-4 font-mono text-indigo-600">Ollama (llama3.2:3b)</td>
                <td className="py-2.5 px-4">Strict context-grounded prompt with verified page citations</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Model & Hardware Optimization Note */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-2">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Hardware & Laptop Optimization Features
        </div>
        <p className="leading-relaxed">
          The models (<code className="bg-white px-1 py-0.5 rounded border border-slate-200">all-MiniLM-L6-v2</code> and <code className="bg-white px-1 py-0.5 rounded border border-slate-200">ms-marco-MiniLM-L6-v2</code>) are managed using thread-safe in-memory singletons. They load once on startup and stay resident in RAM, preventing laptop freezing and eliminating redundant HuggingFace network handshakes. Ollama runs locally on CPU with zero internet dependency.
        </p>
      </div>
    </div>
  );
};
