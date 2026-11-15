import React from 'react';
import {
  Files,
  FileText,
  Database,
  MessageSquare,
  Sparkles,
  GitCompare,
  AlertTriangle,
  ArrowRight,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { ActiveTab, DashboardMetrics, DocumentItem } from '../types';

interface DashboardPageProps {
  metrics: DashboardMetrics | null;
  documents: DocumentItem[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectDocumentForSummary: (docName: string) => void;
  onDeleteDocument: (docName: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  metrics,
  documents,
  setActiveTab,
  onSelectDocumentForSummary,
  onDeleteDocument,
}) => {
  const metricCards = [
    {
      label: 'Indexed Documents',
      value: metrics ? metrics.total_documents : 0,
      icon: Files,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-indigo-50/60',
      textColor: 'text-indigo-600',
    },
    {
      label: 'Total Pages Processed',
      value: metrics ? metrics.total_pages : 0,
      icon: FileText,
      color: 'from-violet-500 to-purple-600',
      bgColor: 'bg-purple-50/60',
      textColor: 'text-purple-600',
    },
    {
      label: 'Vector Chunks Stored',
      value: metrics ? metrics.total_chunks : 0,
      icon: Database,
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-50/60',
      textColor: 'text-emerald-600',
    },
    {
      label: 'Queries Executed',
      value: metrics ? metrics.recent_queries_count : 0,
      icon: MessageSquare,
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-50/60',
      textColor: 'text-amber-600',
    },
  ];

  const quickActions = [
    {
      title: 'Ask Documents',
      description: 'Query facts and details across multiple documents with exact page citations.',
      icon: MessageSquare,
      tab: 'ask' as ActiveTab,
      badge: 'Interactive RAG',
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:border-indigo-300',
    },
    {
      title: 'AI Summarizer',
      description: 'Generate hierarchical summaries, executive briefs, and bullet points.',
      icon: Sparkles,
      tab: 'summarizer' as ActiveTab,
      badge: 'Multi-Style',
      color: 'text-purple-600 bg-purple-50 border-purple-100 hover:border-purple-300',
    },
    {
      title: 'Compare Documents',
      description: 'Cross-analyze similarities, differences, and key metrics across reports.',
      icon: GitCompare,
      tab: 'compare' as ActiveTab,
      badge: 'Comparative',
      color: 'text-blue-600 bg-blue-50 border-blue-100 hover:border-blue-300',
    },
    {
      title: 'Contradiction Detection',
      description: 'Pinpoint date conflicts and factual discrepancies between documents.',
      icon: AlertTriangle,
      tab: 'contradictions' as ActiveTab,
      badge: 'Verification',
      color: 'text-rose-600 bg-rose-50 border-rose-100 hover:border-rose-300',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Context-Aware RAG Engine
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight mb-2">
            Multi-Document Summarization & Intelligence
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Welcome to ContextIQ. Analyze complex documents, ask grounded questions with source page citations, detect contradictions, and synthesize cross-document summaries powered by ChromaDB, Sentence Transformers, and Ollama.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {metricCards.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {m.label}
                </span>
                <div className={`p-2.5 rounded-xl ${m.bgColor} ${m.textColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {m.value.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">Quick Actions</h3>
          <span className="text-xs text-slate-500">Select an intelligence task</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => setActiveTab(action.tab)}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl border ${action.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {action.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                    {action.title}
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {action.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600">
                  <span>Launch Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Indexed Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">Indexed Documents</h3>
            <p className="text-xs text-slate-500">Active PDF documents in the vector database</p>
          </div>
          <button
            onClick={() => setActiveTab('upload')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Manage All Documents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center">
            <Files className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-slate-700 mb-1">No documents indexed yet</h4>
            <p className="text-xs text-slate-500 mb-4">
              Upload your PDF reports or papers to begin context-aware retrieval and summarization.
            </p>
            <button
              onClick={() => setActiveTab('upload')}
              className="text-xs font-semibold bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Upload Documents
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Document Name</th>
                  <th className="py-3 px-6">Pages</th>
                  <th className="py-3 px-6">Chunks</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-medium text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{doc.document_name}</div>
                        <div className="text-[11px] text-slate-400 font-normal">
                          {(doc.file_size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">{doc.page_count}</td>
                    <td className="py-4 px-6 font-mono text-slate-600">{doc.chunk_count}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Ready
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => {
                          onSelectDocumentForSummary(doc.document_name);
                          setActiveTab('summarizer');
                        }}
                        className="px-3 py-1 rounded-md text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                      >
                        Summarize
                      </button>
                      <button
                        onClick={() => onDeleteDocument(doc.document_name)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete from Vector DB"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
