import React, { useState } from 'react';
import {
  Code2,
  X,
  Copy,
  Check,
  Send,
  Terminal,
  Server,
  BookOpen,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Database,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import type { AppLanguage } from '../types';

interface ApiExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: AppLanguage | string;
}

interface EndpointDef {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  defaultBody?: any;
}

const ENDPOINTS: EndpointDef[] = [
  {
    method: 'POST',
    path: '/api/ain-salah/ask',
    name: 'المحادثة الذكية وتوليد الإجابات وتدقيق RAG',
    nameEn: 'Smart Chat, Grounded Synthesis & RAG',
    desc: 'إرسال استفسار نصي أو متعدد الوسائط وتوليد إجابة مدعومة بقاعدة المعرفة الموثقة ومسار التفكير والتصنيف اللغوي.',
    descEn: 'Send text or multimodal query to generate grounded answer with thinking pipeline.',
    defaultBody: {
      query: 'ما هي أهم أصناف التمور في واحات تديكلت؟',
      language: 'ar',
      agentId: 'market',
    },
  },
  {
    method: 'POST',
    path: '/api/rag/search',
    name: 'البحث الدلالي المباشر في قاعدة المعرفة (عتبة 45%)',
    nameEn: 'Knowledge Base Semantic Search (Threshold 45%)',
    desc: 'البحث عن الوثائق الموثقة التي تجتاز عتبة الجودة الدلالية المعتمدة (≥45%) دون استشهاد بمصادر ضعيفة.',
    descEn: 'Retrieve verified local documents passing strict 45% relevance threshold.',
    defaultBody: {
      query: 'إجراءات رخصة البناء والخدمات الإدارية ببلدية عين صالح',
      topK: 3,
    },
  },
  {
    method: 'GET',
    path: '/api/ain-salah/documentation',
    name: 'المواصفات الكاملة للـ API (OpenAPI Schema)',
    nameEn: 'Complete API Specification (OpenAPI Schema)',
    desc: 'جلب دليل وتوثيق كافة نقاط النهاية، المعاملات، ودليل أرقام الطوارئ الرسمي المعتمد.',
    descEn: 'Get complete OpenAPI JSON specification with emergency directory.',
  },
  {
    method: 'GET',
    path: '/api/rag/knowledge-base',
    name: 'استعراض كافة وثائق قاعدة المعرفة المحلية المعتمدة',
    nameEn: 'List Verified Local Knowledge Base Documents',
    desc: 'جلب أرشيف المعرفة المحلية الخاص بالمسالك الصحراوية، الفقاقير، الطاقة المتجددة، والتمور.',
    descEn: 'Fetch verified local archives for desert navigation, foggaras, and solar projects.',
  },
  {
    method: 'POST',
    path: '/api/ain-salah/daily-ticker',
    name: 'شريط الأخبار اليومية والموجز الصحراوي الحي',
    nameEn: 'Daily News Ticker & Desert Weather Digest',
    desc: 'توليد شريط إخباري موجز يدمج مستجدات الولاية وتنبيهات الطقس المعتمدة من الأرصاد الجوية.',
    descEn: 'Generate consolidated news and weather ticker for header ribbon.',
    defaultBody: {
      news: [{ s: 'بلدية عين صالح', t: 'انطلاق موسم جني التمور' }],
    },
  },
  {
    method: 'GET',
    path: '/api/training/sft',
    name: 'مجموعة بيانات التدريب الخاضع للإشراف (SFT Dataset)',
    nameEn: 'Supervised Fine-Tuning (SFT) Dataset',
    desc: 'استعراض أمثلة الحوارات النموذجية (Few-Shot Demonstrations) ومعايير الصياغة المرجعية.',
    descEn: 'Inspect few-shot reference demonstrations and calibration benchmarks.',
  },
  {
    method: 'GET',
    path: '/api/training/rlhf',
    name: 'سجل تفضيلات التعلم المعزز البشري (RLHF Arena)',
    nameEn: 'Human Preference Alignment Records (RLHF Arena)',
    desc: 'استعراض جولات المقارنات الثنائية ومؤشرات تفضيل المستخدمين البشريين للردود المهذبة والدقيقة.',
    descEn: 'Review pairwise human preference judgments for safety and tone.',
  },
  {
    method: 'GET',
    path: '/api/ratings/stats',
    name: 'إحصائيات رضا المستخدمين وجودة الردود',
    nameEn: 'User Satisfaction & Feedback Analytics',
    desc: 'معدل الرضا العام، عدد الإعجابات وملاحظات التصحيح على الإجابات.',
    descEn: 'View overall satisfaction percentage and feedback analytics.',
  },
  {
    method: 'GET',
    path: '/api/health',
    name: 'فحص جاهزية الخادم وحالة النظام',
    nameEn: 'System Health Check & Uptime',
    desc: 'التأكد من تشغيل الخادم، الجاهزية، وتوفر محركات الذكاء الاصطناعي.',
    descEn: 'Check server availability and status.',
  },
];

