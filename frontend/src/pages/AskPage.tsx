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

    const aiMessageId = `ai-${Date.now()}`;
    const initialAiMessage: ChatMessage = {
      id: aiMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage, initialAiMessage]);
    setInputValue('');
    setIsLoading(true);
    setStatusMessage('Searching semantic vector index...');

    try {
      // Build conversation history for follow-ups
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      let accumulatedContent = '';

      await api.askQuestionStream(
        textToSend,
        selectedDoc === 'all' ? null : selectedDoc,
        4,
        0.1,
        historyPayload,
        {
          onStatus: (_stage, msg) => {
            setStatusMessage(msg);
          },
          onToken: (token) => {
            accumulatedContent += token;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId
                  ? { ...m, content: accumulatedContent, isStreaming: true }
                  : m
              )
            );
          },
          onDone: (data) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMessageId
                  ? {
                      ...m,
                      content: data.answer || accumulatedContent,
                      sources: data.sources,
                      latency: data.latency,
                      isStreaming: false,
                    }
                  : m
              )
            );
          },
          onError: async (err) => {
            // Fallback to non-streaming endpoint if streaming fails
            try {
              setStatusMessage('Retrying via standard endpoint...');
              const fallbackRes = await api.askQuestion(
                textToSend,
                selectedDoc === 'all' ? null : selectedDoc,
                4,
                0.1,
                historyPayload
              );
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMessageId
                    ? {
                        ...m,
                        content: fallbackRes.answer,
                        sources: fallbackRes.sources,
                        latency: fallbackRes.latency,
                        isStreaming: false,
                      }
                    : m
                )
              );
            } catch (fallbackErr: any) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === aiMessageId
                    ? {
                        ...m,
                        content: `Error: ${err.message || fallbackErr.message || 'Failed to retrieve or generate answer.'}`,
                        isError: true,
                        isStreaming: false,
                      }
                    : m
                )
              );
            }
          },
        }
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMessageId
            ? {
                ...m,
                content: `Error: ${err.message || 'Failed to communicate with ContextIQ backend.'}`,
                isError: true,
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([]);
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex gap-6 animate-in fade-in duration-200">
      {/* Left Settings & Prompts Panel */}
      <div className="w-72 bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-sm shrink-0">
        <div className="space-y-6">
          {/* Document Scope Filter */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Document Scope
            </label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">All Indexed Documents ({documents.length})</option>
              {documents.map((doc, idx) => (
                <option key={idx} value={doc.document_name}>
                  {doc.document_name}
                </option>
              ))}
            </select>
          </div>

          {/* Suggested Questions */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Suggested Questions
            </label>
            <div className="space-y-1.5">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  disabled={isLoading}
                  className="w-full text-left text-xs p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50/80 hover:text-indigo-600 border border-slate-200/70 text-slate-700 transition-colors flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="truncate">{q}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clear Conversation */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleClear}
            disabled={messages.length === 0}
            className="w-full flex items-center justify-center space-x-2 text-xs font-semibold py-2 px-3 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Conversation</span>
          </button>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Ask Questions Grounded in Context
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                ContextIQ retrieves source passages from ChromaDB, reranks them using neural Cross-Encoder models, and verifies each fact before streaming the answer.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestedQuestions.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors border border-slate-200"
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
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4.5 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm'
                      : msg.isError
                      ? 'bg-rose-50 text-rose-800 border border-rose-200 rounded-tl-sm'
                      : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-sm'
                  }`}
                >
                  {/* Assistant response body */}
                  {msg.role === 'assistant' ? (
                    <div>
                      {msg.content ? (
                        <MarkdownRenderer content={msg.content} />
                      ) : msg.isStreaming ? (
                        <div className="flex items-center gap-2 text-indigo-600 font-medium py-1">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{statusMessage || 'Retrieving context & generating answer...'}</span>
                        </div>
                      ) : null}

                      {/* Real-time Streaming Cursor */}
                      {msg.isStreaming && msg.content && (
                        <span className="inline-block w-1.5 h-3.5 bg-indigo-600 animate-pulse ml-0.5" />
                      )}
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-sans text-sm">{msg.content}</div>
                  )}

                  {/* Sources Badges */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/80">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Source Citations (Click to inspect passage):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src, idx) => (
                          <button
                            key={idx}
                            onClick={() => onOpenCitation(src)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-500" />
                            <span>
                              {src.document} — Page {src.page_number}
                            </span>
                            {src.score > 0 && (
                              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1 rounded">
                                {Math.round(src.score * 100)}%
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer: Latency Chip & Timestamp */}
                  <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-2">
                      <span>{msg.timestamp}</span>

                      {/* Performance Latency Badge */}
                      {msg.latency && msg.latency.total_ms > 0 && (
                        <div
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-mono text-[9px]"
                          title={`Retrieval: ${msg.latency.retrieval_ms}ms | Rerank: ${msg.latency.reranking_ms}ms | LLM: ${msg.latency.generation_ms}ms`}
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-500" />
                          <span>{(msg.latency.total_ms / 1000).toFixed(2)}s</span>
                          <span className="opacity-60">
                            (Retr: {msg.latency.retrieval_ms}ms · LLM: {(msg.latency.generation_ms / 1000).toFixed(1)}s)
                          </span>
                        </div>
                      )}
                    </div>

                    {msg.role === 'assistant' && !msg.isError && msg.content && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-indigo-600 flex items-center gap-1 ml-4 transition-colors"
                        title="Copy answer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200/80">
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
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl text-xs font-semibold shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
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
