import React, { useState, useEffect } from 'react';
import {
  Network,
  Share2,
  FileText,
  Sparkles,
  Search,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  Tag,
  RefreshCw,
  Loader2,
  AlertCircle,
  Database,
  Hash,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { DocumentItem, ContextExplorationResult, ContextRelationship, ContextGroup, CrossDocConcept } from '../types';
import { api } from '../services/api';
import { getDocumentCategory, getCategoryMeta } from '../utils/categories';

interface ContextExplorerPageProps {
  documents: DocumentItem[];
}

export const ContextExplorerPage: React.FC<ContextExplorerPageProps> = ({ documents }) => {
  const [data, setData] = useState<ContextExplorationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'relationships' | 'groups' | 'concepts'>('relationships');
  const [selectedRelationship, setSelectedRelationship] = useState<ContextRelationship | null>(null);

  const fetchContextGraph = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getContextExploration();
      setData(res);
      if (res.relationships && res.relationships.length > 0) {
        setSelectedRelationship(res.relationships[0]);
      }
    } catch (err: any) {
      console.error('Failed to load context exploration:', err);
      setError(err.message || 'Failed to analyze cross-document context.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContextGraph();
  }, []);

  // Filtered relationships
  const filteredRelationships = (data?.relationships || []).filter((rel) => {
    if (selectedDocFilter !== 'all') {
      if (rel.source_1 !== selectedDocFilter && rel.source_2 !== selectedDocFilter) {
        return false;
      }
    }
    if (selectedConcept) {
      if (!rel.shared_terms.map(t => t.toLowerCase()).includes(selectedConcept.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="bg-white rounded-2xl border border-[#E8EBF1] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center shrink-0 border border-[#7187E8]/20">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#202938]">Context Explorer</h2>
              <span className="text-[11px] font-bold text-[#7187E8] bg-[#EEF2FF] px-2.5 py-0.5 rounded-full border border-[#7187E8]/20">
                Lexical & Semantic Overlap
              </span>
            </div>
            <p className="text-xs text-[#858D9A] mt-1 max-w-2xl">
              Inspect how your documents connect under the hood: discover shared terminology, cross-document semantic clusters, and citation linkages computed by the ContextIQ RAG awareness engine.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={fetchContextGraph}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#202938] bg-[#F5F6F9] hover:bg-[#EEF2FF] hover:text-[#7187E8] rounded-xl border border-[#E8EBF1] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Graph
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#E8EBF1] p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858D9A]">Indexed Corpus</span>
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#202938] mt-2">
            {data?.total_documents ?? documents.length}
          </div>
          <div className="text-[11px] text-[#858D9A] mt-0.5">Documents analyzed</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EBF1] p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858D9A]">Cross-Doc Links</span>
            <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] text-[#16A34A] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#202938] mt-2">
            {data?.relationships_count ?? 0}
          </div>
          <div className="text-[11px] text-[#858D9A] mt-0.5">Discovered overlap links</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EBF1] p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858D9A]">Topical Clusters</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#202938] mt-2">
            {data?.context_groups?.length ?? 0}
          </div>
          <div className="text-[11px] text-[#858D9A] mt-0.5">Connected context groups</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8EBF1] p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#858D9A]">Sampled Chunks</span>
            <div className="w-7 h-7 rounded-lg bg-[#FFF7ED] text-[#EA580C] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#202938] mt-2">
            {data?.total_sampled_chunks ?? 0}
          </div>
          <div className="text-[11px] text-[#858D9A] mt-0.5">ChromaDB semantic nodes</div>
        </div>
      </div>

      {/* Main Content: Concepts Bar + View Switcher + Graph Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cross-Doc Concepts & Filter (1/3) */}
        <div className="space-y-6">
          {/* Shared Concepts Cloud */}
          <div className="bg-white rounded-2xl border border-[#E8EBF1] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#7187E8]" />
                <h3 className="text-sm font-bold text-[#202938]">Cross-Doc Concepts</h3>
              </div>
              {selectedConcept && (
                <button
                  onClick={() => setSelectedConcept(null)}
                  className="text-[11px] font-semibold text-[#7187E8] hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#858D9A] mb-3 leading-relaxed">
              Keywords and domain entities appearing across multiple separate documents in the knowledge base:
            </p>

            {isLoading ? (
              <div className="py-8 flex flex-col items-center justify-center text-[#858D9A]">
                <Loader2 className="w-5 h-5 animate-spin mb-2" />
                <span className="text-xs">Extracting concepts...</span>
              </div>
            ) : !data?.cross_document_concepts || data.cross_document_concepts.length === 0 ? (
              <div className="text-xs text-[#858D9A] text-center py-6 bg-[#F5F6F9] rounded-xl border border-dashed border-[#E8EBF1]">
                No cross-document overlap detected yet. Upload more documents to analyze connections.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-72 overflow-y-auto pr-1">
                {data.cross_document_concepts.map((concept, idx) => {
                  const isSelected = selectedConcept === concept.term;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedConcept(isSelected ? null : concept.term)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-[#7187E8] text-white shadow-sm shadow-[#7187E8]/20'
                          : 'bg-[#F5F6F9] hover:bg-[#EEF2FF] text-[#202938] hover:text-[#7187E8] border border-[#E8EBF1]'
                      }`}
                    >
                      <span>{concept.term}</span>
                      <span
                        className={`text-[10px] px-1 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-white text-[#858D9A]'
                        }`}
                      >
                        {concept.doc_count} docs
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Document Isolation Filter */}
          <div className="bg-white rounded-2xl border border-[#E8EBF1] p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#202938] mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#7187E8]" />
              Filter by Source Document
            </h3>
            <p className="text-[11px] text-[#858D9A] mb-3">
              Isolate links connected to a specific document:
            </p>

            <select
              value={selectedDocFilter}
              onChange={(e) => setSelectedDocFilter(e.target.value)}
              className="w-full bg-[#F5F6F9] text-xs font-semibold text-[#202938] px-3.5 py-2.5 rounded-xl border border-[#E8EBF1] focus:outline-none focus:border-[#7187E8]"
            >
              <option value="all">All Documents ({documents.length})</option>
              {documents.map((doc) => {
                const docName = doc.document_name || doc.name || '';
                return (
                  <option key={docName} value={docName}>
                    {docName}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Right Columns: Tabbed Views (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Sub-Tabs */}
          <div className="bg-white rounded-2xl border border-[#E8EBF1] p-1.5 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setActiveTab('relationships')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'relationships'
                    ? 'bg-[#7187E8] text-white shadow-sm'
                    : 'text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9]'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                Cross-Document Links ({filteredRelationships.length})
              </button>

              <button
                onClick={() => setActiveTab('groups')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTab === 'groups'
                    ? 'bg-[#7187E8] text-white shadow-sm'
                    : 'text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9]'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Context Groups ({data?.context_groups?.length ?? 0})
              </button>
            </div>

            {selectedConcept && (
              <span className="text-xs text-[#7187E8] font-semibold bg-[#EEF2FF] px-3 py-1 rounded-lg border border-[#7187E8]/20 mr-2">
                Filtering by: "{selectedConcept}"
              </span>
            )}
          </div>

          {/* Tab 1: Relationships View */}
          {activeTab === 'relationships' && (
            <div className="space-y-4">
              {isLoading ? (
                <div className="bg-white rounded-2xl border border-[#E8EBF1] p-12 text-center text-[#858D9A]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#7187E8] mx-auto mb-3" />
                  <p className="text-sm font-semibold text-[#202938]">Analyzing document graph...</p>
                  <p className="text-xs text-[#858D9A] mt-1">
                    Extracting token overlap & semantic affinities between chunks in ChromaDB
                  </p>
                </div>
              ) : error ? (
                <div className="bg-white rounded-2xl border border-red-200 p-6 text-red-600 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-semibold">{error}</span>
                </div>
              ) : filteredRelationships.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8EBF1] p-12 text-center">
                  <Network className="w-10 h-10 text-[#858D9A] mx-auto mb-3 opacity-50" />
                  <h4 className="text-sm font-bold text-[#202938]">No matching relationships</h4>
                  <p className="text-xs text-[#858D9A] mt-1 max-w-sm mx-auto">
                    Try clearing the concept or document filters, or upload additional documents that discuss related subject matter.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRelationships.map((rel, idx) => {
                    const isSelected =
                      selectedRelationship?.chunk_id_1 === rel.chunk_id_1 &&
                      selectedRelationship?.chunk_id_2 === rel.chunk_id_2;

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedRelationship(rel)}
                        className={`bg-white rounded-2xl border p-5 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                          isSelected
                            ? 'border-[#7187E8] ring-2 ring-[#7187E8]/10 bg-[#FAFAFE]'
                            : 'border-[#E8EBF1] hover:border-[#7187E8]/40'
                        }`}
                      >
                        {/* Header: Sources & Similarity Score */}
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-xs font-bold text-[#202938] truncate max-w-[180px] sm:max-w-xs">
                              {rel.source_1}
                            </span>
                            <span className="text-[10px] text-[#858D9A] bg-[#F5F6F9] px-1.5 py-0.5 rounded font-mono">
                              p.{rel.page_1}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-[#7187E8] shrink-0" />
                            <span className="text-xs font-bold text-[#202938] truncate max-w-[180px] sm:max-w-xs">
                              {rel.source_2}
                            </span>
                            <span className="text-[10px] text-[#858D9A] bg-[#F5F6F9] px-1.5 py-0.5 rounded font-mono">
                              p.{rel.page_2}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#858D9A]">
                              Similarity
                            </span>
                            <span className="text-xs font-extrabold text-[#7187E8] bg-[#EEF2FF] px-2 py-0.5 rounded-md border border-[#7187E8]/20 font-mono">
                              {Math.round(rel.similarity * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Shared terms tags */}
                        {rel.shared_terms && rel.shared_terms.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-[#858D9A] font-medium mr-1">
                              Shared terms:
                            </span>
                            {rel.shared_terms.map((term, tIdx) => (
                              <span
                                key={tIdx}
                                className="text-[11px] font-semibold text-[#202938] bg-[#F5F6F9] px-2 py-0.5 rounded border border-[#E8EBF1]"
                              >
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Context Groups View */}
          {activeTab === 'groups' && (
            <div className="space-y-4">
              {!data?.context_groups || data.context_groups.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#E8EBF1] p-12 text-center">
                  <Layers className="w-10 h-10 text-[#858D9A] mx-auto mb-3 opacity-50" />
                  <h4 className="text-sm font-bold text-[#202938]">No context groups detected</h4>
                  <p className="text-xs text-[#858D9A] mt-1">
                    Context groups form when multiple chunks across documents share strong topical affinities.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.context_groups.map((group) => (
                    <div
                      key={group.group_id}
                      className="bg-white rounded-2xl border border-[#E8EBF1] p-5 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-[#FAF5FF] text-[#9333EA] flex items-center justify-center font-bold text-xs">
                            #{group.group_id}
                          </div>
                          <span className="text-xs font-bold text-[#202938]">
                            Topical Cluster #{group.group_id}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-[#858D9A] bg-[#F5F6F9] px-2 py-0.5 rounded-full">
                          {group.chunk_ids.length} chunks
                        </span>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-[#858D9A]">
                          Connected Documents:
                        </span>
                        <div className="flex flex-col gap-1">
                          {group.sources.map((src, sIdx) => (
                            <div
                              key={sIdx}
                              className="text-xs text-[#202938] bg-[#F5F6F9] px-2.5 py-1.5 rounded-lg border border-[#E8EBF1] flex items-center justify-between"
                            >
                              <span className="truncate">{src}</span>
                              <span className="text-[10px] text-[#858D9A] font-mono shrink-0 ml-2">
                                {group.pages[sIdx] ? `p.${group.pages[sIdx]}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextExplorerPage;
