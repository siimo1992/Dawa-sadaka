import React, { useState, useEffect } from 'react';
import { X, Brain, Plus, Trash2, Check, Power, Edit3 } from 'lucide-react';

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  category: 'language' | 'style' | 'interest' | 'domain' | 'general';
  createdAt: string;
  updatedAt: string;
}

interface LongTermMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

export const LongTermMemoryModal: React.FC<LongTermMemoryModalProps> = ({
  isOpen,
  onClose,
  userId = 'default_user',
}) => {
  const [enabled, setEnabled] = useState(true);
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newVal, setNewVal] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editVal, setEditVal] = useState('');

  const fetchMemory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memory?user_id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(Boolean(data.enabled));
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMemory();
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleToggleEnabled = async () => {
    const nextState = !enabled;
    setEnabled(nextState);
    try {
      await fetch('/api/memory/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, enabled: nextState }),
      });
    } catch {
      // ignore
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newVal.trim()) return;
    try {
      const res = await fetch('/api/memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          key: newKey.trim(),
          value: newVal.trim(),
          category: 'general',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setNewKey('');
        setNewVal('');
      }
    } catch {
      // ignore
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editKey.trim() || !editVal.trim()) return;
    try {
      const res = await fetch(`/api/memory/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          key: editKey.trim(),
          value: editVal.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data.entries) ? data.entries : []);
        setEditingId(null);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/memory/${encodeURIComponent(id)}?user_id=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      }
    } catch {
      // ignore
    }
  };

  const handleClearAll = async () => {
    try {
      const res = await fetch(`/api/memory?user_id=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setEntries([]);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      dir="rtl"
    >
      <div className="w-full max-w-xl rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between bg-[var(--bg)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--ink)] m-0">
                الذاكرة طويلة المدى وتفضيلات المستخدم
              </h3>
              <p className="text-[11px] text-[var(--mute)] m-0">
                تحكّم فيما يتذكره تيدكلت AI عن لغتك المفضلة وأسلوب الإجابة واهتماماتك
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Enable/Disable Toggle Bar */}
          <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[var(--ink)] block">
                تفعيل الذاكرة الشخصية التلقائية
              </span>
              <span className="text-[11px] text-[var(--mute)]">
                عند التفعيل، يتذكر المساعد تفضيلاتك مثل «تذكر أنني أفضل الإجابات المختصرة»
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleEnabled}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                enabled
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-500/20 text-[var(--mute)] border border-[var(--line)]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{enabled ? 'مفعّلة' : 'معطّلة'}</span>
            </button>
          </div>

          {/* Add New Memory Preference Form */}
          <form onSubmit={handleAddEntry} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              type="text"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="الخاصية (مثال: أسلوب الشرح)"
              className="sm:col-span-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--green)]"
            />
            <input
              type="text"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="التفضيل (مثال: مختصر وبالعربية الفصحى)"
              className="sm:col-span-6 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] px-3 py-2 text-xs focus:outline-none focus:border-[var(--green)]"
            />
            <button
              type="submit"
              className="sm:col-span-2 rounded-xl bg-[var(--green)] hover:opacity-90 text-white text-xs font-bold py-2 px-3 flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </form>

          {/* Stored Entries List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--mute)]">
                التفضيلات المحفوظة ({entries.length})
              </span>
              {entries.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] text-rose-500 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>مسح الذاكرة بالكامل</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-6 text-xs text-[var(--mute)]">جاري تحميل الذاكرة...</div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-[var(--line)] text-xs text-[var(--mute)]">
                لا توجد تفضيلات محفوظة حالياً. يمكنك إضافة تفضيل أعلاه أو قول «تذكر أنني...» في المحادثة.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-between gap-2"
                >
                  {editingId === entry.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        className="w-1/3 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] px-2 py-1 text-xs"
                      />
                      <input
                        type="text"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] px-2 py-1 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(entry.id)}
                        className="p-1.5 rounded-lg bg-emerald-600 text-white cursor-pointer"
                        title="حفظ"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-extrabold text-[var(--ink)]">{entry.key}: </span>
                        <span className="text-xs text-[var(--mute)]">{entry.value}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditKey(entry.key);
                            setEditVal(entry.value);
                          }}
                          className="p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--card)] cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
