import React, { useState } from 'react';
import {
  GitCompare,
  FileText,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Download,
  Share2,
} from 'lucide-react';
import { DocumentItem, ComparisonResult } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

interface ComparePageProps {
  documents: DocumentItem[];
}

export const ComparePage: React.FC<ComparePageProps> = ({ documents }) => {
  const [selectedDocs, setSelectedDocs] = useState<string[]>(
    documents.slice(0, 2).map((d) => d.document_name || d.name || '')
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleDocument = (docName: string) => {
    if (selectedDocs.includes(docName)) {
      setSelectedDocs(selectedDocs.filter((d) => d !== docName));
    } else {
      setSelectedDocs([...selectedDocs, docName]);
    }
  };

  const handleCompare = async () => {
    if (selectedDocs.length < 2) {
      alert('Please select at least 2 documents to compare.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.compareDocuments(selectedDocs);
      if (res.status === 'error') {
        setErrorMsg(res.message || 'Failed to compare documents.');
      } else {
        setResult(res);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error executing comparison.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.report) return;
    navigator.clipboard.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.report) return;
    const blob = new Blob([result.report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Document_Comparison_Report.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-6 animate-fade-in">
      {/* Document Selection Sidebar */}
      <div className="w-80 bg-white rounded-2xl border border-[#E8EBF1] p-5 flex flex-col justify-between shadow-sm shrink-0">
        <div className="space-y-4">
          <div className="pb-3 border-b border-[#E8EBF1]">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center border border-[#7187E8]/20">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#202938]">Compare Documents</h3>
                <p className="text-[11px] text-[#858D9A]">Select 2+ files</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <div className="text-xs text-[#858D9A] p-4 text-center">
                No documents found. Upload documents first.
              </div>
            ) : (
              documents.map((doc, idx) => {
                const docName = doc.document_name || doc.name || '';
                const isChecked = selectedDocs.includes(docName);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleDocument(docName)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isChecked
                        ? 'border-[#7187E8] bg-[#EEF2FF]/60 shadow-xs ring-1 ring-[#7187E8]/20'
                        : 'border-[#E8EBF1] hover:border-[#7187E8]/40 bg-[#F5F6F9]'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate mr-2">
                      <FileText
                        className={`w-4 h-4 shrink-0 ${
                          isChecked ? 'text-[#7187E8]' : 'text-[#858D9A]'
                        }`}
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold text-[#202938] truncate" title={docName}>
                          {docName}
                        </div>
                        <div className="text-[10px] text-[#858D9A]">
                          {doc.page_count} pages • {doc.chunk_count} chunks
                        </div>
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                        isChecked
                          ? 'bg-[#7187E8] border-[#7187E8] text-white'
                          : 'border-[#E8EBF1] bg-white'
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-[#E8EBF1]">
          <div className="text-[11px] text-[#858D9A] mb-2 flex justify-between">
            <span>Selected for comparison:</span>
            <span className="font-bold text-[#202938]">{selectedDocs.length} documents</span>
          </div>
          <button
            onClick={handleCompare}
            disabled={isLoading || selectedDocs.length < 2}
            className="w-full flex items-center justify-center space-x-2 bg-[#7187E8] hover:bg-[#5E75DE] disabled:opacity-40 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm shadow-[#7187E8]/20 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Comparing Documents...</span>
              </>
            ) : (
              <>
                <GitCompare className="w-4 h-4" />
                <span>Run Comparison Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Comparison Report Workspace */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E8EBF1] shadow-sm flex flex-col overflow-hidden">
        {/* Workspace Header */}
        <div className="px-6 py-4 border-b border-[#E8EBF1] flex items-center justify-between bg-[#F5F6F9]">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#858D9A]">
              Comparison Workspace:
            </span>
            <span className="text-xs font-bold text-[#7187E8] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full border border-[#7187E8]/20">
              CROSS-EXAMINATION REPORT
            </span>
          </div>

          {result?.report && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1.5 text-xs font-semibold text-[#202938] hover:text-[#7187E8] bg-white border border-[#E8EBF1] px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1.5 text-xs font-semibold text-[#202938] hover:text-[#7187E8] bg-white border border-[#E8EBF1] px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report</span>
              </button>
            </div>
          )}
        </div>

        {/* Workspace Body */}
        <div className="flex-1 p-8 overflow-y-auto">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] border border-[#7187E8]/20 flex items-center justify-center text-[#7187E8] shadow-sm animate-pulse">
                <GitCompare className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#202938]">
                  Comparing Document Passages...
                </h4>
                <p className="text-xs text-[#858D9A] mt-1">
                  Extracting key themes, calculating lexical relationships, and matching date timelines
                </p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          ) : result?.report ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="border-b border-[#E8EBF1] pb-4">
                <h2 className="text-lg font-extrabold text-[#202938] tracking-tight">
                  Document Comparison & Cross-Examination
                </h2>
                <div className="text-xs text-[#858D9A] mt-1">
                  Comparing: {result.documents.join(' vs ')}
                </div>
              </div>

              {/* Rendered Comparison */}
              <MarkdownRenderer content={result.report} />

              {/* Citations */}
              {result.sources && result.sources.length > 0 && (
                <div className="mt-8 pt-6 border-t border-[#E8EBF1]">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#858D9A] mb-3">
                    Verified Excerpt Citations:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.sources.map((s, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F5F6F9] border border-[#E8EBF1] text-[#202938] text-xs font-semibold"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#7187E8]" />
                        {s.document} — Page {s.page_number}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto">
              <GitCompare className="w-10 h-10 text-[#858D9A] mb-3 opacity-40" />
              <h4 className="text-sm font-bold text-[#202938] mb-1">No comparison report yet</h4>
              <p className="text-xs text-[#858D9A]">
                Select 2 or more documents from the left panel and click "Run Comparison Report".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComparePage;
