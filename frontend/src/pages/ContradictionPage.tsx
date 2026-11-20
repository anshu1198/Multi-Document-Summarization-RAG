import React, { useState } from 'react';
import {
  AlertTriangle,
  FileText,
  Calendar,
  Hash,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Filter,
} from 'lucide-react';
import { DocumentItem, ContradictionFinding, ContradictionResult } from '../types';
import { api } from '../services/api';

interface ContradictionPageProps {
  documents: DocumentItem[];
}

export const ContradictionPage: React.FC<ContradictionPageProps> = ({ documents }) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ContradictionResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunScan = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await api.detectContradictions();
      setResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error running contradiction detection.');
    } finally {
      setIsLoading(false);
    }
  };

  const findings = result?.findings || [];
  const filteredFindings =
    filterType === 'all'
      ? findings
      : findings.filter((f) => f.conflict_type === filterType);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center border border-[#7187E8]/20 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#202938] tracking-tight">
              Cross-Document Contradiction Engine
            </h2>
            <p className="text-xs text-[#858D9A] mt-0.5">
              Compares verified factual claims and dates across documents using deterministic parsing and LLM verification.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isLoading || documents.length < 2}
          className="flex items-center space-x-2 bg-[#7187E8] hover:bg-[#5E75DE] disabled:opacity-40 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm shadow-[#7187E8]/20 transition-all shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Knowledge Base...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Scan for Inconsistencies</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Findings' },
          { id: 'date', label: 'Timeline & Date Conflicts' },
          { id: 'numerical', label: 'Numerical / Metrics' },
          { id: 'semantic', label: 'Semantic Factual' },
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

      {/* Findings Grid / Results */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E8EBF1] p-16 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#7187E8] mx-auto" />
          <h4 className="text-sm font-bold text-[#202938]">Cross-Referencing Claims...</h4>
          <p className="text-xs text-[#858D9A] max-w-sm mx-auto">
            Extracting entities, checking date boundaries, and validating statements between documents
          </p>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8EBF1] p-16 text-center text-[#858D9A] text-xs">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-[#202938] mb-1">
            {result ? 'No factual contradictions detected' : 'Scan not yet executed'}
          </h4>
          <p className="text-xs text-[#858D9A] max-w-sm mx-auto">
            {result
              ? 'The analyzed documents present consistent dates, facts, and metrics with zero detected conflicting claims.'
              : 'Click "Scan for Inconsistencies" above to inspect cross-document alignment.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-[#202938]">{finding.title}</h4>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  {finding.conflict_type} conflict
                </span>
              </div>

              <p className="text-xs text-[#858D9A] leading-relaxed">{finding.explanation}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#F5F6F9] rounded-xl border border-[#E8EBF1] text-xs space-y-1">
                  <div className="text-[10px] font-bold text-[#858D9A] flex items-center justify-between">
                    <span>STATEMENT A</span>
                    <span>
                      {finding.statement_a.document} (p.{finding.statement_a.page_number})
                    </span>
                  </div>
                  <p className="text-[#202938] font-medium italic">
                    "{finding.statement_a.text}"
                  </p>
                </div>

                <div className="p-3 bg-[#F5F6F9] rounded-xl border border-[#E8EBF1] text-xs space-y-1">
                  <div className="text-[10px] font-bold text-[#858D9A] flex items-center justify-between">
                    <span>STATEMENT B</span>
                    <span>
                      {finding.statement_b.document} (p.{finding.statement_b.page_number})
                    </span>
                  </div>
                  <p className="text-[#202938] font-medium italic">
                    "{finding.statement_b.text}"
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContradictionPage;
