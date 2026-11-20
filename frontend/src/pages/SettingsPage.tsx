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
  RefreshCw,
} from 'lucide-react';
import { HealthStatus } from '../types';

interface SettingsPageProps {
  health: HealthStatus | null;
  onRefresh: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ health, onRefresh }) => {
  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* System Health Status Banner */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center border border-[#7187E8]/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#202938] tracking-tight">
                System Diagnostics & Services
              </h2>
              <p className="text-xs text-[#858D9A]">Live operational status of the RAG backend</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#202938] bg-[#F5F6F9] hover:bg-[#EEF2FF] hover:text-[#7187E8] rounded-xl border border-[#E8EBF1] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                health?.status === 'healthy'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>{health?.status === 'healthy' ? 'All Systems Operational' : 'Degraded'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#F5F6F9] border border-[#E8EBF1]">
            <div className="flex items-center justify-between text-xs text-[#858D9A] mb-1">
              <span className="font-bold">Ollama LLM Runtime</span>
              <Server className="w-4 h-4 text-[#7187E8]" />
            </div>
            <div className="text-sm font-extrabold text-[#202938]">
              {health?.ollama_status === 'connected' ? 'Connected' : 'Offline'}
            </div>
            <div className="text-[11px] text-[#858D9A] font-mono mt-1">
              Model: {health?.target_model || 'llama3.2:3b'}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F5F6F9] border border-[#E8EBF1]">
            <div className="flex items-center justify-between text-xs text-[#858D9A] mb-1">
              <span className="font-bold">Vector Database</span>
              <Database className="w-4 h-4 text-green-600" />
            </div>
            <div className="text-sm font-extrabold text-[#202938]">
              {health?.chroma_status === 'connected' ? 'Connected (ChromaDB)' : 'Offline'}
            </div>
            <div className="text-[11px] text-[#858D9A] font-mono mt-1">
              Collection: document_chunks
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F5F6F9] border border-[#E8EBF1]">
            <div className="flex items-center justify-between text-xs text-[#858D9A] mb-1">
              <span className="font-bold">Active Chunks</span>
              <Layers className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-sm font-extrabold text-[#202938]">
              {health?.indexed_documents_count ?? 0} Chunks
            </div>
            <div className="text-[11px] text-[#858D9A] font-mono mt-1">
              Cosine Space Metric
            </div>
          </div>
        </div>
      </div>

      {/* RAG Architecture Reference */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center border border-[#7187E8]/20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#202938] tracking-tight">
              Academic Project Architecture & AI Pipeline
            </h3>
            <p className="text-xs text-[#858D9A]">
              B.Tech Project: Multi-Document Summarization with Context Awareness using RAG
            </p>
          </div>
        </div>

        <div className="overflow-hidden border border-[#E8EBF1] rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F6F9] text-[#858D9A] font-bold border-b border-[#E8EBF1] text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Stage</th>
                <th className="py-2.5 px-4">Component</th>
                <th className="py-2.5 px-4">Technology</th>
                <th className="py-2.5 px-4">Implementation Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EBF1] text-[#202938]">
              <tr>
                <td className="py-2.5 px-4 font-bold text-[#202938]">1. Ingestion</td>
                <td className="py-2.5 px-4">PDF Text Extraction</td>
                <td className="py-2.5 px-4 font-mono text-[#7187E8]">PyMuPDF (fitz)</td>
                <td className="py-2.5 px-4 text-[#858D9A]">Preserves page numbers, source metadata, and filters artifacts</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-[#202938]">2. Chunking</td>
                <td className="py-2.5 px-4">Sliding Window</td>
                <td className="py-2.5 px-4 font-mono text-[#7187E8]">Python Regex</td>
                <td className="py-2.5 px-4 text-[#858D9A]">180 words with 30-word overlap for contextual continuity</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-[#202938]">3. Embedding</td>
                <td className="py-2.5 px-4">Dense Embeddings</td>
                <td className="py-2.5 px-4 font-mono text-[#7187E8]">all-MiniLM-L6-v2</td>
                <td className="py-2.5 px-4 text-[#858D9A]">384-dimensional dense vectors stored in ChromaDB</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-[#202938]">4. Reranking</td>
                <td className="py-2.5 px-4">Cross-Encoder</td>
                <td className="py-2.5 px-4 font-mono text-[#7187E8]">ms-marco-MiniLM-L6-v2</td>
                <td className="py-2.5 px-4 text-[#858D9A]">Re-scores (Query, Passage) pairs to eliminate false matches</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-[#202938]">5. Context Awareness</td>
                <td className="py-2.5 px-4">Lexical Graph & Overlap</td>
                <td className="py-2.5 px-4 font-mono text-[#7187E8]">Jaccard Overlap & Graph</td>
                <td className="py-2.5 px-4 text-[#858D9A]">Identifies cross-chunk thematic overlap and resolves follow-ups</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-[#202938]">6. Verification</td>
                <td className="py-2.5 px-4">Contradiction Detection</td>
                <td className="py-2.5 px-4 font-mono text-[#7187E8]">Deterministic + LLM</td>
                <td className="py-2.5 px-4 text-[#858D9A]">Date normalization flags chronological & factual discrepancies</td>
              </tr>
              <tr>
                <td className="py-2.5 px-4 font-bold text-[#202938]">7. Generation</td>
                <td className="py-2.5 px-4">Local LLM Inference</td>
                <td className="py-2.5 px-4 font-mono text-[#7187E8]">Ollama (llama3.2:3b)</td>
                <td className="py-2.5 px-4 text-[#858D9A]">Strict context-grounded prompt with verified page citations</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Model & Hardware Optimization Note */}
      <div className="bg-[#F5F6F9] border border-[#E8EBF1] rounded-2xl p-5 text-xs text-[#858D9A] space-y-2">
        <div className="font-bold text-[#202938] flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-green-600" />
          Hardware & System Optimization Features
        </div>
        <p className="leading-relaxed">
          The models (<code className="bg-white px-1.5 py-0.5 rounded border border-[#E8EBF1] text-[#202938]">all-MiniLM-L6-v2</code> and <code className="bg-white px-1.5 py-0.5 rounded border border-[#E8EBF1] text-[#202938]">ms-marco-MiniLM-L6-v2</code>) are managed using thread-safe in-memory singletons. They load once on startup and stay resident in RAM, preventing laptop freezing and eliminating redundant HuggingFace network handshakes. Ollama runs locally on CPU/GPU with zero external internet dependencies.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
