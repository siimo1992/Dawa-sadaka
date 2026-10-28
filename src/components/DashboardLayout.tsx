import React from 'react';
import {
  HeartHandshake,
  Send,
  Inbox,
  Megaphone,
  Menu,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const {
    activeView,
    setActiveView,
    activeAssociation,
    activeAssociationMessages,
    pendingAssociations,
    posts,
    toastMessage,
    isAdminLoggedIn,
    onBackToChat,
    onToggleSidebar,
  } = useAppContext();

  const unreadForActiveAssoc = activeAssociationMessages.filter(
    (m) => m.status === 'unread'
  ).length;

  return (
    <div
      className="flex-1 w-full h-full min-h-0 overflow-y-auto bg-[var(--bg)] text-[var(--ink)] flex flex-col relative selection:bg-emerald-600 selection:text-white"
      dir="rtl"
    >
      {/* Clean Top Bar: Brand + Role Navigation (المرسل / المستقبل / فضاء الجمعيات) + Back */}
      <header className="sticky top-0 z-30 bg-[var(--card)]/95 backdrop-blur-md border-b border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Zone 1: Sidebar Toggle & Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="icon-btn w-9 h-9 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-emerald-500/50 text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                title="القائمة"
                aria-label="القائمة"
              >
                <Menu className="w-4 h-4" />
              </button>
            )}

            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <HeartHandshake className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>

            <div className="min-w-0 hidden xs:block">
              <h1 className="text-sm sm:text-base font-black text-[var(--ink)] m-0 truncate">
                باب الخير
              </h1>
            </div>
          </div>

          {/* Zone 2: Navigation Switchers (فضاء الجمعيات / جمعيات / راسل الجمعية) */}
          <nav
            className="flex items-center gap-1 p-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] overflow-x-auto max-w-full"
            aria-label="أقسام باب الخير"
          >
            {/* 1. فضاء الجمعيات (First & Default) */}
            <button
              type="button"
              onClick={() => setActiveView('space')}
              title="فضاء الجمعيات"
              aria-label="فضاء الجمعيات"
              aria-pressed={activeView === 'space'}
              className={`tab-button px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeView === 'space'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5 shrink-0" />
              <span>فضاء الجمعيات</span>
              {posts.length > 0 && (
                <span className="font-mono text-[11px] tabular-nums opacity-85">
                  ({posts.length})
                </span>
              )}
            </button>

            {/* 2. جمعيات (Second) */}
            <button
              type="button"
              onClick={() => setActiveView('receiver')}
              title="جمعيات"
              aria-label="جمعيات"
              aria-pressed={activeView === 'receiver'}
              className={`tab-button px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeView === 'receiver'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <Inbox className="w-3.5 h-3.5 shrink-0" />
              <span>جمعيات</span>
              {activeAssociation && unreadForActiveAssoc > 0 && (
                <span className="font-mono text-[11px] tabular-nums">
                  ({unreadForActiveAssoc})
                </span>
              )}
              {isAdminLoggedIn && pendingAssociations.length > 0 && (
                <span className="font-mono text-[11px] tabular-nums text-amber-400">
                  · {pendingAssociations.length} طلب
                </span>
              )}
            </button>

            {/* 3. راسل الجمعية (Third) */}
            <button
              type="button"
              onClick={() => setActiveView('sender')}
              title="راسل الجمعية"
              aria-label="راسل الجمعية"
              aria-pressed={activeView === 'sender'}
              className={`tab-button px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeView === 'sender'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>راسل الجمعية</span>
            </button>
          </nav>

          {/* Zone 3: Back to Smart Chat */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isAdminLoggedIn && (
              <span
                className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                title="المالك"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>المالك</span>
              </span>
            )}

            {onBackToChat && (
              <button
                type="button"
                onClick={onBackToChat}
                className="icon-btn w-9 h-9 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-emerald-500/50 text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
                title="رجوع"
                aria-label="رجوع"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Focused Workspace */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-3.5 sm:px-6 py-5 sm:py-8 pb-20">
        {children}
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 start-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-950 text-white border border-emerald-500/40 shadow-xl flex items-center gap-2 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-bottom-3"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
