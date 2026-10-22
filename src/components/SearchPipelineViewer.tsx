import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Brain,
  Search,
  BookOpen,
  Scale,
  Sparkles,
  CheckCircle2,
  FileText,
  Percent,
} from 'lucide-react';
import type { PipelineExecution, AppLanguage } from '../types';

interface SearchPipelineViewerProps {
  pipeline: PipelineExecution;
  lang?: AppLanguage | string;
}

export const SearchPipelineViewer: React.FC<SearchPipelineViewerProps> = ({
  pipeline,
  lang = 'ar',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { intent, queries, retrievedChunks, rerankedCount, synthesisMethod } = pipeline;

  const isAr = lang === 'ar';
  const hasRagChunks = retrievedChunks && retrievedChunks.length > 0;

  // Category labels in Arabic / English
  const categoryLabels: Record<string, string> = {
    dialogue: isAr ? 'تحية ودردشة راقية' : 'Polite Dialogue',
    concise: isAr ? 'استفسار بسيط ومباشر' : 'Direct Fact',
    research: isAr ? 'بحث علمي وأكاديمي' : 'Academic Research',
    desert_safety: isAr ? 'سلامة صحراوية ومسالك' : 'Desert Safety & RN1',
    code: isAr ? 'برمجة وخوارزميات' : 'Code & Algorithms',
    services_law: isAr ? 'إجراءات ومرفق عام' : 'Public Services & Law',
    dates_market: isAr ? 'أسواق وتمور واحات' : 'Dates & Markets',
    general: isAr ? 'معرفة عامة' : 'General Knowledge',
  };

  const complexityLabels: Record<string, string> = {
    simple: isAr ? 'بسيط (إيجاز ذكي)' : 'Simple (Concise)',
    moderate: isAr ? 'متوسط (شرح متوازن)' : 'Moderate',
    deep: isAr ? 'عميق (بحث شامل وتفصيلي)' : 'Deep Analysis',
  };

  return (
    <div className="mt-3.5 pt-3 border-t border-[var(--line)]/50 select-none">
      {/* Collapsible Trigger Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--bg)]/80 hover:bg-[var(--line)]/50 border border-[var(--line)] transition-all cursor-pointer group text-start"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-3 h-3 animate-pulse" />
          </div>
          <span className="text-[11px] font-bold text-[var(--ink)] truncate">
            {isAr
              ? 'مسار التفكير والبحث المعرفي (RAG Pipeline · 5 مراحل)'
              : 'Thinking & RAG Search Pipeline (5 Stages)'}
          </span>
          {hasRagChunks && (
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0">
              {isAr ? `${retrievedChunks.length} مراجع RAG` : `${retrievedChunks.length} RAG sources`}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[var(--mute)] group-hover:text-[var(--ink)] shrink-0">
          <span className="text-[10px] font-semibold hidden sm:inline">
            {isOpen ? (isAr ? 'إخفاء المراحل' : 'Collapse') : (isAr ? 'عرض التفاصيل' : 'Expand')}
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expanded Pipeline Stepper */}
      {isOpen && (
        <div className="mt-2.5 p-3 rounded-2xl bg-[var(--card)]/90 border border-[var(--line)] text-xs space-y-3.5 animate-message-in shadow-2xs">
          {/* STAGE 1: تحليل النية */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]">
              <span className="w-4 h-4 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[10px]">
                1
              </span>
              <Brain className="w-3.5 h-3.5 text-blue-500" />
              <span>{isAr ? 'تحليل النية (Intent Parsing)' : 'Intent Parsing'}</span>
            </div>
            <div className="ps-5 text-[11px] text-[var(--mute)] space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>{isAr ? 'نوع السؤال:' : 'Type:'}</span>
                <span className="font-bold text-[var(--ink)] bg-[var(--bg)] px-2 py-0.5 rounded-md border border-[var(--line)]">
                  {categoryLabels[intent.category] || intent.category}
                </span>
                <span>·</span>
                <span>{isAr ? 'درجة التعقيد:' : 'Complexity:'}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {complexityLabels[intent.complexity] || intent.complexity}
                </span>
              </div>
              {intent.keywords && intent.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  <span className="text-[10px]">{isAr ? 'الكلمات المفتاحية:' : 'Keywords:'}</span>
                  {intent.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.2 rounded bg-[var(--bg)] text-[10px] text-[var(--ink)] border border-[var(--line)] font-mono"
                    >
                      #{kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* STAGE 2: الاستعلام */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--line)]/40">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]">
              <span className="w-4 h-4 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px]">
                2
              </span>
              <Search className="w-3.5 h-3.5 text-purple-500" />
              <span>{isAr ? 'الاستعلام والتوسيع (Querying)' : 'Query Expansion'}</span>
            </div>
            <div className="ps-5 space-y-1">
              {queries.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] font-mono bg-[var(--bg)] px-2 py-1 rounded-lg border border-[var(--line)]"
                >
                  <span className="text-[var(--mute)]">🔍 Q{idx + 1}:</span>
                  <span className="text-[var(--ink)] truncate">{q}</span>
                </div>
              ))}
            </div>
          </div>

          {/* STAGE 3: استخراج المعرفة RAG */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--line)]/40">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]">
                <span className="w-4 h-4 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px]">
                  3
                </span>
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>{isAr ? 'استخراج المعرفة (RAG Retrieval)' : 'RAG Knowledge Retrieval'}</span>
              </div>
              <span className="text-[10px] text-[var(--mute)] font-semibold">
                {retrievedChunks.length} {isAr ? 'وثائق متطابقة' : 'chunks matched'}
              </span>
            </div>

            <div className="ps-5 space-y-1.5">
              {hasRagChunks ? (
                retrievedChunks.map((chunk, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="text-[11px] font-bold text-[var(--ink)] truncate">
                          {chunk.title}
                        </span>
                      </div>
                      <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5 border border-emerald-500/20">
                        <Percent className="w-2.5 h-2.5" />
                        {Math.round(chunk.score <= 1.0 ? chunk.score * 100 : chunk.score)}% {isAr ? 'مطابقة موثقة' : 'match'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--mute)] leading-relaxed m-0 italic line-clamp-2">
                      «{chunk.snippet}»
                    </p>
                    <div className="text-[9px] text-[var(--mute)] font-medium flex items-center justify-between flex-wrap gap-1">
                      <span>🏛️ {isAr ? 'الجهة المصدرة:' : 'Source:'} {chunk.source}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{isAr ? 'اجتاز عتبة الجودة (≥45%)' : 'Passed threshold'}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-[var(--mute)] leading-relaxed">
                  <span className="font-bold text-amber-700 dark:text-amber-300 block mb-0.5">
                    {isAr ? '🔍 لم تجتز أي وثيقة عتبة المطابقة المعتمدة (45%)' : 'No sources met the 45% threshold'}
                  </span>
                  {isAr
                    ? 'حرصاً على الأمان والمصداقية وتجنب الاستشهاد بمصادر ضعيفة أو غير وثيقة الصلة، تم حجب الوثائق الضعيفة وتوليد الإجابة بالاعتماد على الفهم المعرفي المباشر.'
                    : 'To prevent hallucination and weak citations, sub-threshold sources were discarded in favor of direct synthesis.'}
                </div>
              )}
            </div>
          </div>

          {/* STAGE 4: التقييم والفلترة Reranking */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--line)]/40">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]">
              <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px]">
                4
              </span>
              <Scale className="w-3.5 h-3.5 text-emerald-500" />
              <span>{isAr ? 'التقييم والفلترة (Reranking)' : 'Reranking & Filtering'}</span>
            </div>
            <div className="ps-5 text-[10px] text-[var(--mute)]">
              <p className="m-0 leading-relaxed">
                {isAr
                  ? `تمت فلترة الفقرات المسترجعة واستبعاد المعطيات الضعيفة أو المكررة، مع اعتماد أعلى ${rerankedCount} فقرات موثقة لاجتياز عتبة الجودة.`
                  : `Filtered and reranked top ${rerankedCount} chunks above relevance threshold.`}
              </p>
            </div>
          </div>

          {/* STAGE 5: الدمج والصياغة */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--line)]/40">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--ink)]">
              <span className="w-4 h-4 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center text-[10px]">
                5
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-500" />
              <span>{isAr ? 'الدمج والصياغة (Synthesis)' : 'Grounded Synthesis'}</span>
            </div>
            <div className="ps-5 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
              <p className="m-0">✨ {synthesisMethod}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
