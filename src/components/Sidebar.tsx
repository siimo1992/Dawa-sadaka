import React, { useState } from 'react';
import {
  MessageSquarePlus,
  MessageSquare,
  Sparkles,
  Volume2,
  Palette,
  Languages,
  Trash2,
  Search,
  Bot,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Conversation, ViewTab, AppLanguage } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  language: AppLanguage;
  onToggleLanguage?: () => void;
  onSelectLanguage?: (lang: AppLanguage) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenDownload?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  activeTab,
  onSelectTab,
  language,
  onToggleLanguage,
  onSelectLanguage,
  isOpen,
  onClose,
  onOpenDownload,
}) => {
  const isAr = language === 'ar';
  const isFr = language === 'fr';
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 z-50 flex flex-col w-72 bg-slate-950 border-e border-slate-800/80 p-4 transition-transform duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : isAr ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isAr ? 'right-0' : 'left-0'}`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <img
              src="/icon.svg"
              alt="تيديكلت AI"
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-2xl object-cover shadow-lg ring-1 ring-cyan-500/35 shrink-0"
            />
            <div>
              <h1 className="text-base font-extrabold text-white tracking-tight whitespace-nowrap">
                تيديكلت AI
              </h1>
              <p className="text-[11px] text-indigo-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                DARTAGNAN MAHMUOD
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 lg:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Action: New Chat */}
        <div className="my-4">
          <button
            onClick={() => {
              onNewConversation();
              onSelectTab('chat');
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-98"
          >
            <MessageSquarePlus className="w-4 h-4" />
            <span>{isAr ? 'محادثة جديدة' : 'New Conversation'}</span>
          </button>
        </div>

        {/* App Feature Tabs */}
        <div className="space-y-1 mb-4 pb-4 border-b border-slate-800/80">
          <button
            onClick={() => {
              onSelectTab('chat');
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4" />
              <span>{isAr ? 'الدردشة الذكية' : 'AI Chat'}</span>
            </div>
            {isAr ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            onClick={() => {
              onSelectTab('tools');
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'أدوات التوليد والترجمة' : 'Generative Tools'}</span>
            </div>
            {isAr ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            onClick={() => {
              onSelectTab('tts');
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'tts'
                ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span>{isAr ? 'استوديو الصوت (TTS)' : 'Voice & Speech Studio'}</span>
            </div>
            {isAr ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>

          <button
            onClick={() => {
              onSelectTab('visual');
              if (window.innerWidth < 1024) onClose();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'visual'
                ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Palette className="w-4 h-4 text-purple-400" />
              <span>{isAr ? 'المخططات البصرية (SVG)' : 'Visual Diagrams (SVG)'}</span>
            </div>
            {isAr ? <ChevronLeft className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>

        {/* Saved Conversations Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-xs font-semibold text-slate-400">
              {isAr ? 'سجل المحادثات' : 'Conversations'}
            </span>
            <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded-full">
              {conversations.length}
            </span>
          </div>

          {/* Search Bar */}
          {conversations.length > 2 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute top-2.5 rtl:right-2.5 ltr:left-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'بحث في المحادثات...' : 'Search chats...'}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl py-1.5 rtl:pr-8 rtl:pl-2.5 ltr:pl-8 ltr:pr-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {filteredConversations.length === 0 ? (
              <p className="text-[11px] text-slate-600 text-center py-6">
                {isAr ? 'لا توجد محادثات محفوظة' : 'No chats found'}
              </p>
            ) : (
              filteredConversations.map((c) => {
                const isActive = c.id === activeConversationId && activeTab === 'chat';
                return (
                  <div
                    key={c.id}
                    className={`group flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white font-medium border border-slate-700/60 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                    onClick={() => {
                      onSelectConversation(c.id);
                      onSelectTab('chat');
                      if (window.innerWidth < 1024) onClose();
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-500 group-hover:text-indigo-400" />
                      <span className="truncate">{c.title || (isAr ? 'محادثة ذكية' : 'New Chat')}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(c.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-opacity"
                      title={isAr ? 'حذف المحادثة' : 'Delete chat'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer Area */}
        <div className="pt-3 mt-2 border-t border-slate-800/80 space-y-2">
          {/* Download App Button */}
          {onOpenDownload && (
            <button
              id="openDownload"
              type="button"
              onClick={onOpenDownload}
              className="download-button w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-white bg-[#176b52] hover:bg-[#125742] transition-all shadow-md cursor-pointer text-xs"
            >
              <span>📲</span>
              <span>{isAr ? 'تنزيل التطبيق' : isFr ? "Télécharger l'App" : 'Download App'}</span>
            </button>
          )}

          {/* Language Switcher (AR / EN / FR) */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
            <button
              onClick={() => (onSelectLanguage ? onSelectLanguage('ar') : onToggleLanguage?.())}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                language === 'ar' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇩🇿 العربية
            </button>
            <button
              onClick={() => (onSelectLanguage ? onSelectLanguage('en') : onToggleLanguage?.())}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                language === 'en' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇬🇧 English
            </button>
            <button
              onClick={() => (onSelectLanguage ? onSelectLanguage('fr') : onToggleLanguage?.())}
              className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                language === 'fr' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              🇫🇷 Français
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
