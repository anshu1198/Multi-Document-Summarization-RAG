import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  UploadCloud,
  FileText,
  Search,
  Filter,
  Trash2,
  Sparkles,
  MessageSquareText,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Layers,
  ArrowUpDown,
  HardDrive,
  FileCheck2,
  X,
  ExternalLink,
} from 'lucide-react';
import { ActiveTab, DocumentItem, SourceCitation } from '../types';
import { api } from '../services/api';
import { getDocumentCategory, getCategoryMeta } from '../utils/categories';

interface DocumentsPageProps {
  documents: DocumentItem[];
  setActiveTab: (tab: ActiveTab) => void;
  onSelectDocumentForSummary: (docName: string) => void;
  onDeleteDocument: (docName: string) => void;
  onRefresh: () => void;
  onOpenCitation?: (citation: SourceCitation) => void;
}

interface UploadProgressItem {
  id: string;
  name: string;
  size: number;
  stage: 'validating' | 'extracting' | 'chunking' | 'embedding' | 'indexing' | 'ready' | 'error';
  message: string;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  documents,
  setActiveTab,
  onSelectDocumentForSummary,
  onDeleteDocument,
  onRefresh,
  onOpenCitation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<'name' | 'upload_date' | 'file_size' | 'chunk_count'>('upload_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadList, setUploadList] = useState<UploadProgressItem[]>([]);
  const [inspectDocChunks, setInspectDocChunks] = useState<{ docName: string; chunks: any[] } | null>(null);
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getDocName = (doc: DocumentItem) => doc.document_name || doc.name || '';

  // Filter & Sort
  const filteredDocs = documents
    .filter((doc) => {
      const docName = getDocName(doc);
      const matchesSearch =
        docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (doc.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const cat = getDocumentCategory(docName);
      const matchesCat = selectedCategory === 'all' || cat === selectedCategory;
      return matchesSearch && matchesCat;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = getDocName(a).localeCompare(getDocName(b));
      } else if (sortField === 'upload_date') {
        comparison = new Date(a.upload_date).getTime() - new Date(b.upload_date).getTime();
      } else if (sortField === 'file_size') {
        comparison = (a.file_size || 0) - (b.file_size || 0);
      } else if (sortField === 'chunk_count') {
        comparison = (a.chunk_count || 0) - (b.chunk_count || 0);
      }
      return sortAsc ? comparison : -comparison;
    });

  // Upload handler
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
    const validPdfs = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (validPdfs.length === 0) {
      alert('Please select valid PDF documents.');
      return;
    }

    const items: UploadProgressItem[] = validPdfs.map((f) => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      size: f.size,
      stage: 'validating',
      message: 'Validating PDF structure...',
    }));

    setUploadList(items);
    setIsProcessing(true);

    for (let i = 0; i < validPdfs.length; i++) {
      const file = validPdfs[i];
      const itemId = items[i].id;

      try {
        setUploadList((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, stage: 'extracting', message: 'Extracting text with PyMuPDF...' }
              : item
          )
        );

        setUploadList((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, stage: 'embedding', message: 'Generating embeddings with sentence-transformers...' }
              : item
          )
        );

        const res = await api.uploadDocuments([file]);
        const failedItem = Array.isArray(res) ? res.find((r: any) => r.status === 'failed') : null;

        if (failedItem) {
          setUploadList((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, stage: 'error', message: (failedItem as any).message || (failedItem as any).warning || 'Upload failed' }
                : item
            )
          );
        } else {
          setUploadList((prev) =>
            prev.map((item) =>
              item.id === itemId
                ? { ...item, stage: 'ready', message: 'Indexed in ChromaDB vector store' }
                : item
            )
          );
        }
      } catch (err: any) {
        setUploadList((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, stage: 'error', message: err.message || 'Processing failed' }
              : item
          )
        );
      }
    }

    setIsProcessing(false);
    onRefresh();
  };

  const handleInspectChunks = async (docName: string) => {
    setIsLoadingChunks(true);
    try {
      const res = await api.askQuestion('Overview and key topics', docName, 6);
      setInspectDocChunks({
        docName,
        chunks: res.sources || [],
      });
    } catch (err) {
      console.error('Failed to load chunks:', err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const categories = ['all', 'Research Paper', 'Technical Report', 'Project Documentation', 'Academic Notes'];

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center shrink-0 border border-[#7187E8]/20">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#202938]">My Documents</h2>
              <span className="text-[11px] font-bold text-[#7187E8] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full border border-[#7187E8]/20">
                {documents.length} Indexed
              </span>
            </div>
            <p className="text-xs text-[#858D9A] mt-1 max-w-xl">
              Manage your local knowledge base. All documents are chunked and embedded in ChromaDB for instant semantic search and multi-document synthesis.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setShowUploadDrawer(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#7187E8] hover:bg-[#5E75DE] rounded-xl shadow-sm shadow-[#7187E8]/30 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Documents
          </button>
        </div>
      </div>

      {/* Search, Filter Tabs & Sort Controls */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#7187E8] text-white shadow-sm'
                  : 'text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9]'
              }`}
            >
              {cat === 'all' ? 'All Documents' : cat}
            </button>
          ))}
        </div>

        {/* Search bar & Sort */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-[#858D9A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name..."
              className="w-full bg-[#F5F6F9] text-xs text-[#202938] placeholder-[#858D9A] pl-9 pr-4 py-2 rounded-xl border border-transparent focus:border-[#7187E8] focus:outline-none"
            />
          </div>

          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#858D9A] hover:text-[#202938] bg-[#F5F6F9] rounded-xl border border-[#E8EBF1]"
            title={`Sort ${sortAsc ? 'Ascending' : 'Descending'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sort</span>
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] shadow-sm overflow-hidden">
        {filteredDocs.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-[#858D9A] mx-auto mb-3 opacity-40" />
            <h3 className="text-sm font-bold text-[#202938]">No documents found</h3>
            <p className="text-xs text-[#858D9A] mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCategory !== 'all'
                ? 'Try clearing your search or category filters.'
                : 'Upload your first PDF document to start using ContextIQ.'}
            </p>
            <button
              onClick={() => setShowUploadDrawer(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#7187E8] hover:bg-[#5E75DE] rounded-xl shadow-sm"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload PDF
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E8EBF1] bg-[#F5F6F9] text-[11px] font-bold text-[#858D9A] uppercase tracking-wider">
                  <th className="py-3 px-6">Document Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EBF1] text-xs">
                {filteredDocs.map((doc) => {
                  const docName = getDocName(doc);
                  const category = getDocumentCategory(docName);
                  const meta = getCategoryMeta(category);

                  return (
                    <tr
                      key={docName}
                      className="hover:bg-[#F9FAFC] transition-colors group"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center shrink-0 border border-[#7187E8]/20">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#202938] truncate max-w-md" title={docName}>
                              {docName}
                            </div>
                            <div className="text-[11px] text-[#858D9A] flex items-center gap-2 mt-0.5">
                              <span>{doc.upload_date}</span>
                              {doc.is_scanned && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-medium">
                                  OCR Scanned
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.badgeText} ${meta.badgeBg} border ${meta.borderColor}`}>
                          {category}
                        </span>
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#858D9A] font-mono text-[11px]">
                        {formatFileSize(doc.file_size)}
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap text-[#858D9A]">
                        <span className="font-semibold text-[#202938] font-mono">{doc.chunk_count}</span> chunks
                      </td>

                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                          Indexed
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onSelectDocumentForSummary(docName)}
                            className="p-1.5 text-[#858D9A] hover:text-[#7187E8] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                            title="Generate Summary"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setActiveTab('ask');
                            }}
                            className="p-1.5 text-[#858D9A] hover:text-[#7187E8] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                            title="Ask Questions"
                          >
                            <MessageSquareText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleInspectChunks(docName)}
                            className="p-1.5 text-[#858D9A] hover:text-[#7187E8] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                            title="Inspect Chunks"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteDocument(docName)}
                            className="p-1.5 text-[#858D9A] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Drawer / Modal */}
      {showUploadDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E8EBF1] shadow-2xl max-w-xl w-full p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EBF1]">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center border border-[#7187E8]/20">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#202938]">Upload Documents</h3>
                  <p className="text-xs text-[#858D9A]">Add PDFs to the ContextIQ RAG Knowledge Base</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!isProcessing) {
                    setShowUploadDrawer(false);
                    setUploadList([]);
                  }
                }}
                disabled={isProcessing}
                className="p-1.5 text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#7187E8] bg-[#EEF2FF]'
                  : 'border-[#E8EBF1] bg-[#F5F6F9] hover:border-[#7187E8]/50 hover:bg-[#FAFAFE]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white text-[#7187E8] flex items-center justify-center mx-auto mb-3 shadow-sm border border-[#E8EBF1]">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-[#202938]">
                Click to browse or drag and drop PDF files
              </p>
              <p className="text-[11px] text-[#858D9A] mt-1">
                Supports research papers, technical reports, multi-page PDFs
              </p>
            </div>

            {/* Upload Progress List */}
            {uploadList.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <span className="text-[11px] font-bold text-[#858D9A] uppercase tracking-wider">
                  Pipeline Indexing Progress
                </span>
                {uploadList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#F5F6F9] rounded-xl border border-[#E8EBF1] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-[#7187E8] shrink-0" />
                      <div className="min-w-0">
                        <div className="font-bold text-[#202938] truncate max-w-xs">{item.name}</div>
                        <div className="text-[11px] text-[#858D9A]">{item.message}</div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {item.stage === 'ready' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : item.stage === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-[#7187E8] animate-spin" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8EBF1]">
              <button
                onClick={() => {
                  setShowUploadDrawer(false);
                  setUploadList([]);
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-bold text-[#858D9A] hover:text-[#202938] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspect Chunks Modal */}
      {inspectDocChunks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E8EBF1] shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8EBF1]">
              <div>
                <h3 className="text-sm font-bold text-[#202938] truncate max-w-md">
                  Vector Chunks: {inspectDocChunks.docName}
                </h3>
                <p className="text-[11px] text-[#858D9A]">
                  Top semantic segments stored in ChromaDB
                </p>
              </div>
              <button
                onClick={() => setInspectDocChunks(null)}
                className="p-1.5 text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {inspectDocChunks.chunks.length === 0 ? (
                <div className="text-xs text-[#858D9A] text-center py-8">
                  No chunk segments found.
                </div>
              ) : (
                inspectDocChunks.chunks.map((chunk, cIdx) => (
                  <div
                    key={cIdx}
                    className="p-4 bg-[#F5F6F9] rounded-xl border border-[#E8EBF1] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-[#858D9A]">
                      <span>Page {chunk.page_number} &bull; Chunk #{cIdx + 1}</span>
                      <span className="font-mono text-[#7187E8]">
                        Score: {chunk.score ? Math.round(chunk.score * 100) : 100}%
                      </span>
                    </div>
                    <p className="text-[#202938] text-xs leading-relaxed font-sans">
                      {chunk.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#E8EBF1] flex justify-end">
              <button
                onClick={() => setInspectDocChunks(null)}
                className="px-4 py-2 text-xs font-bold text-[#202938] bg-[#F5F6F9] hover:bg-[#EEF2FF] hover:text-[#7187E8] rounded-xl border border-[#E8EBF1]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentsPage;
