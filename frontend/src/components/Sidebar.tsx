import React from 'react';
import {
  LayoutDashboard,
  Files,
  Sparkles,
  MessageSquare,
  GitCompare,
  AlertTriangle,
  History,
  Settings,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { ActiveTab, HealthStatus } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  health: HealthStatus | null;
  docsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  health,
  docsCount,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'My Documents', icon: Files, badge: docsCount > 0 ? `${docsCount}` : undefined },
    { id: 'summarizer', label: 'AI Summarizer', icon: Sparkles },
    { id: 'ask', label: 'Ask Documents', icon: MessageSquare },
    { id: 'compare', label: 'Compare Documents', icon: GitCompare },
    { id: 'contradictions', label: 'Contradiction Detection', icon: AlertTriangle },
    { id: 'history', label: 'History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 select-none z-20 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            ContextIQ
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/30">
              RAG
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-medium">AI Document Intelligence</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Workspace
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status Pill at Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Ollama Model
          </span>
          <span className="text-slate-300 font-mono text-[11px]">llama3.2:3b</span>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                health?.ollama_status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[11px] text-slate-300">
              {health?.ollama_status === 'connected' ? 'System Ready' : 'Ollama Offline'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">ChromaDB</span>
        </div>
      </div>
    </aside>
  );
};
