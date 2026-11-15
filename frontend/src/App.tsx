import React, { useState, useEffect, useCallback } from 'react';
import { ActiveTab, HealthStatus, DashboardMetrics, DocumentItem, SourceCitation } from './types';
import { api } from './services/api';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChunkModal } from './components/ChunkModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { AskPage } from './pages/AskPage';
import { SummarizerPage } from './pages/SummarizerPage';
import { ComparePage } from './pages/ComparePage';
import { ContradictionPage } from './pages/ContradictionPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeCitation, setActiveCitation] = useState<SourceCitation | null>(null);
  const [preselectedDocForSummary, setPreselectedDocForSummary] = useState<string | null>(null);

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
    // Periodic light polling every 45s
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'summarizer') setPreselectedDocForSummary(null);
        }}
        health={health}
        docsCount={documents.length}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          health={health}
          onRefresh={loadData}
          isRefreshing={isRefreshing}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'dashboard' && (
            <DashboardPage
              metrics={metrics}
              documents={documents}
              setActiveTab={setActiveTab}
              onSelectDocumentForSummary={handleSelectDocForSummary}
              onDeleteDocument={handleDeleteDocument}
            />
          )}

          {activeTab === 'upload' && (
            <UploadPage documents={documents} onRefresh={loadData} />
          )}

          {activeTab === 'ask' && (
            <AskPage
              documents={documents}
              onOpenCitation={(citation) => setActiveCitation(citation)}
            />
          )}

          {activeTab === 'summarizer' && (
            <SummarizerPage
              documents={documents}
              preselectedDoc={preselectedDocForSummary}
            />
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

      {/* Expandable Chunk Citation Modal */}
      <ChunkModal
        citation={activeCitation}
        onClose={() => setActiveCitation(null)}
      />
    </div>
  );
};

export default App;
