import React, { useState, useRef } from 'react';
import { Volume2, Play, Pause, Download, Sparkles, Loader2, Mic, RefreshCw } from 'lucide-react';

interface TtsStudioViewProps {
  language: 'ar' | 'en';
}

export const TtsStudioView: React.FC<TtsStudioViewProps> = ({ language }) => {
  const isAr = language === 'ar';
  const [text, setText] = useState(
    isAr
      ? 'مرحباً بك في استوديو الصوت الذكي. هذا الصوت تم توليده بالكامل باستخدام نموذج الذكاء الاصطناعي المتقدم من جوجل.'
      : 'Welcome to the AI Audio Studio. This high-fidelity speech is generated in real-time using Google Gemini TTS.'
  );
  const [voice, setVoice] = useState<'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr'>('Kore');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voices = [
    {
      id: 'Kore' as const,
      name: 'Kore',
      tag: isAr ? 'هادئ ومريح' : 'Calm & Warm',
      desc: isAr ? 'صوت أنثوي متزن ومريح للأذن، مثالي للبودكاست والمقالات' : 'Soothing, gentle, and balanced female tone',
    },
    {
      id: 'Puck' as const,
      name: 'Puck',
      tag: isAr ? 'حيوي وتفاعلي' : 'Dynamic & Friendly',
      desc: isAr ? 'نبرة مبهجة ومتفائلة، رائعة للإعلانات والقصص' : 'Upbeat, friendly, and energetic cadence',
    },
    {
      id: 'Fenrir' as const,
      name: 'Fenrir',
      tag: isAr ? 'عميق وقوي' : 'Deep & Authoritative',
      desc: isAr ? 'صوت ذكوري وقور، مناسب للأخبار والأفلام الوثائقية' : 'Deep, resonant, and confident male tone',
    },
    {
      id: 'Zephyr' as const,
      name: 'Zephyr',
      tag: isAr ? 'سلس ومعاصر' : 'Smooth & Modern',
      desc: isAr ? 'نبرة ناعمة وحوارية، مناسبة للمساعدين الرقميين' : 'Crisp, contemporary, and natural pacing',
    },
    {
      id: 'Charon' as const,
      name: 'Charon',
      tag: isAr ? 'رسمي ورصين' : 'Formal & Clear',
      desc: isAr ? 'صوت احترافي وواضح جداً، مثالي للمحاضرات' : 'Articulate, steady, and broadcast-ready',
    },
  ];

  const samplePrompts = [
    {
      title: isAr ? 'حكمة وفلسفة' : 'Wisdom & Philosophy',
      text: isAr
        ? 'الذكاء الحقيقي ليس فقط في المعرفة، بل في القدرة على التخيل والابتكار وصنع أثر إيجابي في حياة البشر.'
        : 'True intelligence is not merely the accumulation of knowledge, but the capacity to imagine, innovate, and uplift humanity.',
    },
    {
      title: isAr ? 'خبر تقني موجز' : 'Tech Update',
      text: isAr
        ? 'أعلنت فرق الأبحاث اليوم عن تقدم هائل في معالجة اللغات الطبيعية، مما يفتح آفاقاً جديدة للتواصل البشري مع الآلات.'
        : 'Today researchers unveiled monumental strides in neural audio synthesis, bridging the gap between machines and authentic human expression.',
    },
    {
      title: isAr ? 'ترحيب حار' : 'Warm Greeting',
      text: isAr
        ? 'أهلاً وسهلاً بك في منصتنا! نتمنى لك تجربة استثنائية مليئة بالإلهام والإنتاجية العالية.'
        : 'Welcome aboard! We are thrilled to have you here and hope this platform elevates your productivity and creativity.',
    },
  ];

  const handleGenerateAudio = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMessage('');

    try {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 1000),
          voice,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const data = await res.json();
      const base64Audio = data.audio;
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Auto play
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        isAr
          ? `تعذر توليد الصوت: ${err.message}`
          : `Failed to generate audio: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800/80 pb-5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Volume2 className="w-6 h-6 text-indigo-400" />
          {isAr ? 'استوديو تحويل النص إلى صوت طبيعي (Gemini TTS)' : 'Text-to-Speech Studio (Gemini TTS)'}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {isAr
            ? 'توليد أصوات بشرية فائقة النقاء والواقعية باللغات المختلفة بنقرة واحدة باستخدام نموذج gemini-3.8-flash-lite-tts.'
            : 'Generate expressive, high-clarity natural speech from text using gemini-3.8-flash-lite-tts.'}
        </p>
      </div>

      {/* Voice Selection */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-white flex items-center gap-2">
          <Mic className="w-4 h-4 text-indigo-400" />
          {isAr ? 'اختر الشخصية الصوتية (Voice Persona)' : 'Select Voice Persona'}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {voices.map((v) => {
            const isSelected = voice === v.id;
            return (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg'
                    : 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-white text-base">{v.name}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      isSelected
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {v.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{v.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Input Area */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-white">
            {isAr ? 'النص المراد تحويله لصوت' : 'Text to Convert'}
          </label>
          <span className="text-xs text-slate-500">{text.length} / 1000</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 1000))}
          rows={5}
          className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y leading-relaxed font-sans"
          placeholder={isAr ? 'اكتب أو الصق النص هنا...' : 'Enter your text to convert into speech...'}
        />

        {/* Quick Sample Text Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs text-slate-400">{isAr ? 'عينات سريعة:' : 'Quick Samples:'}</span>
          {samplePrompts.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setText(s.text)}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              {s.title}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateAudio}
          disabled={loading || !text.trim()}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{isAr ? 'جاري توليد الصوت فائق الجودة...' : 'Synthesizing voice with Gemini...'}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{isAr ? 'توليد واستماع للصوت' : 'Generate & Play Audio'}</span>
            </>
          )}
        </button>

        {errorMessage && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-xl text-rose-300 text-xs">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Audio Playback Deck */}
      {audioUrl && (
        <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          <div className="flex items-center gap-4">
            <button
              onClick={togglePlayback}
              className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-transform active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                {isAr ? `المقطع الصوتي (${voice})` : `Audio Clip (${voice})`}
                {isPlaying && (
                  <span className="flex items-center gap-0.5 h-3">
                    <span className="w-1 h-3 bg-indigo-400 rounded-full animate-pulse" />
                    <span className="w-1 h-4 bg-purple-400 rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150" />
                  </span>
                )}
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr ? 'صيغة WAV نقية 24kHz Mono - جاهز للاستخدام' : '24kHz Studio WAV Format - Ready to use'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={audioUrl}
              download={`gemini-voice-${voice}.wav`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>{isAr ? 'تحميل الملف الصوتي' : 'Download Audio'}</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
