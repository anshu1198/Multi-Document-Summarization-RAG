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
        return { label: 'Question', icon: MessageSquare, color: 'text-[#7187E8] bg-[#EEF2FF] border-[#7187E8]/20' };
      case 'summary':
        return { label: 'Summary', icon: Sparkles, color: 'text-purple-600 bg-purple-50 border-purple-200' };
      case 'comparison':
        return { label: 'Comparison', icon: GitCompare, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'contradiction':
        return { label: 'Contradiction', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' };
      default:
        return { label: type, icon: History, color: 'text-[#858D9A] bg-[#F5F6F9] border-[#E8EBF1]' };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Search Controls */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <Search className="w-4 h-4 text-[#858D9A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past questions, summaries, and findings..."
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#F5F6F9] border border-[#E8EBF1] rounded-xl text-[#202938] placeholder:text-[#858D9A] focus:outline-none focus:border-[#7187E8]"
          />
        </div>

        <button
          onClick={handleClearAll}
          disabled={historyItems.length === 0}
          className="flex items-center space-x-1.5 text-xs font-bold py-2.5 px-4 text-[#858D9A] hover:text-red-600 hover:bg-red-50 rounded-xl border border-[#E8EBF1] transition-colors disabled:opacity-40"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear History</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterType === tab.id
                ? 'bg-[#7187E8] text-white shadow-sm'
                : 'bg-white text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9] border border-[#E8EBF1]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EBF1] p-16 text-center text-[#858D9A] text-xs">
          <History className="w-10 h-10 text-[#858D9A] mx-auto mb-3 opacity-40" />
          <h4 className="text-sm font-bold text-[#202938] mb-1">No history records found</h4>
          <p className="text-xs text-[#858D9A]">
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
                className="bg-white rounded-2xl border border-[#E8EBF1] overflow-hidden shadow-xs hover:border-[#7187E8]/40 transition-all cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate mr-4">
                    <div className={`p-2 rounded-xl border ${badge.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-[#202938] truncate">
                        {item.title}
                      </div>
                      <div className="text-[10px] text-[#858D9A] flex items-center gap-2 mt-0.5">
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
                      className="p-1.5 text-[#858D9A] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="p-1.5 text-[#858D9A]">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-[#E8EBF1] bg-[#F5F6F9] space-y-4 text-xs animate-fade-in">
                    {item.event_type === 'question' && (
                      <div className="space-y-3">
                        <div className="bg-white p-4 rounded-xl border border-[#E8EBF1] font-sans text-sm text-[#202938] leading-relaxed whitespace-pre-wrap">
                          {item.content.answer}
                        </div>
                        {item.content.sources && item.content.sources.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {item.content.sources.map((s: any, idx: number) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8EBF1] text-[#202938] text-xs font-semibold"
                              >
                                <FileText className="w-3 h-3 text-[#7187E8]" />
                                {s.document} — Page {s.page_number}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {item.event_type === 'summary' && (
                      <div className="bg-white p-5 rounded-xl border border-[#E8EBF1]">
                        <MarkdownRenderer content={item.content.summary} />
                      </div>
                    )}

                    {item.event_type === 'comparison' && (
                      <div className="bg-white p-5 rounded-xl border border-[#E8EBF1]">
                        <MarkdownRenderer content={item.content.report} />
                      </div>
                    )}

                    {item.event_type === 'contradiction' && (
                      <div className="space-y-2">
                        <div className="font-semibold text-[#202938]">
                          Findings ({item.content.findings_count}):
                        </div>
                        {item.content.findings?.map((f: any, idx: number) => (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-[#E8EBF1] text-xs">
                            <span className="font-bold text-amber-600 mr-2">{f.title}:</span>
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

export default HistoryPage;
