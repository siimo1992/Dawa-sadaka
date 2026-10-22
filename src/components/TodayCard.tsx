import React, { useEffect, useState } from 'react';
import {
  Sun,
  Wind,
  Navigation,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { fetchTodaySummary, TodaySummaryData } from '../lib/api';

interface TodayCardProps {
  lang?: 'ar' | 'en' | 'fr';
  onAskPrompt?: (prompt: string) => void;
}

export const TodayCard: React.FC<TodayCardProps> = ({ lang = 'ar', onAskPrompt }) => {
  const [summary, setSummary] = useState<TodaySummaryData | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data, isCached: cached } = await fetchTodaySummary();
    setSummary(data);
    setIsCached(cached);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (!summary) return null;

  return (
    <div
      className="w-full rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs overflow-hidden text-right transition-all"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Bar: Weather + RN1 Status + Expand */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-500 flex items-center justify-center shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-[var(--ink)]">
                  {lang === 'ar'
                    ? 'موجز عين صالح وتيديكلت اليوم'
                    : lang === 'fr'
                    ? "Aujourd'hui à In Salah & Tidikelt"
                    : 'Today in In Salah & Tidikelt'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[var(--green)]/12 text-[var(--green)] font-mono text-xs font-extrabold">
                  {summary.weather.tempC}°C
                </span>
                {isCached && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold">
                    نسخة محفوظة
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--mute)] mt-0.5">
                {summary.weather.conditionAr} · الرياح {summary.weather.windKmh} كم/سا ({summary.weather.windDirAr})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={loadData}
              className="p-1.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/40 text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)] cursor-pointer transition-colors"
              title="تحديث بيانات اليوم"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--green)]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/40 text-[var(--ink)] border border-[var(--line)] text-[11px] font-bold cursor-pointer transition-colors"
            >
              <span>{expanded ? 'طي التفاصيل' : 'المسالك والمواقيت'}</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Quick Road Status Chips */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {summary.roads.map((road) => {
            const isCaution = road.status === 'caution';
            return (
              <button
                key={road.code}
                type="button"
                onClick={() =>
                  onAskPrompt?.(
                    `🛣️ ما هي حالة ${road.nameAr} الآن والطقس ومحطات الوقود على المسار؟`
                  )
                }
                className={`p-2.5 rounded-xl border text-right flex items-start justify-between gap-2 cursor-pointer transition-all hover:-translate-y-0.5 ${
                  isCaution
                    ? 'bg-amber-500/[0.06] border-amber-500/30 hover:border-amber-500'
                    : 'bg-[var(--bg)]/80 border-[var(--line)] hover:border-[var(--green)]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {isCaution ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                    <span className="text-[11.5px] font-extrabold text-[var(--ink)] truncate">
                      {road.code === 'RN1-S'
                        ? 'طريق تمنراست (RN1)'
                        : road.code === 'RN1-N'
                        ? 'طريق المنيعة (RN1)'
                        : 'طريق أولف / أدرار (RN52)'}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-[var(--mute)] truncate mt-0.5">{road.statusAr}</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--line)] text-[var(--mute)] shrink-0">
                  {road.distanceKm} كم
                </span>
              </button>
            );
          })}
        </div>

        {/* Expanded Section: Prayer Times & Market Bulletin */}
        {expanded && (
          <div className="pt-2.5 border-t border-[var(--line)]/70 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] font-extrabold text-[var(--mute)] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[var(--green)]" />
                <span>مواقيت الصلاة بتوقيت عين صالح:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: 'الفجر', time: summary.prayers.fajr },
                  { label: 'الظهر', time: summary.prayers.dhuhr },
                  { label: 'العصر', time: summary.prayers.asr },
                  { label: 'المغرب', time: summary.prayers.maghrib },
                  { label: 'العشاء', time: summary.prayers.isha },
                ].map((p) => (
                  <span
                    key={p.label}
                    className="px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-[10.5px] font-bold text-[var(--ink)]"
                  >
                    {p.label}: <strong className="font-mono text-[var(--green)]">{p.time}</strong>
                  </span>
                ))}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[var(--bg)]/60 border border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-[11px] text-[var(--ink)]">
                <Wind className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{summary.marketHighlightAr}</span>
              </div>
              {onAskPrompt && (
                <button
                  type="button"
                  onClick={() =>
                    onAskPrompt('🛒 ما هي أسعار التمور والخضر والسلع اليوم في سوق عين صالح؟')
                  }
                  className="px-2.5 py-1 rounded-lg bg-[var(--green)]/15 hover:bg-[var(--green)]/25 text-[var(--green)] text-[10.5px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>اسأل دليل السوق</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
