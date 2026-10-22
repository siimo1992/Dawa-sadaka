import React, { useState } from 'react';
import {
  Languages,
  FileText,
  Code2,
  Mail,
  CheckCheck,
  Sparkles,
  Copy,
  Check,
  Volume2,
  Loader2,
  ArrowRightLeft,
  RotateCcw,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ToolsViewProps {
  language: 'ar' | 'en';
  onPlayTts: (text: string) => void;
  isTtsLoading?: boolean;
}

type ToolType = 'translate' | 'summarize' | 'code' | 'email' | 'grammar';

export const ToolsView: React.FC<ToolsViewProps> = ({ language, onPlayTts, isTtsLoading }) => {
  const isAr = language === 'ar';
  const [activeTool, setActiveTool] = useState<ToolType>('translate');
  const [inputText, setInputText] = useState('');
  const [resultText, setResultText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Tool specific states
  const [targetLang, setTargetLang] = useState('English');
  const [translationTone, setTranslationTone] = useState('professional');
  const [summaryFormat, setSummaryFormat] = useState('bullet-points');
  const [codeLang, setCodeLang] = useState('TypeScript');
  const [codeTask, setCodeTask] = useState('explain_and_fix');
  const [emailTone, setEmailTone] = useState('رسمي ومهني');
  const [emailRecipient, setEmailRecipient] = useState('مدير أو عميل');

  const toolsList = [
    {
      id: 'translate' as ToolType,
      name: isAr ? 'المترجم الفوري الذكي' : 'Smart AI Translator',
      desc: isAr ? 'ترجمة سياقية دقيقة لعدة لغات مع مراعاة الأسلوب' : 'Context-aware polyglot translation with customizable tone',
      icon: Languages,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'summarize' as ToolType,
      name: isAr ? 'ملخص المحتوى والمقالات' : 'Executive Summarizer',
      desc: isAr ? 'استخلاص أهم النقاط والأفكار الجوهرية من النصوص الطويلة' : 'Condense lengthy articles into key actionable points',
      icon: FileText,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'code' as ToolType,
      name: isAr ? 'مساعد البرمجة واستكشاف الأخطاء' : 'Code Assistant & Debugger',
      desc: isAr ? 'كتابة، شرح، وتحسين الأكواد البرمجية بكفاءة عالية' : 'Generate, debug, refactor, and explain clean code',
      icon: Code2,
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 'email' as ToolType,
      name: isAr ? 'صائغ الرسائل والمراسلات' : 'Professional Email Drafter',
      desc: isAr ? 'صياغة بريد إلكتروني رسمي ومؤثر لأي مناسبة عمل' : 'Draft compelling business emails and inquiries',
      icon: Mail,
      color: 'from-purple-500 to-pink-600',
    },
    {
      id: 'grammar' as ToolType,
      name: isAr ? 'المدقق اللغوي والنحوي' : 'Grammar & Style Polisher',
      desc: isAr ? 'تصحيح الأخطاء النحوية والإملائية وتطوير أسلوب الكتابة' : 'Fix grammar, typos, and improve sentence elegance',
      icon: CheckCheck,
      color: 'from-rose-500 to-red-600',
    },
  ];

  const handleExecute = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    setResultText('');

    try {
      const options: any = {};
      if (activeTool === 'translate') {
        options.targetLang = targetLang;
        options.tone = translationTone;
      } else if (activeTool === 'summarize') {
        options.format = summaryFormat;
      } else if (activeTool === 'code') {
        options.language = codeLang;
        options.task = codeTask;
      } else if (activeTool === 'email') {
        options.tone = emailTone;
        options.recipient = emailRecipient;
      }

      const res = await fetch('/api/tool-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: activeTool,
          input: inputText,
          options,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to run AI tool');
      }

      const data = await res.json();
      setResultText(data.result || '');
    } catch (err: any) {
      setResultText(
        isAr
          ? `عذراً، حدث خطأ أثناء المعالجة: ${err.message}`
          : `Sorry, an error occurred during execution: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (!resultText) return;
    navigator.clipboard.writeText(resultText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentToolData = toolsList.find((t) => t.id === activeTool);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            {isAr ? 'استوديو أدوات الذكاء الاصطناعي التوليدي' : 'AI Generative Tools Studio'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {isAr
              ? 'مجموعة أدوات متخصصة وفائقة الدقة للترجمة، التلخيص، كتابة الأكواد، وصياغة الرسائل.'
              : 'Specialized high-precision generative tools for translation, summarization, coding, and writing.'}
          </p>
        </div>
      </div>

      {/* Tool Selector Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {toolsList.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setResultText('');
              }}
              className={`flex flex-col items-start p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 border-indigo-500/80 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/40'
                  : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              <div
                className={`p-2 rounded-xl bg-gradient-to-br ${tool.color} text-white mb-2 shadow-sm`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-semibold block ${isActive ? 'text-white' : 'text-slate-300'}`}>
                {tool.name}
              </span>
              <span className="text-xs text-slate-400 mt-1 line-clamp-1 leading-snug">
                {tool.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace (Input / Output Panels) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left/Right Input Panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              {isAr ? 'مدخلات الأداة' : 'Tool Input'}
            </h3>
            {inputText && (
              <button
                onClick={() => setInputText('')}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          {/* Dynamic Options for Selected Tool */}
          {activeTool === 'translate' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? 'اللغة المستهدفة' : 'Target Language'}
                </label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="English">الإنجليزية (English)</option>
                  <option value="Arabic">العربية (Arabic)</option>
                  <option value="French">الفرنسية (Français)</option>
                  <option value="Spanish">الإسبانية (Español)</option>
                  <option value="German">الألمانية (Deutsch)</option>
                  <option value="Turkish">التركية (Türkçe)</option>
                  <option value="Chinese">الصينية (中文)</option>
                  <option value="Japanese">اليابانية (日本語)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? 'أسلوب الترجمة' : 'Tone / Style'}
                </label>
                <select
                  value={translationTone}
                  onChange={(e) => setTranslationTone(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="professional">{isAr ? 'مهني ورسمي' : 'Professional'}</option>
                  <option value="natural">{isAr ? 'طبيعي وحواري' : 'Conversational'}</option>
                  <option value="literary">{isAr ? 'أدبي وبلاغي' : 'Literary & Elegant'}</option>
                  <option value="technical">{isAr ? 'تقني ومصطلحي' : 'Technical'}</option>
                </select>
              </div>
            </div>
          )}

          {activeTool === 'summarize' && (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                {isAr ? 'صيغة التلخيص المفضلة' : 'Summary Format'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSummaryFormat('bullet-points')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    summaryFormat === 'bullet-points'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'نقاط واضحة + خلاصات' : 'Bullet Points & Takeaways'}
                </button>
                <button
                  type="button"
                  onClick={() => setSummaryFormat('paragraph')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                    summaryFormat === 'paragraph'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {isAr ? 'فقرة مكثفة وشاملة' : 'Dense Paragraph'}
                </button>
              </div>
            </div>
          )}

          {activeTool === 'code' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? 'لغة البرمجة / التقنية' : 'Language / Framework'}
                </label>
                <select
                  value={codeLang}
                  onChange={(e) => setCodeLang(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="TypeScript / React">TypeScript / React</option>
                  <option value="Python">Python</option>
                  <option value="JavaScript / Node.js">JavaScript / Node.js</option>
                  <option value="SQL / PostgreSQL">SQL / PostgreSQL</option>
                  <option value="Tailwind CSS / HTML">Tailwind CSS / HTML</option>
                  <option value="Go">Go (Golang)</option>
                  <option value="Java">Java</option>
                  <option value="C++">C++</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? 'نوع المهمة' : 'Task Type'}
                </label>
                <select
                  value={codeTask}
                  onChange={(e) => setCodeTask(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="explain_and_fix">{isAr ? 'استكشاف وحل المشكلة' : 'Debug & Fix Error'}</option>
                  <option value="write_from_scratch">{isAr ? 'كتابة كود جديد بالكامل' : 'Generate Clean Code'}</option>
                  <option value="optimize_performance">{isAr ? 'تحسين الأداء والسرعة' : 'Optimize Performance'}</option>
                  <option value="add_tests">{isAr ? 'كتابة اختبارات (Unit Tests)' : 'Write Unit Tests'}</option>
                </select>
              </div>
            </div>
          )}

          {activeTool === 'email' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? 'نبرة الخطاب' : 'Email Tone'}
                </label>
                <input
                  type="text"
                  value={emailTone}
                  onChange={(e) => setEmailTone(e.target.value)}
                  placeholder={isAr ? 'رسمي، ودي، حازم...' : 'Formal, Friendly, Concise...'}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  {isAr ? 'المرسل إليه' : 'Recipient'}
                </label>
                <input
                  type="text"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder={isAr ? 'مدير التوظيف، عميل...' : 'Recruiter, Client...'}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={8}
            placeholder={
              activeTool === 'translate'
                ? isAr
                  ? 'اكتب أو الصق النص الذي تود ترجمته هنا...'
                  : 'Enter or paste the text you want to translate...'
                : activeTool === 'summarize'
                ? isAr
                  ? 'الصق المقال أو التقرير أو النص الطويل للتلخيص الفوري...'
                  : 'Paste your article, meeting transcript, or notes...'
                : activeTool === 'code'
                ? isAr
                  ? 'صف المطلوب برمجياً أو الصق الكود مع رسالة الخطأ...'
                  : 'Describe what you need or paste your code snippet...'
                : activeTool === 'email'
                ? isAr
                  ? 'ما هي فكرة الرسالة؟ مثلاً: طلب موعد مقابلة، تقديم عرض سعر، اعتذار مهني...'
                  : 'Explain the goal of the email: meeting request, follow up, proposal...'
                : isAr
                ? 'الصق النص للتدقيق اللغوي والنحوي...'
                : 'Paste text for grammar and polish check...'
            }
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed font-sans"
          />

          {/* Action button */}
          <button
            onClick={handleExecute}
            disabled={loading || !inputText.trim()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري المعالجة بالذكاء الاصطناعي...' : 'Processing with Gemini AI...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'تنفيذ المهمة التوليدية' : 'Run Generative Task'}</span>
              </>
            )}
          </button>
        </div>

        {/* Output Result Panel */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl min-h-[420px] flex flex-col backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              {isAr ? 'النتيجة والمخرجات' : 'Output & Results'}
            </h3>
            {resultText && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPlayTts(resultText)}
                  disabled={isTtsLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title={isAr ? 'استماع للصوت' : 'Listen with TTS'}
                >
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{isAr ? 'استماع' : 'Listen'}</span>
                </button>
                <button
                  onClick={copyResult}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Copy result"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">{isAr ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-start">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-medium animate-pulse">
                  {isAr
                    ? 'يقوم نموذج Gemini 3.8 Flash بتحليل النص وتوليد الإجابة المثلى...'
                    : 'Gemini 3.8 Flash is analyzing and crafting your output...'}
                </p>
              </div>
            ) : resultText ? (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 overflow-y-auto max-h-[500px]">
                <MarkdownRenderer content={resultText} isRtl={isAr} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm max-w-sm">
                  {isAr
                    ? 'أدخل النص في الحقل المقابل واضغط على تنفيذ المهمة لعرض النتيجة التوليدية هنا مباشرة.'
                    : 'Fill in your input and click run to view the AI generated outcome here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