export const ApiExplorerModal: React.FC<ApiExplorerModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
}) => {
  const isAr = lang === 'ar';
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [requestBodyText, setRequestBodyText] = useState<string>(() =>
    ENDPOINTS[0].defaultBody ? JSON.stringify(ENDPOINTS[0].defaultBody, null, 2) : ''
  );
  const [isLoading, setIsLoading] = useState(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseDurationMs, setResponseDurationMs] = useState<number | null>(null);
  const [responseBodyText, setResponseBodyText] = useState<string | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  if (!isOpen) return null;

  const handleSelectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    setRequestBodyText(ep.defaultBody ? JSON.stringify(ep.defaultBody, null, 2) : '');
    setResponseBodyText(null);
    setResponseStatus(null);
    setResponseDurationMs(null);
  };

  const getCurlSnippet = (): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    if (selectedEndpoint.method === 'GET') {
      return `curl -s -X GET "${origin}${selectedEndpoint.path}" \\
  -H "Accept: application/json"`;
    }
    return `curl -s -X POST "${origin}${selectedEndpoint.path}" \\
  -H "Content-Type: application/json" \\
  -d '${requestBodyText.replace(/\n/g, '')}'`;
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(getCurlSnippet());
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const copyResponse = () => {
    if (!responseBodyText) return;
    navigator.clipboard.writeText(responseBodyText);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

  const handleExecuteRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseBodyText(null);
    const start = performance.now();

    try {
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          Accept: 'application/json',
          ...(selectedEndpoint.method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
        },
      };

      if (selectedEndpoint.method === 'POST' && requestBodyText.trim()) {
        try {
          // validate json
          JSON.parse(requestBodyText);
          options.body = requestBodyText;
        } catch {
          setIsLoading(false);
          setResponseStatus(400);
          setResponseBodyText(
            JSON.stringify({ error: isAr ? 'خطأ في بنية الـ JSON للمدخلات' : 'Invalid JSON format' }, null, 2)
          );
          return;
        }
      }

      const res = await fetch(selectedEndpoint.path, options);
      const duration = Math.round(performance.now() - start);
      setResponseStatus(res.status);
      setResponseDurationMs(duration);

      const json = await res.json();
      setResponseBodyText(JSON.stringify(json, null, 2));
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setResponseStatus(500);
      setResponseDurationMs(duration);
      setResponseBodyText(
        JSON.stringify(
          {
            error: err.message || 'Request failed',
            hint: isAr ? 'تأكد من تشغيل الخادم وتوفر الشبكة' : 'Check server status',
          },
          null,
          2
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[var(--ink)] my-auto animate-scale-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--bg)]/90 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--green)]/15 text-[var(--green)] flex items-center justify-center border border-[var(--green)]/25">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-[var(--ink)] m-0">
                  {isAr ? 'واجهة برمجة التطبيقات للمطورين (API Explorer)' : 'Developer API Explorer'}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                  v2.1.0 REST
                </span>
              </div>
              <p className="text-xs text-[var(--mute)] m-0">
                {isAr
                  ? 'وثائق وتجربة نقاط النهاية الحية لمساعد عين صالح وتديكلت الذكي مع أمثلة cURL فورية'
                  : 'Interactive playground and cURL snippets for Tidikelt & In Salah AI platform endpoints'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--line)] flex items-center justify-center text-[var(--mute)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Official Emergency Directory & Verification Card */}
        <div className="px-4 sm:px-5 py-2.5 bg-blue-500/10 border-b border-blue-500/20 text-xs flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-bold text-blue-700 dark:text-blue-300">
              {isAr ? 'دليل الطوارئ والبيانات المعتمدة رسمياً في المنصة (تدقيق 2026):' : 'Official Emergency Directory (Verified 2026):'}
            </span>
            <div className="flex items-center gap-2 flex-wrap font-mono font-bold text-[11px]">
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] text-emerald-600 dark:text-emerald-400">
                الحماية: 14
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] text-amber-600 dark:text-amber-400">
                الدرك: 1055
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] text-blue-600 dark:text-blue-400">
                شرطة النجدة: 17
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] text-purple-600 dark:text-purple-400">
                الرقم الأخضر DGSN: 1548
              </span>
            </div>
          </div>
          <span className="text-[10px] text-[var(--mute)] italic">
            {isAr ? 'المديرية العامة للأمن الوطني والحماية المدنية والدرك الوطني' : 'DGSN & Civil Protection verified'}
          </span>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Endpoints Sidebar List (4 cols) */}
          <div className="md:col-span-4 border-e border-[var(--line)] overflow-y-auto p-3 space-y-1.5 bg-[var(--bg)]/50">
            <span className="text-[11px] font-bold text-[var(--mute)] px-2 block mb-1">
              {isAr ? 'نقاط النهاية المتاحة (Endpoints):' : 'Available Endpoints:'}
            </span>
            {ENDPOINTS.map((ep, idx) => {
              const isSelected = selectedEndpoint.path === ep.path && selectedEndpoint.method === ep.method;
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectEndpoint(ep)}
                  className={`w-full text-start p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[var(--green)]/15 border-[var(--green)] shadow-xs'
                      : 'bg-[var(--card)] border-[var(--line)] hover:bg-[var(--card)]/90'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-[9px] font-mono font-black px-1.5 py-0.2 rounded ${
                        ep.method === 'POST'
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--mute)] truncate">
                      {ep.path}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-[var(--ink)] line-clamp-1">
                    {isAr ? ep.name : ep.nameEn}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Interactive Console & Docs (8 cols) */}
          <div className="md:col-span-8 flex flex-col overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Endpoint Info Banner */}
            <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 font-mono">
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-md ${
                      selectedEndpoint.method === 'POST'
                        ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                        : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {selectedEndpoint.method}
                  </span>
                  <span className="text-sm font-bold text-[var(--ink)]">
                    {selectedEndpoint.path}
                  </span>
                </div>
                <button
                  onClick={copyCurl}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--line)] text-xs text-[var(--ink)] font-semibold transition-colors cursor-pointer"
                  title="Copy cURL snippet"
                >
                  {copiedCurl ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">{isAr ? 'تم النسخ!' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-[var(--mute)]" />
                      <span>{isAr ? 'نسخ أمر cURL' : 'Copy cURL'}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-[var(--mute)] leading-relaxed m-0">
                {isAr ? selectedEndpoint.desc : selectedEndpoint.descEn}
              </p>
            </div>

            {/* Request Payload Editor (for POST) */}
            {selectedEndpoint.method === 'POST' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[var(--green)]" />
                    <span>{isAr ? 'بيانات الطلب (Request Payload JSON):' : 'Request Body (JSON):'}</span>
                  </label>
                  <span className="text-[10px] font-mono text-[var(--mute)]">application/json</span>
                </div>
                <textarea
                  value={requestBodyText}
                  onChange={(e) => setRequestBodyText(e.target.value)}
                  rows={5}
                  className="w-full font-mono text-xs bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 focus:outline-none focus:border-[var(--green)] leading-relaxed"
                  dir="ltr"
                />
              </div>
            )}

            {/* Execute Request Button */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExecuteRequest}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--green)] text-white hover:opacity-90 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isAr ? 'جاري إرسال الطلب ومعالجة الـ RAG...' : 'Executing request...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>{isAr ? 'إرسال طلب تجريبي الآن (Send Request)' : 'Send Request'}</span>
                  </>
                )}
              </button>

              {responseStatus !== null && (
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold ${
                      responseStatus === 200
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    Status: {responseStatus}
                  </span>
                  {responseDurationMs !== null && (
                    <span className="text-[var(--mute)]">
                      ⚡ {responseDurationMs} ms
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Response Console */}
            {responseBodyText !== null && (
              <div className="space-y-1.5 animate-message-in">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-blue-500" />
                    <span>{isAr ? 'استجابة الخادم (Response Body JSON):' : 'Response Body (JSON):'}</span>
                  </span>
                  <button
                    onClick={copyResponse}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--line)] text-[11px] text-[var(--ink)] font-semibold transition-colors cursor-pointer"
                  >
                    {copiedResponse ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        <span className="text-emerald-500">{isAr ? 'تم النسخ' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[var(--mute)]" />
                        <span>{isAr ? 'نسخ الناتج' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>
                <pre
                  className="w-full max-h-64 font-mono text-[11px] bg-slate-950 text-slate-100 p-3 rounded-xl border border-slate-800 overflow-auto leading-relaxed"
                  dir="ltr"
                >
                  {responseBodyText}
                </pre>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-[var(--line)] bg-[var(--bg)]/90 flex items-center justify-between text-xs text-[var(--mute)] shrink-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--green)]" />
            <span>
              {isAr
                ? 'واجهة RESTful معيارية متوافقة مع جميع لغات البرمجة (Python, Node.js, cURL, Mobile apps)'
                : 'Standard REST API ready for integrations'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:bg-[var(--line)] text-[var(--ink)] font-bold text-xs transition-colors cursor-pointer"
          >
            {isAr ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
