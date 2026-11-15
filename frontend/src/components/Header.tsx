import React from 'react';
import { UploadCloud, Search, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { ActiveTab, HealthStatus } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  health: HealthStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const titles: Record<ActiveTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Workspace Dashboard',
    subtitle: 'Overview of indexed documents, retrieval health, and AI actions',
  },
  upload: {
    title: 'Document Management',
    subtitle: 'Upload, extract, chunk, and index PDF documents into ChromaDB',
  },
  summarizer: {
    title: 'AI Multi-Document Summarizer',
    subtitle: 'Generate executive, detailed, bullet-point, and multi-document summaries',
  },
  ask: {
    title: 'Ask Your Documents',
    subtitle: 'Interactive conversational RAG grounded strictly in uploaded passages',
  },
  compare: {
    title: 'Multi-Document Comparison',
    subtitle: 'Cross-examine multiple documents for similarities, differences, and key takeaways',
  },
  contradictions: {
    title: 'Contradiction & Conflict Detection',
    subtitle: 'Identify factual discrepancies and conflicting dates across documents',
  },
  history: {
    title: 'Session & Query History',
    subtitle: 'Review and reopen previous queries, summaries, comparisons, and findings',
  },
  settings: {
    title: 'System Settings & Architecture',
    subtitle: 'Vector database, Ollama runtime, embedding models, and retrieval configuration',
  },
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  onRefresh,
  isRefreshing,
}) => {
  const current = titles[activeTab] || titles.dashboard;

  return (
    <header className="h-18 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between z-10 shrink-0">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{current.title}</h1>
        <p className="text-xs text-slate-500 font-medium">{current.subtitle}</p>
      </div>

      <div className="flex items-center space-x-4">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* Health status pill */}
        <div
          className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            health?.ollama_status === 'connected'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {health?.ollama_status === 'connected' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          )}
          <span>{health?.ollama_status === 'connected' ? 'LLM Ready' : 'LLM Offline'}</span>
        </div>

        {/* Upload Action Button */}
        {activeTab !== 'upload' && (
          <button
            onClick={() => setActiveTab('upload')}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Documents</span>
          </button>
        )}

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-slate-800 to-indigo-900 border border-slate-200 flex items-center justify-center text-white text-xs font-bold shadow-sm">
          CQ
        </div>
      </div>
    </header>
  );
};
