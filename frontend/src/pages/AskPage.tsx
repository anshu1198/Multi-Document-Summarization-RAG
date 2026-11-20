import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  FileText,
  RotateCcw,
  Loader2,
  ChevronRight,
  Clock,
  Zap,
  Layers,
  Filter,
} from 'lucide-react';
import { ChatMessage, DocumentItem, SourceCitation } from '../types';
import { api } from '../services/api';
import { MarkdownRenderer } from '../components/MarkdownRenderer';

interface AskPageProps {
  documents: DocumentItem[];
  onOpenCitation: (citation: SourceCitation) => void;
}

export const AskPage: React.FC<AskPageProps> = ({ documents, onOpenCitation }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'What is this document about?',
    'What is the internship duration?',
    'Which company is mentioned?',
    'What are the key findings?',
    'What are the important dates mentioned?',
    'Explain the project in simple language.',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, statusMessage]);

  const handleSend = async (questionText?: string) => {
    const textToSend = questionText || inputValue.trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const assistantId = `asst-${Date.now()}`;
    const initialAssistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      sources: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInputValue('');
    setIsLoading(true);
    setStatusMessage('Searching knowledge base...');

    const filterDoc = selectedDoc === 'all' ? null : selectedDoc;

    await api.askQuestionStream(
      textToSend,
      filterDoc,
      4,
      0.1,
      null,
      {
        onStatus: (_stage, message) => {
          setStatusMessage(message);
        },
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: msg.content + token } : msg
            )
          );
        },
        onDone: (data) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: data.answer || msg.content,
                    sources: data.sources || [],
                    latency: data.latency,
                    isStreaming: false,
                  }
                : msg
            )
          );
          setIsLoading(false);
          setStatusMessage('');
        },
        onError: (err) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: `Error: ${err.message}`,
                    isStreaming: false,
                    isError: true,
                  }
                : msg
            )
          );
          setIsLoading(false);
          setStatusMessage('');
        },
      }
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    if (window.confirm('Clear conversation history?')) {
      setMessages([]);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Left Sidebar: Controls & Suggested Questions (1/3) */}
      <div className="w-80 bg-white rounded-2xl border border-[#E8EBF1] p-5 shadow-sm flex flex-col justify-between shrink-0 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-3 pb-4 border-b border-[#E8EBF1]">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] text-[#7187E8] flex items-center justify-center border border-[#7187E8]/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202938]">Ask Documents</h2>
              <p className="text-[11px] text-[#858D9A]">Context-grounded QA</p>
            </div>
          </div>

          {/* Scope Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#858D9A] block mb-2 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-[#7187E8]" />
              Document Scope
            </label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full text-xs font-semibold bg-[#F5F6F9] border border-[#E8EBF1] rounded-xl px-3 py-2.5 text-[#202938] focus:outline-none focus:border-[#7187E8]"
            >
              <option value="all">All Indexed Documents ({documents.length})</option>
              {documents.map((doc, idx) => {
                const docName = doc.document_name || doc.name || '';
                return (
                  <option key={idx} value={docName}>
                    {docName}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Suggested Questions */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-[#858D9A] block mb-2">
              Suggested Questions
            </label>
            <div className="space-y-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="w-full text-left text-xs p-2.5 rounded-xl bg-[#F5F6F9] hover:bg-[#EEF2FF] hover:text-[#7187E8] border border-[#E8EBF1] text-[#202938] transition-colors flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="truncate">{q}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#858D9A] group-hover:text-[#7187E8] shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Conversation */}
        <div className="pt-4 border-t border-[#E8EBF1]">
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="w-full flex items-center justify-center space-x-2 text-xs font-semibold py-2 px-3 text-[#858D9A] hover:text-red-600 hover:bg-red-50 rounded-xl border border-[#E8EBF1] transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Conversation</span>
          </button>
        </div>
      </div>

      {/* Main Chat Interface (2/3) */}
      <div className="flex-1 bg-white rounded-2xl border border-[#E8EBF1] shadow-sm flex flex-col overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] border border-[#7187E8]/20 flex items-center justify-center text-[#7187E8] mb-4 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-[#202938] mb-1">
                Ask Questions Grounded in Context
              </h3>
              <p className="text-xs text-[#858D9A] mb-6 leading-relaxed">
                ContextIQ retrieves source passages from ChromaDB, reranks them using neural Cross-Encoder models, and verifies each fact before streaming the answer.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#F5F6F9] hover:bg-[#EEF2FF] hover:text-[#7187E8] text-[#202938] transition-colors border border-[#E8EBF1]"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-[#7187E8] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#7187E8] text-white rounded-tr-sm shadow-sm'
                      : msg.isError
                      ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-sm'
                      : 'bg-[#F5F6F9] text-[#202938] border border-[#E8EBF1] rounded-tl-sm'
                  }`}
                >
                  {/* ── Message body ───────────────────────────────────────── */}
                  <div className="px-4 pt-3.5 pb-1">
                    {msg.role === 'assistant' ? (
                      <div>
                        {msg.content ? (
                          <MarkdownRenderer content={msg.content} />
                        ) : msg.isStreaming ? (
                          <div className="flex items-center gap-2 text-[#7187E8] font-medium py-1">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>{statusMessage || 'Retrieving context & generating answer...'}</span>
                          </div>
                        ) : null}
                        {msg.isStreaming && msg.content && (
                          <span className="inline-block w-1.5 h-3.5 bg-[#7187E8] animate-pulse ml-0.5" />
                        )}
                      </div>
                    ) : (
                      /* User bubble: plain text, wraps naturally, no overflow clipping */
                      <p className="whitespace-pre-wrap break-words text-sm font-medium leading-snug">
                        {msg.content}
                      </p>
                    )}
                  </div>

                  {/* ── Source citations (assistant only) ─────────────────── */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mx-4 mb-1 mt-3 pt-3 border-t border-[#E8EBF1]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#858D9A] mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3 text-[#7187E8]" />
                        Source Citations (Click to inspect passage):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, idx) => (
                          <button
                            key={idx}
                            onClick={() => onOpenCitation(src)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-[#E8EBF1] hover:border-[#7187E8] hover:text-[#7187E8] text-[#202938] text-xs font-semibold shadow-xs transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#7187E8]" />
                            <span className="truncate max-w-[200px]">
                              {src.document} — Page {src.page_number}
                            </span>
                            {src.score > 0 && (
                              <span className="text-[10px] text-green-700 bg-green-50 px-1 rounded font-mono">
                                {Math.round(src.score * 100)}%
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Footer: timestamp + latency + copy ────────────────── */}
                  <div
                    className={`px-4 pb-2.5 pt-1.5 flex items-center justify-between text-[10px] gap-2 ${
                      msg.role === 'user'
                        ? 'text-white/60'
                        : 'text-[#858D9A] border-t border-[#E8EBF1]/60 mt-1'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{msg.timestamp}</span>
                      {msg.latency && msg.latency.total_ms > 0 && (
                        <div
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] ${
                            msg.role === 'user'
                              ? 'bg-white/20 text-white'
                              : 'bg-[#E8EBF1]/80 text-[#202938]'
                          }`}
                          title={`Retrieval: ${msg.latency.retrieval_ms}ms | Rerank: ${msg.latency.reranking_ms}ms | LLM: ${msg.latency.generation_ms}ms`}
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>{(msg.latency.total_ms / 1000).toFixed(2)}s</span>
                          <span className="opacity-70">
                            (Retr: {msg.latency.retrieval_ms}ms · LLM: {(msg.latency.generation_ms / 1000).toFixed(1)}s)
                          </span>
                        </div>
                      )}
                    </div>

                    {msg.role === 'assistant' && !msg.isError && msg.content && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-[#7187E8] flex items-center gap-1 ml-auto transition-colors shrink-0"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-green-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-[#202938] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-[#F5F6F9] border-t border-[#E8EBF1]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about the uploaded documents (e.g., 'What is the internship duration?')..."
              disabled={isLoading}
              className="flex-1 bg-white border border-[#E8EBF1] rounded-xl px-4 py-3 text-xs text-[#202938] placeholder:text-[#858D9A] focus:outline-none focus:border-[#7187E8] shadow-xs"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-[#7187E8] hover:bg-[#5E75DE] disabled:opacity-40 text-white px-5 py-3 rounded-xl text-xs font-bold shadow-sm shadow-[#7187E8]/20 flex items-center gap-1.5 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? 'Thinking...' : 'Send'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AskPage;
