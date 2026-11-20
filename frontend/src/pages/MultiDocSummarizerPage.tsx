import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Loader2,
  Bookmark,
  Layers,
  ListOrdered,
  FileSpreadsheet,
  Zap,
  Send,
  MessageSquareText,
  Share2,
  Search,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Tag,
  Lightbulb,
  ExternalLink,
  Bot,
} from 'lucide-react';
import { DocumentItem, SummaryResult, SourceCitation } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { getDocumentCategory, getCategoryMeta } from '../utils/categories';

interface MultiDocSummarizerPageProps {
  documents: DocumentItem[];
  preselectedDoc?: string | null;
  onOpenCitation?: (citation: SourceCitation) => void;
}

export const MultiDocSummarizerPage: React.FC<MultiDocSummarizerPageProps> = ({
  documents,
  preselectedDoc,
  onOpenCitation,
}) => {
  // Document Selection State (multi-document by default)
  const [selectedDocs, setSelectedDocs] = useState<string[]>(() => {
    if (preselectedDoc) return [preselectedDoc];
    return documents.map((d) => d.document_name);
  });

  const [docSearch, setDocSearch] = useState('');
  const [summaryType, setSummaryType] = useState<string>('multi_document');
  const [temperature, setTemperature] = useState<number>(0.1);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Key topics and insights extracted from summary
  const [keyInsights, setKeyInsights] = useState<string[]>([]);
  const [importantTopics, setImportantTopics] = useState<string[]>([]);

  // Follow-up Q&A within the summarization workspace
  const [followupInput, setFollowupInput] = useState('');
  const [followupResponse, setFollowupResponse] = useState<{
    question: string;
    answer: string;
    sources: SourceCitation[];
    latency?: any;
  } | null>(null);
  const [isAskingFollowup, setIsAskingFollowup] = useState(false);

  // Synchronize preselected doc if changed from parent
  useEffect(() => {
    if (preselectedDoc) {
      setSelectedDocs((prev) =>
        prev.includes(preselectedDoc) ? prev : [preselectedDoc, ...prev]
      );
    }
  }, [preselectedDoc]);

  // Extract structured key insights and topics when summary changes
  useEffect(() => {
    if (!result?.summary) {
      setKeyInsights([]);
      setImportantTopics([]);
      return;
    }

    const lines = result.summary.split('\n');
    const bulletLines = lines
      .map((l) => l.trim())
      .filter((l) => l.startsWith('- ') || l.startsWith('* ') || /^\d+\.\s/.test(l))
      .map((l) => l.replace(/^[-*]\s+|\d+\.\s+/, '').replace(/\*\*/g, '').trim())
      .filter((l) => l.length > 20);

    setKeyInsights(bulletLines.slice(0, 4));

    // Extract capitalized terms & keywords as topics
    const words = result.summary.match(/\b[A-Z][a-zA-Z0-9_-]{3,}\b/g) || [];
    const uniqueTopics = Array.from(new Set(words))
      .filter(
        (w) =>
          !['This', 'The', 'That', 'These', 'Document', 'Summary', 'Page', 'Table', 'Figure'].includes(w)
      )
      .slice(0, 8);
    setImportantTopics(uniqueTopics);
  }, [result]);

  const summaryOptions = [
    {
      id: 'multi_document',
      name: 'Multi-Document Synthesis',
      description: 'Unified synthesis connecting all selected documents',
      icon: Sparkles,
      recommended: true,
    },
    {
      id: 'executive',
      name: 'Executive Briefing',
      description: 'Strategic briefing for leadership and review',
      icon: FileSpreadsheet,
    },
    {
      id: 'key_findings',
      name: 'Key Findings & Dates',
      description: 'Core discoveries, timelines, entities & metrics',
      icon: Bookmark,
    },
    {
      id: 'detailed',
      name: 'Detailed Analysis',
      description: 'Comprehensive section-by-section breakdown',
      icon: Layers,
    },
    {
      id: 'bullet_points',
      name: 'Key Bullet Points',
      description: '6 to 10 structured takeaways and milestones',
      icon: ListOrdered,
    },
    {
      id: 'brief',
      name: 'Brief Overview',
      description: 'Concise unified 1-2 paragraph executive summary',
      icon: FileText,
    },
  ];

  const handleToggleDoc = (docName: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docName)
        ? prev.filter((d) => d !== docName)
        : [...prev, docName]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocs.length === documents.length) {
      setSelectedDocs([]);
    } else {
      setSelectedDocs(documents.map((d) => d.document_name));
    }
  };

  const handleGenerate = async () => {
    if (selectedDocs.length === 0) {
      setErrorMsg('Please select at least one document to summarize.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setFollowupResponse(null);

    try {
      // If exactly 1 document selected, pass its name; otherwise pass null for multi-doc synthesis
      const docParam = selectedDocs.length === 1 ? selectedDocs[0] : null;
      const res = await api.generateSummary(docParam, summaryType, temperature);
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate summary.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollowupAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followupInput.trim() || isAskingFollowup) return;

    setIsAskingFollowup(true);
    const q = followupInput.trim();
    setFollowupInput('');

    try {
      // Restrict query to the selected documents
      const filterParam = selectedDocs.length === 1 ? selectedDocs[0] : null;
      const res = await api.askQuestion(q, filterParam, 4, 0.1);
      setFollowupResponse({
        question: q,
        answer: res.answer,
        sources: res.sources,
        latency: res.latency,
      });
    } catch (err: any) {
      setFollowupResponse({
        question: q,
        answer: `Error answering follow-up: ${err.message}`,
        sources: [],
      });
    } finally {
      setIsAskingFollowup(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result.summary], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ContextIQ_${result.summary_type}_Summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredDocs = documents.filter((d) =>
    d.document_name.toLowerCase().includes(docSearch.toLowerCase().trim())
  );

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-in fade-in duration-200">
      {/* ── Left Control Panel (Selected Docs & Options) ─────────────────────── */}
      <div className="w-full lg:w-88 xl:w-96 bg-white border border-[#E8EBF1] rounded-2xl p-5 shadow-card flex flex-col justify-between shrink-0 space-y-5 overflow-y-auto">
        <div className="space-y-5">
          {/* Document Multi-Selection Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#202938] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#7187E8]" />
                Selected Documents
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#7187E8] bg-[#EEF2FF] px-2 py-0.5 rounded-full border border-[#7187E8]/20">
                  {selectedDocs.length} of {documents.length}
                </span>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-[10px] font-bold text-[#858D9A] hover:text-[#202938]"
                >
                  {selectedDocs.length === documents.length ? 'Clear' : 'All'}
                </button>
              </div>
            </div>

            {/* Quick Filter Search for Docs */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-[#858D9A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                placeholder="Search uploaded documents..."
                className="w-full bg-[#F5F6F9] text-xs text-[#202938] placeholder-[#858D9A] pl-8 pr-3 py-1.5 rounded-xl border border-transparent focus:border-[#7187E8] focus:bg-white focus:outline-none transition-all"
              />
            </div>

            {/* Scrollable Document Checkbox List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-[#E8EBF1] rounded-xl p-2 bg-[#FAFBFD]">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#858D9A]">
                  No documents found.
                </div>
              ) : (
                filteredDocs.map((doc, idx) => {
                  const isChecked = selectedDocs.includes(doc.document_name);
                  const category = getDocumentCategory(doc.document_name);
                  const catMeta = getCategoryMeta(category);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleToggleDoc(doc.document_name)}
                      className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                        isChecked
                          ? 'bg-white border border-[#7187E8]/30 shadow-xs'
                          : 'hover:bg-white/60 border border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}} // Handled by parent div
                        className="mt-0.5 rounded border-[#D1D7E4] text-[#7187E8] focus:ring-[#7187E8]"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-semibold truncate ${
                            isChecked ? 'text-[#202938]' : 'text-[#5A6474]'
                          }`}
                          title={doc.document_name}
                        >
                          {doc.document_name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#858D9A] mt-0.5">
                          <span className={`px-1.5 py-0.2 rounded border ${catMeta.badgeBg} ${catMeta.badgeText} ${catMeta.borderColor}`}>
                            {category}
                          </span>
                          <span>{doc.page_count} pgs</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Summary Format Options */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#202938] block mb-2">
              Summary Format
            </label>
            <div className="space-y-1.5">
              {summaryOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = summaryType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSummaryType(opt.id)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                      isSelected
                        ? 'border-[#7187E8] bg-[#EEF2FF] text-[#202938] shadow-xs'
                        : 'border-[#E8EBF1] hover:border-[#D1D7E4] text-[#5A6474] bg-[#FAFBFD]'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-[#7187E8] text-white'
                          : 'bg-white text-[#858D9A] border border-[#E8EBF1]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{opt.name}</span>
                        {opt.recommended && (
                          <span className="text-[9px] font-bold text-[#7187E8] bg-white px-1.5 py-0.2 rounded border border-[#7187E8]/30">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#858D9A] leading-tight mt-0.5 truncate">
                        {opt.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="pt-3 border-t border-[#F0F2F7]">
          <button
            onClick={handleGenerate}
            disabled={isLoading || selectedDocs.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-[#7187E8] hover:bg-[#5E75DE] disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-sm shadow-[#7187E8]/25 transition-all hover:scale-[1.01]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing MultiDoc Summary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>
                  Synthesize MultiDoc Summary ({selectedDocs.length})
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Main Workspace: Generated Content & Structured Insights ─────────── */}
      <div className="flex-1 bg-white border border-[#E8EBF1] rounded-2xl shadow-card flex flex-col overflow-hidden min-h-[600px]">
        {/* Workspace Action Bar */}
        <div className="px-6 py-4 border-b border-[#E8EBF1] flex items-center justify-between bg-[#FAFBFD] shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#202938]">
              Synthesis Workspace
            </span>
            <span className="text-xs font-bold text-[#7187E8] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full border border-[#7187E8]/20 uppercase">
              {result?.summary_type.replace('_', ' ') || 'MULTI-DOC'}
            </span>
          </div>

          {result && (
            <div className="flex items-center space-x-2">
              {result.latency && result.latency.total_ms > 0 && (
                <div
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#202938] font-mono text-[10px] border border-[#E8EBF1]"
                  title={`Generation: ${result.latency.generation_ms}ms | Fetch: ${result.latency.retrieval_ms}ms`}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{(result.latency.total_ms / 1000).toFixed(2)}s</span>
                </div>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 text-xs font-semibold text-[#5A6474] hover:text-[#7187E8] bg-white border border-[#E8EBF1] px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadTxt}
                className="flex items-center space-x-1.5 text-xs font-semibold text-[#5A6474] hover:text-[#7187E8] bg-white border border-[#E8EBF1] px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                title="Download as TXT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download TXT</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 text-xs font-semibold text-[#5A6474] hover:text-[#7187E8] bg-white border border-[#E8EBF1] px-3 py-1.5 rounded-xl transition-colors shadow-xs"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Summary Reading & Analysis Area */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto space-y-6">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-16">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#7187E8]/20 flex items-center justify-center text-[#7187E8] shadow-sm animate-pulse">
                <Sparkles className="w-7 h-7 animate-spin" />
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-extrabold text-[#202938]">
                  Synthesizing Multi-Document Intelligence...
                </h4>
                <p className="text-xs text-[#858D9A] mt-1.5 leading-relaxed">
                  Extracting cross-document themes, balancing technical findings across {selectedDocs.length} documents, and verifying source page citations.
                </p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
              {errorMsg}
            </div>
          ) : result ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header Title & Provenance Tags */}
              <div className="border-b border-[#F0F2F7] pb-4">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedDocs.map((d, i) => (
                    <span
                      key={i}
                      className="text-[10px] font-bold text-[#7187E8] bg-[#EEF2FF] px-2 py-0.5 rounded-md border border-[#7187E8]/20 flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      {d}
                    </span>
                  ))}
                </div>
                <h2 className="text-xl font-extrabold text-[#202938] tracking-tight">
                  {result.document_name}
                </h2>
                <div className="text-xs text-[#858D9A] mt-1">
                  Synthesized across {selectedDocs.length} documents with ContextIQ RAG engine
                </div>
              </div>

              {/* ── Structured Section: Key Insights Highlight ─────────────── */}
              {keyInsights.length > 0 && (
                <div className="bg-[#FAFBFD] border border-[#E8EBF1] rounded-2xl p-5 shadow-xs">
                  <div className="text-xs font-bold text-[#202938] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Key Executive Insights
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {keyInsights.map((insight, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-[#E8EBF1] rounded-xl p-3 text-xs text-[#4B5563] leading-relaxed flex items-start gap-2 shadow-xs"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#EEF2FF] text-[#7187E8] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Structured Section: Important Topics Extracted ───────────── */}
              {importantTopics.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-[#858D9A] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-[#7187E8]" />
                    Extracted Core Concepts & Entities
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {importantTopics.map((topic, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-semibold px-3 py-1 rounded-lg bg-[#F5F6F9] border border-[#E8EBF1] text-[#202938]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Main Summary Rendered Body ──────────────────────────────── */}
              <div className="bg-white border border-[#E8EBF1] rounded-2xl p-6 shadow-xs">
                <MarkdownRenderer content={result.summary} />
              </div>

              {/* ── Source Provenance & Citations ───────────────────────────── */}
              {result.sources && result.sources.length > 0 && (
                <div className="border-t border-[#F0F2F7] pt-5">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#858D9A] mb-3 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-[#7187E8]" />
                    Referenced Source Pages & Provenance
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() =>
                          onOpenCitation &&
                          onOpenCitation({
                            document: src.document,
                            page_number: src.page_number,
                            chunk_id: '',
                            score: 0.95,
                            text: `Source reference from ${src.document}, Page ${src.page_number}.`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAFBFD] border border-[#E8EBF1] hover:border-[#7187E8] text-[#202938] text-xs font-semibold transition-colors shadow-xs"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#7187E8]" />
                        <span>
                          {src.document} — Page {src.page_number}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Integrated Follow-up Q&A within Workspace Context ────────── */}
              <div className="bg-[#EEF2FF]/60 border border-[#7187E8]/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#202938] flex items-center gap-2">
                    <Bot className="w-4 h-4 text-[#7187E8]" />
                    Ask a Follow-Up About This Summary
                  </div>
                  <span className="text-[10px] text-[#858D9A]">
                    Grounded in {selectedDocs.length} selected document(s)
                  </span>
                </div>

                <form onSubmit={handleFollowupAsk} className="flex gap-2">
                  <input
                    type="text"
                    value={followupInput}
                    onChange={(e) => setFollowupInput(e.target.value)}
                    placeholder="Ask a clarifying question (e.g. 'What were the specific dates?' or 'What methodologies were used?')..."
                    disabled={isAskingFollowup}
                    className="flex-1 bg-white border border-[#E8EBF1] text-xs text-[#202938] placeholder-[#858D9A] px-3.5 py-2.5 rounded-xl focus:border-[#7187E8] focus:outline-none shadow-xs"
                  />
                  <button
                    type="submit"
                    disabled={!followupInput.trim() || isAskingFollowup}
                    className="bg-[#7187E8] hover:bg-[#5E75DE] disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    {isAskingFollowup ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>Ask</span>
                  </button>
                </form>

                {/* Follow-up Answer Output */}
                {followupResponse && (
                  <div className="bg-white border border-[#E8EBF1] rounded-xl p-4 text-xs space-y-2 mt-3 animate-in fade-in">
                    <div className="font-bold text-[#202938] flex items-center gap-1.5">
                      <span className="text-[#7187E8]">Q:</span> {followupResponse.question}
                    </div>
                    <div className="text-[#4B5563] leading-relaxed">
                      <MarkdownRenderer content={followupResponse.answer} />
                    </div>
                    {followupResponse.sources && followupResponse.sources.length > 0 && (
                      <div className="pt-2 border-t border-[#F0F2F7] flex flex-wrap gap-1.5">
                        {followupResponse.sources.map((s, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-[#F5F6F9] border border-[#E8EBF1] px-2 py-0.5 rounded text-[#5A6474]"
                          >
                            {s.document} p.{s.page_number}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-16">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#7187E8]/20 flex items-center justify-center text-[#7187E8] mb-4 shadow-xs">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-extrabold text-[#202938] mb-1.5">
                MultiDoc Summarization Workspace
              </h3>
              <p className="text-xs text-[#858D9A] leading-relaxed mb-4">
                Select your target documents from the left panel, choose a summary format (e.g. Executive Briefing or Multi-Document Synthesis), and click Generate to extract unified cross-document intelligence.
              </p>
              <div className="text-[11px] text-[#7187E8] font-bold bg-[#EEF2FF] px-3 py-1.5 rounded-full border border-[#7187E8]/30">
                {selectedDocs.length} Document(s) Currently Selected
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
