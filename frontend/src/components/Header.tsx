import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  UploadCloud,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { ActiveTab, HealthStatus } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  health: HealthStatus | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenUploadModal?: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  health,
  onRefresh,
  isRefreshing,
  onOpenUploadModal,
  searchQuery = '',
  setSearchQuery,
}) => {
  const [hasUnread, setHasUnread] = useState(true);

  // Dynamic greeting based on current local hour
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning!' : hour < 18 ? 'Good afternoon!' : 'Good evening!';
  const formattedDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="h-20 bg-white border-b border-[#E8EBF1] px-6 lg:px-8 flex items-center justify-between z-10 shrink-0">
      {/* Left: Greeting & Subtitle */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <h1 className="text-lg lg:text-xl font-extrabold text-[#202938] tracking-tight">
            {greeting}
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-[#858D9A] bg-[#F5F6F9] px-2.5 py-0.5 rounded-full border border-[#E8EBF1]">
            <Calendar className="w-3 h-3 text-[#7187E8]" />
            {formattedDate}
          </span>
        </div>
        <p className="text-xs text-[#858D9A] font-medium mt-0.5">
          Your documents, connected intelligently.
        </p>
      </div>

      {/* Center: Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[#858D9A] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
            placeholder="Search documents, summaries, cross-doc concepts..."
            className="w-full bg-[#F5F6F9] hover:bg-[#F0F2F7] focus:bg-white text-xs text-[#202938] placeholder-[#858D9A] pl-9 pr-4 py-2.5 rounded-xl border border-transparent focus:border-[#7187E8] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Right: Actions, Notifications, & Profile */}
      <div className="flex items-center space-x-2.5 lg:space-x-3">
        {/* Refresh Data Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Data"
          className="p-2 text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9] rounded-xl border border-[#E8EBF1] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#7187E8]' : ''}`} />
        </button>

        {/* System Status Pill */}
        <div
          className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border ${
            health?.ollama_status === 'connected'
              ? 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]'
              : 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
          }`}
        >
          {health?.ollama_status === 'connected' ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          )}
          <span>{health?.ollama_status === 'connected' ? 'Llama 3.2:3b Ready' : 'Ollama Offline'}</span>
        </div>

        {/* Upload Documents Button */}
        <button
          onClick={() => {
            if (onOpenUploadModal) {
              onOpenUploadModal();
            } else {
              setActiveTab('documents');
            }
          }}
          className="flex items-center space-x-1.5 bg-white hover:bg-[#F5F6F9] text-[#202938] border border-[#E8EBF1] text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-xs"
        >
          <UploadCloud className="w-3.5 h-3.5 text-[#7187E8]" />
          <span className="hidden sm:inline">Upload Documents</span>
        </button>

        {/* New Summary Primary Action Button */}
        <button
          onClick={() => setActiveTab('summarizer')}
          className="flex items-center space-x-1.5 bg-[#7187E8] hover:bg-[#5E75DE] text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm shadow-[#7187E8]/25 transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>New Summary</span>
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setHasUnread(false)}
          title="Notifications"
          className="relative p-2 text-[#858D9A] hover:text-[#202938] hover:bg-[#F5F6F9] rounded-xl border border-[#E8EBF1] transition-colors"
        >
          <Bell className="w-4 h-4" />
          {hasUnread && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#7187E8] rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* User Profile Avatar */}
        <div className="w-8 h-8 rounded-full bg-[#7187E8]/10 border border-[#7187E8]/20 flex items-center justify-center text-[#7187E8] text-xs font-bold shadow-xs">
          AS
        </div>
      </div>
    </header>
  );
};
