import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FileCheck,
  AlertTriangle,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { api } from '../services/api';

interface UploadPageProps {
  documents: DocumentItem[];
  onRefresh: () => void;
}

interface UploadStatusItem {
  id: string;
  name: string;
  size: number;
  stage: 'uploading' | 'extracting' | 'embedding' | 'indexing' | 'ready' | 'error';
  message: string;
}

export const UploadPage: React.FC<UploadPageProps> = ({ documents, onRefresh }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadList, setUploadList] = useState<UploadStatusItem[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = async (files: File[]) => {
    const pdfFiles = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      alert('Please upload PDF documents only.');
      return;
    }

    const initialStatuses: UploadStatusItem[] = pdfFiles.map((f) => ({
      id: `${f.name}-${Date.now()}`,
      name: f.name,
      size: f.size,
      stage: 'uploading',
      message: 'Uploading document to server...',
    }));

    setUploadList((prev) => [...initialStatuses, ...prev]);
    setIsProcessing(true);

    try {
      // Step: Extracting & Embedding stages
      setTimeout(() => {
        setUploadList((prev) =>
          prev.map((item) =>
            item.stage === 'uploading'
              ? { ...item, stage: 'extracting', message: 'Extracting text with PyMuPDF...' }
              : item
          )
        );
      }, 700);

      setTimeout(() => {
        setUploadList((prev) =>
          prev.map((item) =>
            item.stage === 'extracting'
              ? { ...item, stage: 'embedding', message: 'Generating embeddings with all-MiniLM-L6-v2...' }
              : item
          )
        );
      }, 1500);

      const results = await api.uploadDocuments(pdfFiles);

      setUploadList((prev) =>
        prev.map((item) => {
          const match = results.find((r) => r.document_name === item.name);
          if (match && match.status === 'ready') {
            return {
              ...item,
              stage: 'ready',
              message: `Indexed ${match.chunk_count} chunks (${match.page_count} pages). Ready for AI analysis.`,
            };
          } else {
            return {
              ...item,
              stage: 'error',
              message: match?.message || 'Failed to process document.',
            };
          }
        })
      );

      onRefresh();
    } catch (err: any) {
      setUploadList((prev) =>
        prev.map((item) => ({
          ...item,
          stage: 'error',
          message: err.message || 'Error uploading files.',
        }))
      );
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (docName: string) => {
    try {
      await api.deleteDocument(docName);
      setDeleteConfirm(null);
      onRefresh();
    } catch (err: any) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Upload Drop Zone Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
        <div className="max-w-2xl mx-auto text-center">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf"
            className="hidden"
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/70 scale-[1.01]'
                : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50/60'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4 shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Drag and drop PDF documents here
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload multiple reports, papers, or contracts to index into ChromaDB
            </p>
            <button
              type="button"
              disabled={isProcessing}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20 transition-all"
            >
              Browse PDF Files
            </button>
            <div className="mt-4 text-[11px] text-slate-400">
              Preserves page numbers, source metadata, and text hierarchy
            </div>
          </div>
        </div>

        {/* Live Upload Progress Section */}
        {uploadList.length > 0 && (
          <div className="mt-8 border-t border-slate-100 pt-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Processing Pipeline
            </h4>
            <div className="space-y-2">
              {uploadList.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      <span className="text-slate-400 ml-2">({(item.size / 1024).toFixed(1)} KB)</span>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.message}</div>
                    </div>
                  </div>
                  <div>
                    {item.stage === 'ready' && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                      </span>
                    )}
                    {item.stage === 'error' && (
                      <span className="inline-flex items-center gap-1 text-rose-600 font-semibold bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Failed
                      </span>
                    )}
                    {['uploading', 'extracting', 'embedding', 'indexing'].includes(item.stage) && (
                      <span className="inline-flex items-center gap-1.5 text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Documents Library */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Indexed Document Repository
            </h3>
            <p className="text-xs text-slate-500">
              All documents currently stored in ChromaDB and accessible to the RAG pipeline
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
            {documents.length} Document{documents.length !== 1 ? 's' : ''}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            No indexed documents found. Upload a PDF above to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Document</th>
                  <th className="py-3 px-6">Pages</th>
                  <th className="py-3 px-6">Chunks</th>
                  <th className="py-3 px-6">Indexed Date</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 flex items-center gap-3">
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
                    <td className="py-4 px-6 text-slate-500">
                      {doc.upload_date ? new Date(doc.upload_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Indexed
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {deleteConfirm === doc.document_name ? (
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleDelete(doc.document_name)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs font-medium text-slate-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(doc.document_name)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          title="Remove document from ChromaDB"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
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
