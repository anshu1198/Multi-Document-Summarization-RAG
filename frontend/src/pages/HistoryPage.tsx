import React, { useState, useEffect } from 'react';
import {
  History,
  MessageSquare,
  Sparkles,
  GitCompare,
  AlertTriangle,
  Trash2,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';
import { HistoryItem } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

export const HistoryPage: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getHistory();
      setHistoryItems(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all history?')) return;
    try {
      await api.clearHistory();
      setHistoryItems([]);
    } catch (err: any) {
      alert(`Error clearing history: ${err.message}`);
    }
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteHistoryItem(id);
      setHistoryItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Error deleting item: ${err.message}`);
    }
  };

  const filteredItems = historyItems
    .filter((item) => filterType === 'all' || item.event_type === filterType)
    .filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(item.content).toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getEventBadge = (type: string) => {
    switch (type) {
      case 'question':
        return { label: 'Question', icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
      case 'summary':
        return { label: 'Summary', icon: Sparkles, color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'comparison':
        return { label: 'Comparison', icon: GitCompare, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'contradiction':
        return { label: 'Contradiction', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50 border-rose-200' };
      default:
        return { label: type, icon: History, color: 'text-slate-600 bg-slate-50 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past questions, summaries, and findings..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <button
          onClick={handleClearAll}
          disabled={historyItems.length === 0}
          className="flex items-center space-x-1.5 text-xs font-semibold py-2 px-3 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        {[
          { id: 'all', label: 'All History' },
          { id: 'question', label: 'Questions' },
          { id: 'summary', label: 'Summaries' },
          { id: 'comparison', label: 'Comparisons' },
          { id: 'contradiction', label: 'Contradictions' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterType === tab.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center text-slate-400 text-xs">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800 mb-1">No history records found</h4>
          <p className="text-xs text-slate-500">
            Interact with the Q&A, summarization, or comparison tools to generate persisted records.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const badge = getEventBadge(item.event_type);
            const Icon = badge.icon;
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:border-indigo-200 transition-all cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate mr-4">
                    <div className={`p-2 rounded-xl border ${badge.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.timestamp).toLocaleString()}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{item.event_type}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-4 text-xs animate-in fade-in duration-150">
                    {item.event_type === 'question' && (
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 font-sans text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {item.content.answer}
                        </div>
                        {item.content.sources && item.content.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {item.content.sources.map((s: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold"
                              >
                                <FileText className="w-3 h-3 text-indigo-500" />
                                {s.document} — Page {s.page_number}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {item.event_type === 'summary' && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/80">
                        <MarkdownRenderer content={item.content.summary} />
                      </div>
                    )}

                    {item.event_type === 'comparison' && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200/80">
                        <MarkdownRenderer content={item.content.report} />
                      </div>
                    )}

                    {item.event_type === 'contradiction' && (
                      <div className="space-y-2">
                        <div className="font-semibold text-slate-800">
                          Findings ({item.content.findings_count}):
                        </div>
                        {item.content.findings?.map((f: any, idx: number) => (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <span className="font-bold text-rose-600 mr-2">{f.title}:</span>
                            {f.explanation}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
