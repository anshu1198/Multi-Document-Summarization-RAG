import React, { useState, useEffect } from 'react';
import {
  FileText,
  Sparkles,
  MessageSquareText,
  GitCompare,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Layers,
  Database,
  ArrowRight,
  HardDrive,
  Calendar,
  MoreVertical,
  Plus,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import { ActiveTab, DashboardMetrics, DocumentItem, HistoryItem } from '../types';
import { api } from '../services/api';
import { getDocumentCategory, getCategoryMeta } from '../utils/categories';

interface OverviewPageProps {
  metrics: DashboardMetrics | null;
  documents: DocumentItem[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectDocumentForSummary: (docName: string) => void;
  onDeleteDocument: (docName: string) => void;
  onOpenUploadModal: () => void;
  searchFilter?: string;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  metrics,
  documents,
  setActiveTab,
  onSelectDocumentForSummary,
  onDeleteDocument,
  onOpenUploadModal,
  searchFilter = '',
}) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [activities, setActivities] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Load real activity history from backend
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await api.getHistory();
        setActivities(res.items || []);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    fetchHistory();
  }, []);

  const effectiveSearch = (searchFilter || localSearch).toLowerCase().trim();

  // Filter documents by search and category
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      !effectiveSearch ||
      doc.document_name.toLowerCase().includes(effectiveSearch);

    const docCategory = getDocumentCategory(doc.document_name);
    const matchesCategory =
      categoryFilter === 'All' || docCategory === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleToggleDoc = (docName: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docName)
        ? prev.filter((d) => d !== docName)
        : [...prev, docName]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === filteredDocuments.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(filteredDocuments.map((d) => d.document_name));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '1.2 MB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const categoriesList = ['All', 'Technical Report', 'Research Paper', 'Project Documentation', 'Academic Notes'];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Section C: Recent Documents Cards ─────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h2 className="text-base font-extrabold text-[#202938] tracking-tight">
              Recent Documents
            </h2>
            <p className="text-xs text-[#858D9A]">
              Frequently accessed documents in your intelligence workspace
            </p>
          </div>
          <button
            onClick={() => setActiveTab('documents')}
            className="text-xs font-semibold text-[#7187E8] hover:text-[#5E75DE] flex items-center gap-1 transition-colors"
          >
            <span>View All ({documents.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.slice(0, 4).map((doc, idx) => {
            const category = getDocumentCategory(doc.document_name);
            const catMeta = getCategoryMeta(category);
            const isSelected = selectedDocs.includes(doc.document_name);

            return (
              <div
                key={idx}
                onClick={() => onSelectDocumentForSummary(doc.document_name)}
                className="bg-white border border-[#E8EBF1] hover:border-[#7187E8]/50 rounded-2xl p-4 shadow-card hover:shadow-hover transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Icon & Category */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl ${catMeta.iconBg} ${catMeta.iconColor} flex items-center justify-center font-bold text-xs`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.borderColor}`}>
                      {category}
                    </span>
                  </div>

                  {/* Title & Stats */}
                  <h3 className="text-xs font-bold text-[#202938] group-hover:text-[#7187E8] line-clamp-2 transition-colors mb-2">
                    {doc.document_name}
                  </h3>

                  <div className="flex items-center gap-3 text-[11px] text-[#858D9A]">
                    <span>{doc.page_count} Pages</span>
                    <span>•</span>
                    <span>{doc.chunk_count} Chunks</span>
                  </div>
                </div>

                {/* Card Footer: Status & Action */}
                <div className="mt-4 pt-3 border-t border-[#F0F2F7] flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Indexed & Ready</span>
                  </div>
                  <span className="text-[#7187E8] font-bold text-[10px] group-hover:translate-x-0.5 transition-transform">
                    Summarize →
                  </span>
                </div>
              </div>
            );
          })}

          {/* Quick Upload Add Card */}
          <div
            onClick={onOpenUploadModal}
            className="bg-[#FAFBFD] border-2 border-dashed border-[#E8EBF1] hover:border-[#7187E8] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#EEF2FF]/40 transition-all group min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E8EBF1] group-hover:border-[#7187E8]/40 text-[#7187E8] flex items-center justify-center mb-2 shadow-xs transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-[#202938] group-hover:text-[#7187E8]">
              Upload New Document
            </span>
            <span className="text-[10px] text-[#858D9A] mt-0.5">
              Drag & drop or browse PDFs
            </span>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout (Section D & Section E/F) ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): All Documents Table */}
        <div className="lg:col-span-8 bg-white border border-[#E8EBF1] rounded-2xl p-5 shadow-card space-y-4">
          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-[#202938] tracking-tight flex items-center gap-2">
                All Documents
                <span className="text-xs font-bold bg-[#F5F6F9] text-[#7187E8] px-2 py-0.5 rounded-md border border-[#E8EBF1]">
                  {filteredDocuments.length}
                </span>
              </h2>
              <p className="text-[11px] text-[#858D9A]">
                Select documents to generate unified multi-document summaries
              </p>
            </div>

            {/* In-table Search Bar */}
            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-[#858D9A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Filter documents..."
                className="w-full bg-[#F5F6F9] text-xs text-[#202938] placeholder-[#858D9A] pl-8 pr-3 py-1.5 rounded-xl border border-transparent focus:border-[#7187E8] focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#EEF2FF] text-[#7187E8] font-bold border border-[#7187E8]/20'
                    : 'text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Multi-Select Floating Action Strip */}
          {selectedDocs.length > 0 && (
            <div className="bg-[#EEF2FF] border border-[#7187E8]/30 rounded-xl p-3 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2 text-xs font-bold text-[#7187E8]">
                <span>{selectedDocs.length} documents selected</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    onSelectDocumentForSummary(selectedDocs[0]);
                  }}
                  className="bg-[#7187E8] hover:bg-[#5E75DE] text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Synthesize MultiDoc Summary</span>
                </button>
                <button
                  onClick={() => setActiveTab('compare')}
                  className="bg-white hover:bg-slate-50 text-[#202938] border border-[#E8EBF1] text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <GitCompare className="w-3.5 h-3.5 text-[#7187E8]" />
                  <span>Compare</span>
                </button>
                <button
                  onClick={() => setSelectedDocs([])}
                  className="text-xs text-[#858D9A] hover:text-[#202938] px-2 py-1"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Document Table */}
          <div className="overflow-x-auto border border-[#E8EBF1] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F5F6F9] border-b border-[#E8EBF1] text-[#858D9A] font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5 w-8">
                    <input
                      type="checkbox"
                      checked={
                        filteredDocuments.length > 0 &&
                        selectedDocs.length === filteredDocuments.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-[#D1D7E4] text-[#7187E8] focus:ring-[#7187E8]"
                    />
                  </th>
                  <th className="py-3 px-3">Document Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Size & Pages</th>
                  <th className="py-3 px-3">Uploaded</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F7]">
                {filteredDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#858D9A]">
                      No documents found matching "{effectiveSearch}".
                    </td>
                  </tr>
                ) : (
                  filteredDocuments.map((doc, idx) => {
                    const category = getDocumentCategory(doc.document_name);
                    const catMeta = getCategoryMeta(category);
                    const isSelected = selectedDocs.includes(doc.document_name);

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-[#FAFBFD] transition-colors ${
                          isSelected ? 'bg-[#EEF2FF]/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleDoc(doc.document_name)}
                            className="rounded border-[#D1D7E4] text-[#7187E8] focus:ring-[#7187E8]"
                          />
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#202938]">
                          <div className="flex items-center gap-2 max-w-xs">
                            <FileText className="w-4 h-4 text-[#7187E8] shrink-0" />
                            <span className="truncate" title={doc.document_name}>
                              {doc.document_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.borderColor}`}>
                            {category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#5A6474]">
                          {doc.page_count} pgs · {formatFileSize(doc.file_size)}
                        </td>
                        <td className="py-3 px-3 text-[#858D9A]">
                          {new Date(doc.upload_date || Date.now()).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Ready
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => onSelectDocumentForSummary(doc.document_name)}
                              title="Summarize with ContextIQ"
                              className="p-1.5 text-[#858D9A] hover:text-[#7187E8] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                onSelectDocumentForSummary(doc.document_name);
                                setActiveTab('ask');
                              }}
                              title="Ask Questions"
                              className="p-1.5 text-[#858D9A] hover:text-[#7187E8] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                            >
                              <MessageSquareText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteDocument(doc.document_name)}
                              title="Delete from Vector DB"
                              className="p-1.5 text-[#858D9A] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Storage Overview & Real Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Storage & Corpus Overview Widget */}
          <div className="bg-white border border-[#E8EBF1] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#202938] uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-[#7187E8]" />
                Corpus & Storage
              </h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                Active Local Index
              </span>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#FAFBFD] border border-[#E8EBF1] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[#858D9A]">Total Documents</div>
                <div className="text-xl font-extrabold text-[#202938] mt-0.5">
                  {metrics?.total_documents ?? documents.length}
                </div>
              </div>
              <div className="bg-[#FAFBFD] border border-[#E8EBF1] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[#858D9A]">Total Pages</div>
                <div className="text-xl font-extrabold text-[#202938] mt-0.5">
                  {metrics?.total_pages ?? 0}
                </div>
              </div>
              <div className="bg-[#FAFBFD] border border-[#E8EBF1] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[#858D9A]">Indexed Chunks</div>
                <div className="text-xl font-extrabold text-[#7187E8] mt-0.5">
                  {metrics?.total_chunks ?? 0}
                </div>
              </div>
              <div className="bg-[#FAFBFD] border border-[#E8EBF1] rounded-xl p-3">
                <div className="text-[10px] font-semibold text-[#858D9A]">Queries Run</div>
                <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
                  {metrics?.recent_queries_count ?? 0}
                </div>
              </div>
            </div>

            {/* Storage Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px] text-[#858D9A]">
                <span>Vector Memory (ChromaDB)</span>
                <span className="font-semibold text-[#202938]">
                  ~{((metrics?.total_chunks || 49) * 0.04).toFixed(1)} MB / 2 GB
                </span>
              </div>
              <div className="w-full bg-[#F0F2F7] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#7187E8] h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(8, ((metrics?.total_chunks || 49) / 500) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Real Activity Feed Widget */}
          <div className="bg-white border border-[#E8EBF1] rounded-2xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#202938] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#7187E8]" />
                Recent Activity Feed
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-[10px] font-bold text-[#7187E8] hover:text-[#5E75DE]"
              >
                View History
              </button>
            </div>

            <div className="space-y-3">
              {isLoadingHistory ? (
                <div className="text-xs text-[#858D9A] py-4 text-center">Loading activity...</div>
              ) : activities.length === 0 ? (
                <div className="text-xs text-[#858D9A] py-6 text-center">
                  No activity recorded yet. Upload a document or run a query!
                </div>
              ) : (
                activities.slice(0, 5).map((act, idx) => (
                  <div
                    key={act.id || idx}
                    onClick={() => setActiveTab('history')}
                    className="p-2.5 rounded-xl hover:bg-[#F5F6F9] border border-transparent hover:border-[#E8EBF1] transition-all cursor-pointer flex items-start gap-2.5"
                  >
                    <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center shrink-0 mt-0.5">
                      {act.event_type === 'question' ? (
                        <MessageSquareText className="w-3.5 h-3.5" />
                      ) : act.event_type === 'summary' ? (
                        <Sparkles className="w-3.5 h-3.5" />
                      ) : act.event_type === 'comparison' ? (
                        <GitCompare className="w-3.5 h-3.5" />
                      ) : (
                        <FileCheck2 className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-[#202938] truncate">
                        {act.title}
                      </div>
                      <div className="text-[10px] text-[#858D9A] mt-0.5 flex items-center gap-2">
                        <span className="capitalize">{act.event_type}</span>
                        <span>•</span>
                        <span>
                          {new Date(act.timestamp || Date.now()).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
