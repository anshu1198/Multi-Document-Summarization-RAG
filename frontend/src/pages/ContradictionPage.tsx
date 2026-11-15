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
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            Cross-Document Contradiction Engine
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compares verified factual claims and dates across documents using deterministic parsing and LLM verification.
          </p>
        </div>

        <button
          onClick={handleRunScan}
          disabled={isLoading || documents.length < 2}
          className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-sm shadow-indigo-600/20 transition-all hover:scale-[1.01] shrink-0"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning Documents...</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4" />
              <span>Scan All Documents</span>
            </>
          )}
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {[
            { id: 'all', label: 'All Findings', count: findings.length },
            {
              id: 'date',
              label: 'Date Conflicts',
              count: findings.filter((f) => f.conflict_type === 'date').length,
            },
            {
              id: 'numerical',
              label: 'Numerical Conflicts',
              count: findings.filter((f) => f.conflict_type === 'numerical').length,
            },
            {
              id: 'semantic',
              label: 'Semantic Conflicts',
              count: findings.filter((f) => f.conflict_type === 'semantic').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterType === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterType === tab.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {result && (
          <div className="text-xs text-slate-500 font-medium">
            Documents evaluated: {result.documents_analyzed.length}
          </div>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Cross-Examining Document Statements...
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Extracting date intervals, comparing chronological milestones, and verifying claims for mutual exclusivity.
            </p>
          </div>
        </div>
      ) : errorMsg ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
          {errorMsg}
        </div>
      ) : !result ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            Contradiction Detection Workspace
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
            Click "Scan All Documents" to compare verified statements between documents and flag any date or numerical discrepancies.
          </p>
          <button
            onClick={handleRunScan}
            disabled={documents.length < 2}
            className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-4 py-2 rounded-xl transition-colors"
          >
            Start Contradiction Scan
          </button>
        </div>
      ) : filteredFindings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-900 mb-1">
            No Conflicting Claims Found
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            All statements and dates evaluated across the documents are factually consistent and verified.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              {/* Finding Title & Badges */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{finding.title}</h3>
                    <div className="text-[11px] text-slate-400 font-medium">
                      Attribute: {finding.attribute}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                      finding.severity === 'clear_contradiction'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {finding.severity.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {finding.conflict_type}
                  </span>
                </div>
              </div>

              {/* Conflicting Statements Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Statement A */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Document A
                    </span>
                    <span className="text-slate-500 font-medium">
                      Page {finding.statement_a.page_number}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900">
                    {finding.statement_a.document}
                  </div>
                  <div className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                    "{finding.statement_a.text}"
                  </div>
                </div>

                {/* Statement B */}
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      Document B
                    </span>
                    <span className="text-slate-500 font-medium">
                      Page {finding.statement_b.page_number}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900">
                    {finding.statement_b.document}
                  </div>
                  <div className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-slate-200/80">
                    "{finding.statement_b.text}"
                  </div>
                </div>
              </div>

              {/* Explanation Note */}
              <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold mr-1">Conflict Analysis:</span>
                {finding.explanation}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
