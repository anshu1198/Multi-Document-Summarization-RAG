import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ActiveTab, HealthStatus, DashboardMetrics, DocumentItem, SourceCitation } from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChunkModal } from './components/ChunkModal';

// Redesigned Inkw ise-inspired Enterprise Pages
import { OverviewPage } from './pages/OverviewPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { MultiDocSummarizerPage } from './pages/MultiDocSummarizerPage';
import { AskPage } from './pages/AskPage';
import { ContextExplorerPage } from './pages/ContextExplorerPage';
import { ComparePage } from './pages/ComparePage';
import { ContradictionPage } from './pages/ContradictionPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

// Upload Modal Component for global Header action
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';

interface UploadProgressItem {
  id: string;
  name: string;
  size: number;
  stage: 'validating' | 'extracting' | 'embedding' | 'ready' | 'error';
  message: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);
  const [preselectedDocForSummary, setPreselectedDocForSummary] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Global Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadList, setUploadList] = useState<UploadProgressItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [h, m, d] = await Promise.allSettled([
        api.getHealth(),
        api.getMetrics(),
        api.getDocuments(),
      ]);

      if (h.status === 'fulfilled') setHealth(h.value);
      if (m.status === 'fulfilled') setMetrics(m.value);
      if (d.status === 'fulfilled') setDocuments(d.value.documents || []);
    } catch (err) {
      console.error('Error fetching workspace data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Light polling every 45s
    const interval = setInterval(loadData, 45000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleDeleteDocument = async (docName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${docName}" from the vector store?`)) {
      return;
    }
    try {
      await api.deleteDocument(docName);
      await loadData();
    } catch (err: any) {
      alert(`Error deleting document: ${err.message}`);
    }
  };

  const handleSelectDocForSummary = (docName: string) => {
    setPreselectedDocForSummary(docName);
    setActiveTab('summarizer');
  };

  // Upload handler for global modal
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
    loadData();
  };

  return (
    // Outer Container: Soft periwinkle/lavender blue (#EDF1F9) with smooth padding
    <div className="h-screen w-screen bg-[#EDF1F9] p-2.5 sm:p-3.5 lg:p-4.5 flex flex-col font-sans text-[#202938] antialiased select-none overflow-hidden">
      {/* Large Rounded Application Workspace Surface */}
      <div className="flex-1 bg-white rounded-[26px] lg:rounded-[30px] border border-[#E8EBF1] shadow-[0_10px_35px_rgba(32,41,56,0.06)] flex overflow-hidden">
        {/* Compact Vertical Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (tab !== 'summarizer') setPreselectedDocForSummary(null);
          }}
          health={health}
          docsCount={documents.length}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white">
          {/* Top Header */}
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            health={health}
            onRefresh={loadData}
            isRefreshing={isRefreshing}
            onOpenUploadModal={() => setIsUploadModalOpen(true)}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />

          {/* Main Content Surfaces: Soft Light Grey Background */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8 bg-[#F5F6F9]/60">
            {(activeTab === 'overview' || activeTab === 'dashboard') && (
              <OverviewPage
                metrics={metrics}
                documents={documents}
                setActiveTab={setActiveTab}
                onSelectDocumentForSummary={handleSelectDocForSummary}
                onDeleteDocument={handleDeleteDocument}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                searchFilter={searchQuery}
              />
            )}

            {(activeTab === 'documents' || activeTab === 'upload') && (
              <DocumentsPage
                documents={documents}
                setActiveTab={setActiveTab}
                onSelectDocumentForSummary={handleSelectDocForSummary}
                onDeleteDocument={handleDeleteDocument}
                onRefresh={loadData}
                onOpenCitation={(citation) => setActiveCitation(citation)}
              />
            )}

            {activeTab === 'summarizer' && (
              <MultiDocSummarizerPage
                documents={documents}
                preselectedDoc={preselectedDocForSummary}
                onOpenCitation={(citation) => setActiveCitation(citation)}
              />
            )}

            {activeTab === 'ask' && (
              <AskPage
                documents={documents}
                onOpenCitation={(citation) => setActiveCitation(citation)}
              />
            )}

            {activeTab === 'context' && (
              <ContextExplorerPage documents={documents} />
            )}

            {activeTab === 'compare' && (
              <ComparePage documents={documents} />
            )}

            {activeTab === 'contradictions' && (
              <ContradictionPage documents={documents} />
            )}

            {activeTab === 'history' && <HistoryPage />}

            {activeTab === 'settings' && (
              <SettingsPage health={health} onRefresh={loadData} />
            )}
          </main>
        </div>
      </div>

      {/* Global Upload Documents Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl border border-[#E8EBF1] shadow-2xl max-w-xl w-full p-6 space-y-5">
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
                    setIsUploadModalOpen(false);
                    setUploadList([]);
                  }
                }}
                disabled={isProcessing}
                className="p-1.5 text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8EBF1]">
              <button
                onClick={() => {
                  setIsUploadModalOpen(false);
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

      {/* Expandable Chunk Citation Modal */}
      <ChunkModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};

export default App;
