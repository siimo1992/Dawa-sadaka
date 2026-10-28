import React, { useState, useEffect } from 'react';
import { HeartHandshake, Check, Trash2, Clock } from 'lucide-react';
import {
  loadStoredAssociations,
  saveStoredAssociations,
  type CharityAssociation,
} from '../context/AppContext';

export interface CharityAdminApprovalBoxProps {
  onOpenCharityView?: () => void;
  onNotify?: (title: string, message: string) => void;
}

export const CharityAdminApprovalBox: React.FC<CharityAdminApprovalBoxProps> = ({
  onOpenCharityView,
  onNotify,
}) => {
  const [associations, setAssociations] = useState<CharityAssociation[]>(
    loadStoredAssociations
  );

  useEffect(() => {
    const sync = () => setAssociations(loadStoredAssociations());
    window.addEventListener('bab-alkhair-sync', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('bab-alkhair-sync', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const pendingList = associations.filter((a) => a.status === 'pending');
  const approvedList = associations.filter((a) => a.status === 'approved');

  const handleApprove = (id: string) => {
    const target = associations.find((a) => a.id === id);
    const next = associations.map((a) =>
      a.id === id ? { ...a, status: 'approved' as const } : a
    );
    setAssociations(next);
    saveStoredAssociations(next);
    if (target && onNotify) {
      onNotify(
        'تمت الموافقة على جمعية خيرية',
        `تم تفعيل عضوية «${target.name}» في قسم باب الخير.`
      );
    }
  };

  const handleRemove = (id: string) => {
    const next = associations.filter((a) => a.id !== id);
    setAssociations(next);
    saveStoredAssociations(next);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-3.5">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/15 text-emerald-600 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] m-0">
              طلبات عضوية جمعيات «باب الخير»
            </h3>
            <p className="text-[11px] text-[var(--mute)] m-0">
              الموافقة الحصرية لمالك تيدكلت AI لتفعيل حسابات الجمعيات الخيرية
            </p>
          </div>
        </div>

        {onOpenCharityView && (
          <button
            type="button"
            onClick={onOpenCharityView}
            title="فتح قسم باب الخير"
            aria-label="فتح قسم باب الخير"
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
          >
            فتح باب الخير
          </button>
        )}
      </div>

      {/* Pending Requests */}
      <div className="space-y-2">
        <div className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>طلبات بانتظار موافقة المالك ({pendingList.length})</span>
        </div>

        {pendingList.length === 0 ? (
          <div className="text-xs text-[var(--mute)] py-1.5">
            لا توجد طلبات عضوية معلقة حالياً.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingList.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[var(--bg)] border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-extrabold text-[var(--ink)]">{item.name}</div>
                  <div className="text-[var(--mute)]">
                    {item.neighborhood} · {item.specialty}
                  </div>
                  <div className="font-mono text-[11px] text-[var(--mute)]">
                    هاتف: {item.phone} · بريد: {item.email || '—'} · رمز الدخول المطلوب:{' '}
                    <b className="text-emerald-600">{item.accessCode}</b>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleApprove(item.id)}
                    title="موافقة وتفعيل العضوية"
                    aria-label="موافقة وتفعيل العضوية"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>موافقة</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    title="رفض الطلب"
                    aria-label="رفض الطلب"
                    className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>رفض</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Associations Summary */}
      <div className="pt-2 border-t border-[var(--line)]/60 flex items-center justify-between text-xs text-[var(--mute)]">
        <span>إجمالي الجمعيات المعتمدة: {approvedList.length}</span>
        <span>كل جمعية تطلع على رسائلها الخاصة فقط</span>
      </div>
    </div>
  );
};
