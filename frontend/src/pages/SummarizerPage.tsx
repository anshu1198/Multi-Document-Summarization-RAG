import React, { useState } from 'react';
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
} from 'lucide-react';
import { DocumentItem, SummaryResult } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

interface SummarizerPageProps {
  documents: DocumentItem[];
  preselectedDoc?: string | null;
}

export const SummarizerPage: React.FC<SummarizerPageProps> = ({
  documents,
  preselectedDoc,
}) => {
  const [selectedDoc, setSelectedDoc] = useState<string>(preselectedDoc || 'all');
  const [summaryType, setSummaryType] = useState<string>('detailed');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const summaryOptions = [
    {
      id: 'brief',
      name: 'Brief Summary',
      description: 'Concise 1-2 paragraph executive summary',
      icon: FileText,
    },
    {
      id: 'detailed',
      name: 'Detailed Summary',
      description: 'Multi-section comprehensive breakdown',
      icon: Layers,
    },
    {
      id: 'bullet_points',
      name: 'Bullet Points',
      description: '6 to 10 structured key takeaways & metrics',
      icon: ListOrdered,
    },
    {
      id: 'executive',
      name: 'Executive Briefing',
      description: 'Strategic briefing for leadership and review',
      icon: FileSpreadsheet,
    },
    {
      id: 'key_findings',
      name: 'Key Findings',
      description: 'Core discoveries, dates, entities & outcomes',
      icon: Bookmark,
    },
    {
      id: 'multi_document',
      name: 'Multi-Document Synthesis',
      description: 'Unified cross-document synthesis',
      icon: Sparkles,
    },
  ];

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const docParam = selectedDoc === 'all' ? null : selectedDoc;
      const res = await api.generateSummary(docParam, summaryType, 0.1);
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate summary.');
    } finally {
      setIsLoading(false);
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
    link.download = `${result.document_name}_${result.summary_type}_summary.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-6 animate-in fade-in duration-200">
      {/* Configuration Panel */}
      <div className="w-80 bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-sm shrink-0">
        <div className="space-y-6">
          {/* Target Document */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Document
            </label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">Multi-Document (All Uploaded Documents)</option>
              {documents.map((doc, idx) => (
                <option key={idx} value={doc.document_name}>
                  {doc.document_name}
                </option>
              ))}
            </select>
          </div>

          {/* Summary Format Types */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Summary Format
            </label>
            <div className="space-y-2">
              {summaryOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = summaryType === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setSummaryType(opt.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 shadow-xs'
                        : 'border-slate-200/80 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{opt.name}</div>
                      <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
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
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleGenerate}
            disabled={isLoading || documents.length === 0}
            className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold py-3 px-4 rounded-xl shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.01]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Synthesizing Summary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Reading & Result Pane */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
        {/* Workspace Action Bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Summary Workspace:
            </span>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {result?.summary_type.replace('_', ' ').toUpperCase() || 'READING PANE'}
            </span>
          </div>

          {result && (
            <div className="flex items-center space-x-2">
              {result.latency && result.latency.total_ms > 0 && (
                <div
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono text-[10px] border border-slate-200"
                  title={`Generation: ${result.latency.generation_ms}ms | Fetch: ${result.latency.retrieval_ms}ms`}
                >
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{(result.latency.total_ms / 1000).toFixed(2)}s</span>
                </div>
              )}

              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownloadTxt}
                className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                title="Download as TXT"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download TXT</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                title="Print or Save as PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Reading Body */}
        <div className="flex-1 p-8 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm animate-pulse">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Synthesizing Hierarchical Summary...
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Analyzing document chunks, aggregating technical findings, and grounding statements
                </p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
              {errorMsg}
            </div>
          ) : result ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                  {result.document_name}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  Generated with ContextIQ • Format: {result.summary_type}
                </div>
              </div>

              {/* Rendered Summary Content */}
              <MarkdownRenderer content={result.summary} />

              {/* Source Document Citations */}
              {result.sources && result.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Referenced Source Pages:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((src, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        {src.document} — Page {src.page_number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Select Format & Synthesize
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Choose a document from the left and pick from 6 structured summarization formats tailored for executive briefings, key findings, or multi-document comparison.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
