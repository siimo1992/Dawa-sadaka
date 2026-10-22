import React, { useState } from 'react';
import { Palette, Download, Copy, Check, Sparkles, Loader2, Maximize2, Layers } from 'lucide-react';

interface VisualGeneratorViewProps {
  language: 'ar' | 'en';
}

export const VisualGeneratorView: React.FC<VisualGeneratorViewProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [prompt, setPrompt] = useState('');
  const [svgContent, setSvgContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const sampleIdeas = [
    {
      title: isAr ? 'بنية تطبيق ويب حديث (Full Stack)' : 'Full Stack Architecture',
      prompt: isAr
        ? 'مخطط بنية تقنية لتطبيق ويب حديث: Client (React) -> Express API -> Gemini AI Engine & Database مع وسوم وشرح للتدفق.'
        : 'Architecture diagram of a modern Full-Stack app: Client (React) -> Express Backend -> Gemini AI Engine & PostgreSQL Database with clear arrows.',
    },
    {
      title: isAr ? 'مخطط تدفق الذكاء الاصطناعي التوليدي' : 'Generative AI Pipeline',
      prompt: isAr
        ? 'مخطط تدفق لمراحل الذكاء الاصطناعي: مدخلات المستخدم -> هندسة الأوامر (Prompting) -> المعالجة بالنموذج -> المخرجات والتحقق.'
        : 'Flowchart of GenAI pipeline: User Input -> Prompt Augmentation -> LLM Inference -> Grounding & Verification -> Final Response.',
    },
    {
      title: isAr ? 'مقارنة هندسية (SQL vs NoSQL)' : 'SQL vs NoSQL Comparison',
      prompt: isAr
        ? 'إنفوجرافيك مقارنة بصري بين قواعد البيانات العلائقية (Relational SQL) وقواعد البيانات الوثائقية (NoSQL) بالأشكال والمميزات.'
        : 'Visual infographic comparing SQL vs NoSQL: Schema structure, Scalability, ACID compliance, and Use cases.',
    },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError('');
    setSvgContent('');

    try {
      const res = await fetch('/api/tool-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'svg_diagram',
          input: prompt,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate visual diagram');
      }

      const data = await res.json();
      const rawText = data.result || '';

      // Extract SVG from code blocks or raw
      let svg = '';
      const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        svg = svgMatch[0];
      } else {
        // Fallback cleanup
        svg = rawText.replace(/```(xml|svg)?/g, '').replace(/```/g, '').trim();
      }

      if (svg.includes('<svg') && svg.includes('</svg>')) {
        setSvgContent(svg);
      } else {
        setError(
          isAr
            ? 'تم توليد النتيجة لكنها لا تحتوي على كود SVG مكتمل. يرجى تجربة وصف أكثر تحديداً.'
            : 'Generated output did not contain valid SVG markup. Please refine prompt.'
        );
      }
    } catch (err: any) {
      setError(err?.message || 'Error generating visual diagram');
    } finally {
      setLoading(false);
    }
  };

  const copySvg = () => {
    if (!svgContent) return;
    navigator.clipboard.writeText(svgContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Palette className="w-6 h-6 text-purple-400" />
          {isAr ? 'استوديو المخططات والرسوم البيانية التوضيحية (SVG Visualizer)' : 'AI Visual & Diagram Studio (SVG)'}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {isAr
            ? 'حوّل أي فكرة تقنية، مسار عمل، أو مفهوم علمي إلى رسم بياني توضيحي رقمي عالي الدقة (SVG) قابل للتكبير والتنزيل.'
            : 'Convert any concept, workflow, or system architecture into crisp, scalable SVG diagrams.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
          <label className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            {isAr ? 'صف المخطط أو الفكرة البصرية' : 'Describe the Diagram'}
          </label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-y leading-relaxed font-sans"
            placeholder={
              isAr
                ? 'مثال: مخطط يوضح مراحل رحلة العميل من الإعلان إلى الشراء...'
                : 'Example: Flowchart showing user onboarding steps with success metrics...'
            }
          />

          <div className="space-y-2">
            <span className="text-xs text-slate-400 block">{isAr ? 'نماذج ملهمة جاهزة:' : 'Sample Inspirations:'}</span>
            <div className="space-y-1.5">
              {sampleIdeas.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setPrompt(s.prompt)}
                  className="w-full text-right p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 text-xs text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-between"
                >
                  <span className="font-medium line-clamp-1">{s.title}</span>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0 ml-1" />
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-sm shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isAr ? 'جاري بناء المخطط البصري...' : 'Generating SVG Vector...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{isAr ? 'توليد الرسم التوضيحي' : 'Generate Visual Diagram'}</span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs">
              {error}
            </div>
          )}
        </div>

        {/* Visual Preview Column */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl min-h-[500px] flex flex-col backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
              {isAr ? 'معاينة المخطط (Vector SVG Canvas)' : 'Canvas Preview (SVG)'}
            </h3>

            {svgContent && (
              <div className="flex items-center gap-2">
                <button
                  onClick={copySvg}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isAr ? 'تم النسخ' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{isAr ? 'نسخ الكود' : 'Copy SVG'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadSvg}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-medium shadow-md transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isAr ? 'تحميل SVG' : 'Download'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center rounded-xl bg-slate-950/80 border border-slate-800/80 p-6 overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center space-y-3 text-slate-400">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                <p className="text-sm font-medium animate-pulse">
                  {isAr ? 'يتم الآن تصميم وهندسة عناصر الرسم البياني...' : 'Rendering vector components...'}
                </p>
              </div>
            ) : svgContent ? (
              <div
                className="w-full h-full min-h-[420px] flex items-center justify-center overflow-auto p-4 [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:mx-auto"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            ) : (
              <div className="text-center text-slate-500 space-y-3 py-20">
                <div className="w-14 h-14 rounded-2xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
                  <Palette className="w-7 h-7" />
                </div>
                <p className="text-sm max-w-md mx-auto">
                  {isAr
                    ? 'اختر أحد النماذج المقترحة أو اكتب وصفاً للمخطط لتوليده هنا كملف متجهي تفاعلي عالي الجودة.'
                    : 'Choose an inspiration or type a description to generate an interactive SVG diagram.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
