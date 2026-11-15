import React from 'react';
import { X, FileText, Bookmark, Copy, Check } from 'lucide-react';
import { SourceCitation } from '../types';

interface ChunkModalProps {
  citation: SourceCitation | null;
  onClose: () => void;
}

export const ChunkModal: React.FC<ChunkModalProps> = ({ citation, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(citation.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">
                {citation.document}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Page {citation.page_number} • Chunk ID: {citation.chunk_id || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
            <span className="flex items-center gap-1.5 font-medium">
              <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
              Relevance / Score:
            </span>
            <span className="font-mono font-semibold text-slate-800">
              {citation.score !== undefined ? citation.score.toFixed(4) : 'N/A'}
            </span>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Retrieved Passage Content
            </div>
            <div className="bg-slate-50/60 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-wrap selection:bg-indigo-100">
              {citation.text}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Verified ground-truth context from ChromaDB
          </span>
          <div className="flex space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:border-indigo-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Passage'}</span>
            </button>
            <button
              onClick={onClose}
              className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
