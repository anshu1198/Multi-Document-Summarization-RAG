import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  MessageSquareText,
  Network,
  GitCompare,
  History,
  Settings,
  Database,
  CheckCircle2,
  AlertCircle,
  FileText,
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
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'documents', label: 'My Documents', icon: FolderOpen, badge: docsCount > 0 ? `${docsCount}` : undefined },
    { id: 'summarizer', label: 'MultiDoc Summarizer', icon: Sparkles },
    { id: 'ask', label: 'Ask Documents', icon: MessageSquareText },
    { id: 'context', label: 'Context Explorer', icon: Network },
    { id: 'compare', label: 'Document Comparison', icon: GitCompare },
    { id: 'history', label: 'Summary History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isItemActive = (id: ActiveTab) => {
    if (activeTab === id) return true;
    if (id === 'overview' && activeTab === 'dashboard') return true;
    if (id === 'documents' && activeTab === 'upload') return true;
    return false;
  };

  return (
    <aside className="w-60 bg-white border-r border-[#E8EBF1] flex flex-col justify-between select-none z-20 shrink-0 h-full">
      {/* Top Branding & Navigation */}
      <div>
        {/* ContextIQ Brand Logo */}
        <div className="px-6 py-6 border-b border-[#F0F2F7] flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-[#7187E8] text-white flex items-center justify-center shadow-sm shadow-[#7187E8]/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-[#202938] tracking-tight flex items-center gap-1.5">
              ContextIQ
              <span className="text-[9px] font-bold tracking-wider text-[#7187E8] bg-[#EEF2FF] px-1.5 py-0.5 rounded-md border border-[#7187E8]/20">
                PRO
              </span>
            </div>
            <div className="text-[10px] text-[#858D9A] font-medium leading-none mt-0.5">
              MultiDoc Intelligence
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="px-3 py-5">
          <div className="px-3 pb-2.5 text-[10px] font-bold uppercase tracking-wider text-[#858D9A]">
            Menu
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group ${
                    active
                      ? 'bg-[#EEF2FF] text-[#7187E8] font-semibold'
                      : 'text-[#5A6474] hover:text-[#202938] hover:bg-[#F5F6F9]'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        active ? 'text-[#7187E8]' : 'text-[#858D9A] group-hover:text-[#202938]'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        active ? 'bg-[#7187E8] text-white' : 'bg-[#E8EBF1] text-[#5A6474]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Area: Storage & Model Status & User Profile */}
      <div className="p-4 border-t border-[#F0F2F7] space-y-3 bg-[#FAFBFD]">
        {/* Storage / Index Overview Mini Widget */}
        <div className="p-3 bg-white border border-[#E8EBF1] rounded-xl shadow-xs">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-[#858D9A] font-medium flex items-center gap-1">
              <Database className="w-3 h-3 text-[#7187E8]" />
              Index Storage
            </span>
            <span className="text-[#202938] font-semibold text-[10px]">
              {docsCount} Docs
            </span>
          </div>
          <div className="w-full bg-[#E8EBF1] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#7187E8] h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.max(15, docsCount * 25))}%` }}
            />
          </div>
          <div className="text-[10px] text-[#858D9A] mt-1.5 flex items-center justify-between">
            <span>Vector Engine</span>
            <span className="font-semibold text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> Ready
            </span>
          </div>
        </div>

        {/* User Workspace Profile */}
        <div className="flex items-center space-x-2.5 pt-1 px-1">
          <div className="w-8 h-8 rounded-full bg-[#EEF2FF] border border-[#7187E8]/30 text-[#7187E8] flex items-center justify-center font-bold text-xs">
            AS
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-[#202938] truncate">
              Anshu Sharma
            </div>
            <div className="text-[10px] text-[#858D9A] truncate">
              AI Document Workspace
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
