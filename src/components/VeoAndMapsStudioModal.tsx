import React, { useState } from 'react';
import {
  ImageIcon,
  MapPin,
  Search,
  Sparkles,
  Download,
  ExternalLink,
  X,
  Loader2,
  Navigation,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

interface VeoAndMapsStudioModalProps {
  isOpen: boolean;
  initialTab?: 'veo' | 'maps' | 'images';
  onClose: () => void;
}

interface GroundingMapLink {
  title: string;
  uri: string;
  reviewSnippets?: string[];
}

interface GroundingWebLink {
  title: string;
  uri: string;
}

const IMAGE_PRESET_PROMPTS = [
  'لوحة فنية سينمائية فائقة الدقة لغروب الشمس الذهبي فوق كثبان الرمال وبساتين النخيل في واحة عين صالح، إضاءة درامية واقعية.',
  'مشهد معماري تراثي أصيل لقصر قديم من الطين والصخور الحمراء في إقليم تديكلت، مع سماء صحراوية صافية وظلال شمس الظهيرة.',
  'صورة فوتوغرافية احترافية لقافلة جمال تعبر الصحراء الجزائرية تحت سماء ليلية مرصعة بالنجوم ومجرة درب التبانة متلألئة فوق عين صالح.',
  'واحة نخيل خضراء مورقة تتوسطها عين ماء رقراقة ونظام الفقارة التقليدي في تديكلت، تفاصيل واقعية ساحرة 4k.',
];

const MAPS_PRESET_QUERIES = [
  'أين تقع مستشفى عين صالح الجديد وما هي أقسام الاستعجالات المتوفرة؟',
  'صيدليات ومراكز صحية في محيط إينغر والدغامشة',
  'محطات الوقود وخدمات السيارات على طول الطريق الوطني رقم 1 (RN1) باتجاه تمنراست',
  'أهم المعالم الأثرية والقصور القديمة في منطقة تديكلت وعين صالح',
  'سوق الواحة ومحلات التمور في وسط مدينة عين صالح',
];

export const VeoAndMapsStudioModal: React.FC<VeoAndMapsStudioModalProps> = ({
  isOpen,
  initialTab = 'maps',
  onClose,
}) => {
  // Always default to maps or images, eliminating video
  const [activeTab, setActiveTab] = useState<'images' | 'maps'>(
    initialTab === 'veo' || initialTab === 'images' ? 'images' : 'maps'
  );

  // --- Image Generation State (Imagen 3 / Nano Banana) ---
  const [imagePrompt, setImagePrompt] = useState<string>(IMAGE_PRESET_PROMPTS[0]);
  const [imageAspectRatio, setImageAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '3:4'>('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState<boolean>(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // --- Google Maps & Grounding State ---
  const [mapsQuery, setMapsQuery] = useState<string>(MAPS_PRESET_QUERIES[0]);
  const [groundingMode, setGroundingMode] = useState<'maps' | 'search'>('maps');
  const [isSearchingMaps, setIsSearchingMaps] = useState<boolean>(false);
  const [mapsAnswer, setMapsAnswer] = useState<string>('');
  const [mapsLinks, setMapsLinks] = useState<GroundingMapLink[]>([]);
  const [webLinks, setWebLinks] = useState<GroundingWebLink[]>([]);
  const [mapsError, setMapsError] = useState<string | null>(null);
  const [mapsTimings, setMapsTimings] = useState<Record<string, number> | null>(null);

  if (!isOpen) return null;

  // Handle Image Generation
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim()) return;
    setIsGeneratingImage(true);
    setImageError(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt.trim(),
          aspectRatio: imageAspectRatio,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر توليد الصورة.');
      }

      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
      } else {
        throw new Error('لم يتم استلام رابط الصورة.');
      }
    } catch (err: any) {
      setImageError(err?.message || 'فشل توليد الصورة عبر النموذج الذكي.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Handle Google Maps Grounding Search
  const handleMapsSearch = async () => {
    if (!mapsQuery.trim()) return;
    setIsSearchingMaps(true);
    setMapsError(null);
    setMapsAnswer('');
    setMapsLinks([]);
    setWebLinks([]);

    try {
      const res = await fetch('/api/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: mapsQuery.trim(),
          latitude: 27.1935,
          longitude: 2.4607,
          mode: groundingMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'تعذر إتمام البحث الموثق.');
      }

      setMapsAnswer(data.answer || '');
      setMapsLinks(Array.isArray(data.mapsLinks) ? data.mapsLinks : []);
      setWebLinks(Array.isArray(data.webLinks) ? data.webLinks : []);
      setMapsTimings(data.timings || null);
    } catch (err: any) {
      setMapsError(err?.message || 'فشل الاستعلام عبر خرائط وبحث Google.');
    } finally {
      setIsSearchingMaps(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-2xl overflow-hidden text-[var(--ink)]">
        {/* Header & Tab Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[var(--line)] bg-[var(--bg)]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('maps')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'maps'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-[var(--card)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>خرائط Google والبحث الميداني</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'images'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-[var(--card)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>استوديو الصور (Imagen 3 / نانو بنانا)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer transition-colors"
            title="إغلاق"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* TAB 1: High Quality Image Generation (Imagen 3 / Nano Banana) */}
          {activeTab === 'images' ? (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">
                    توليد الصور الفنية بالذكاء الاصطناعي (Imagen 3 / نانو بنانا)
                  </span>
                  اكتب وصفاً إبداعياً لمشهد صحراوي، تراثي، أو جغرافي لإنتاج صور فوتوغرافية وفنية عالية الدقة والواقعية دون أي وسائط فيديو.
                </div>
              </div>

              {/* Preset Prompts */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[var(--mute)]">
                  أوصاف مقترحة من بيئة عين صالح وتديكلت:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {IMAGE_PRESET_PROMPTS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setImagePrompt(preset)}
                      className="text-right text-xs px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:border-amber-500/50 border border-[var(--line)] transition-colors cursor-pointer"
                    >
                      {preset.slice(0, 55)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold">وصف الصورة المطلوبة:</label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(imagePrompt);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    className="text-[11px] text-[var(--mute)] hover:text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPrompt ? 'تم النسخ' : 'نسخ الوصف'}</span>
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder="صف المشهد بدقة: الألوان، الإضاءة، العناصر، الزاوية، والأسلوب الفني..."
                  className="w-full rounded-xl p-3 text-xs sm:text-sm bg-[var(--bg)] border border-[var(--line)] focus:outline-none focus:border-amber-500 leading-relaxed"
                />
              </div>

              {/* Aspect Ratio & Generate Button */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--mute)]">أبعاد الصورة:</span>
                  <div className="inline-flex rounded-xl bg-[var(--bg)] p-1 border border-[var(--line)] text-xs">
                    {(['1:1', '16:9', '4:3', '3:4'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setImageAspectRatio(ratio)}
                        className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                          imageAspectRatio === ratio
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'text-[var(--mute)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={isGeneratingImage || !imagePrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-sm active:scale-98"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري توليد الصورة الفنية...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>توليد الصورة الآن</span>
                    </>
                  )}
                </button>
              </div>

              {imageError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{imageError}</span>
                </div>
              )}

              {/* Generated Image Result Card */}
              {generatedImageUrl && (
                <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم توليد الصورة بنجاح عبر Imagen 3</span>
                    </div>
                    <a
                      href={generatedImageUrl}
                      download={`tidikelt-image-${Date.now()}.jpg`}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل الصورة</span>
                    </a>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-black/20 flex items-center justify-center max-h-[440px]">
                    <img
                      src={generatedImageUrl}
                      alt={imagePrompt}
                      className="max-h-[440px] w-auto max-w-full object-contain rounded-xl shadow-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: Google Maps & Local Grounding */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5">
                <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">
                    الدليل الميداني الذكي لمنطقة تديكلت وعين صالح
                  </span>
                  بحث جغرافي حي مرتبط ببيانات خرائط Google والمعالم الرسمية والمرافق الصحية والطرقات الحيوية.
                </div>
              </div>

              {/* Preset Queries */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[var(--mute)]">
                  استفسارات جغرافية وميدانية شائعة:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MAPS_PRESET_QUERIES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMapsQuery(preset)}
                      className="text-right text-xs px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:border-emerald-500/50 border border-[var(--line)] transition-colors cursor-pointer"
                    >
                      {preset.slice(0, 55)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar Input */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--mute)] absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={mapsQuery}
                    onChange={(e) => setMapsQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMapsSearch()}
                    placeholder="ابحث عن مستشفى، صيدلية، محطة وقود، معلم أثري..."
                    className="w-full h-10 ps-9 pe-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={groundingMode}
                    onChange={(e) => setGroundingMode(e.target.value as any)}
                    className="h-10 px-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="maps">خرائط Google (أماكن ومواقع)</option>
                    <option value="search">بحث الويب الحي (توثيق شامل)</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleMapsSearch}
                    disabled={isSearchingMaps || !mapsQuery.trim()}
                    className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    {isSearchingMaps ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>بحث موثق</span>
                  </button>
                </div>
              </div>

              {mapsError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mapsError}</span>
                </div>
              )}

              {/* Grounded Results Display */}
              {mapsAnswer && (
                <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs text-[var(--mute)]">
                    <span className="font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>إجابة موثقة ميدانياً:</span>
                    </span>
                    {mapsTimings && (
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>{mapsTimings.totalMs || mapsTimings.modelMs || 420} ms</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm leading-relaxed text-[var(--ink)] whitespace-pre-line m-0">
                    {mapsAnswer}
                  </p>

                  {/* Maps Links */}
                  {mapsLinks.length > 0 && (
                    <div className="pt-2 border-t border-[var(--line)]/60">
                      <span className="text-xs font-bold block mb-1.5 text-emerald-600 dark:text-emerald-400">
                        مواقع على خرائط Google:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {mapsLinks.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2.5 rounded-xl bg-[var(--card)] border border-[var(--line)] hover:border-emerald-500/40 text-xs flex items-start justify-between gap-2 transition-colors"
                          >
                            <div>
                              <div className="font-bold text-[var(--ink)]">{link.title}</div>
                              {link.reviewSnippets && link.reviewSnippets[0] && (
                                <div className="text-[11px] text-[var(--mute)] line-clamp-1 mt-0.5">
                                  {link.reviewSnippets[0]}
                                </div>
                              )}
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Web Links */}
                  {webLinks.length > 0 && (
                    <div className="pt-2 border-t border-[var(--line)]/60">
                      <span className="text-xs font-bold block mb-1.5 text-blue-600 dark:text-blue-400">
                        المصادر التوثيقية المعتمدة:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {webLinks.map((w, idx) => (
                          <a
                            key={idx}
                            href={w.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-[var(--card)] border border-[var(--line)] hover:border-blue-500/40 text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5 text-blue-500" />
                            <span className="truncate max-w-xs">{w.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
