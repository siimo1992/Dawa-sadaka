import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  PhoneCall,
  MapPin,
  Copy,
  Check,
  Share2,
  X,
  Compass,
  ShieldAlert,
  Navigation,
  MessageSquare,
} from 'lucide-react';
import { sendSosDispatch, SosDispatchResult } from '../lib/api';

interface SosButtonProps {
  lang?: 'ar' | 'en' | 'fr';
  wilayaName?: string;
  defaultLat?: number;
  defaultLon?: number;
  onQuickEmergencyAsk?: (promptText: string) => void;
  compact?: boolean;
}

export const SosButton: React.FC<SosButtonProps> = ({
  lang = 'ar',
  wilayaName = 'عين صالح',
  defaultLat = 27.1935,
  defaultLon = 2.4822,
  onQuickEmergencyAsk,
  compact = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number; accuracy?: number; isLiveGps: boolean }>({
    lat: defaultLat,
    lon: defaultLon,
    isLiveGps: false,
  });
  const [note, setNote] = useState('');
  const [dispatchInfo, setDispatchInfo] = useState<SosDispatchResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Check if launched via PWA shortcut /?action=sos
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'sos') {
      setIsOpen(true);
    }
  }, []);

  const acquireGps = () => {
    if (!navigator.geolocation) {
      updateDispatch(defaultLat, defaultLon, undefined, false, note);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = pos.coords.accuracy;
        setCoords({ lat, lon, accuracy, isLiveGps: true });
        setGpsLoading(false);
        updateDispatch(lat, lon, accuracy, true, note);
      },
      () => {
        setGpsLoading(false);
        updateDispatch(coords.lat, coords.lon, coords.accuracy, coords.isLiveGps, note);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  };

  const updateDispatch = async (
    lat: number,
    lon: number,
    accuracy: number | undefined,
    _isLive: boolean,
    customNote: string
  ) => {
    const res = await sendSosDispatch({
      lat,
      lon,
      accuracy,
      note: customNote,
      wilaya: wilayaName,
    });
    setDispatchInfo(res);
  };

  useEffect(() => {
    if (isOpen) {
      acquireGps();
    }
  }, [isOpen]);

  const handleCopyDistress = () => {
    const text =
      dispatchInfo?.distressSmsText ||
      `🆘 نداء استغاثة عاجل (${wilayaName})\nGPS: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}\nhttps://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const distressText =
    dispatchInfo?.distressSmsText ||
    `🆘 نداء استغاثة عاجل (${wilayaName})\nGPS: ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}\nhttps://www.google.com/maps?q=${coords.lat.toFixed(6)},${coords.lon.toFixed(6)}`;

  const smsHref = `sms:?body=${encodeURIComponent(distressText)}`;

  const label =
    lang === 'ar' ? 'طوارئ SOS' : lang === 'fr' ? 'Urgence SOS' : 'SOS Emergency';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          compact
            ? 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer shrink-0'
            : 'w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer'
        }
        title={
          lang === 'ar'
            ? 'نداء طوارئ الصحراء والاستعجالات مع تحديد إحداثيات GPS المباشرة'
            : 'Emergency SOS & Live GPS Coordinates'
        }
      >
        <ShieldAlert className="w-3.5 h-3.5 animate-pulse shrink-0" />
        <span className="whitespace-nowrap">{label}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-150"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="w-full max-w-lg rounded-3xl bg-[var(--card)] border border-rose-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-200" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    {lang === 'ar'
                      ? 'مركز نداء الاستغاثة والطوارئ الصحراوية (SOS)'
                      : lang === 'fr'
                      ? "Centre d'Appel d'Urgence SOS Sahara"
                      : 'Sahara Emergency SOS & GPS Dispatch'}
                  </h3>
                  <p className="text-[11px] text-rose-100/90">
                    {lang === 'ar'
                      ? 'اتصال مباشر وتحديد إحداثيات الأقمار الصناعية GPS للإنقاذ'
                      : 'Direct emergency numbers & satellite GPS coordinates'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-[var(--ink)]">
              {/* 1. Direct One-Tap Emergency Numbers */}
              <div>
                <span className="text-xs font-extrabold text-[var(--mute)] block mb-2">
                  {lang === 'ar'
                    ? '📞 اتصال طوارئ فوري بضغطة واحدة (مجاني ويعمل بدون رصيد):'
                    : '📞 One-Tap Free Emergency Numbers:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <a
                    href="tel:14"
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-500/12 hover:bg-rose-500/20 border border-rose-500/35 text-rose-600 dark:text-rose-300 transition-all"
                  >
                    <PhoneCall className="w-4 h-4 mb-1" />
                    <span className="text-lg font-black font-mono">14</span>
                    <span className="text-[10.5px] font-bold text-[var(--ink)]">الحماية المدنية</span>
                  </a>

                  <a
                    href="tel:1055"
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/12 hover:bg-emerald-500/20 border border-emerald-500/35 text-emerald-600 dark:text-emerald-300 transition-all"
                  >
                    <Compass className="w-4 h-4 mb-1" />
                    <span className="text-lg font-black font-mono">1055</span>
                    <span className="text-[10.5px] font-bold text-[var(--ink)]">الدرك الوطني</span>
                  </a>

                  <a
                    href="tel:17"
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-blue-500/12 hover:bg-blue-500/20 border border-blue-500/35 text-blue-600 dark:text-blue-300 transition-all"
                  >
                    <PhoneCall className="w-4 h-4 mb-1" />
                    <span className="text-lg font-black font-mono">17</span>
                    <span className="text-[10.5px] font-bold text-[var(--ink)]">شرطة النجدة</span>
                  </a>

                  <a
                    href="tel:1548"
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-amber-500/12 hover:bg-amber-500/20 border border-amber-500/35 text-amber-600 dark:text-amber-300 transition-all"
                  >
                    <PhoneCall className="w-4 h-4 mb-1" />
                    <span className="text-lg font-black font-mono">1548</span>
                    <span className="text-[10.5px] font-bold text-[var(--ink)]">الأمن الوطني</span>
                  </a>
                </div>
              </div>

              {/* 2. Live GPS Coordinates Box */}
              <div className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-xs font-extrabold">
                      {lang === 'ar' ? 'إحداثيات موقعك للإنقاذ (GPS):' : 'Your Rescue GPS Coordinates:'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={acquireGps}
                    disabled={gpsLoading}
                    className="px-2.5 py-1 rounded-lg bg-[var(--green)]/15 hover:bg-[var(--green)]/25 text-[var(--green)] text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Navigation className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                    <span>{gpsLoading ? 'جاري التحديد...' : 'تحديث GPS الدقيق'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--card)] border border-[var(--line)] font-mono text-xs sm:text-sm">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                    {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                  </span>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-sans font-bold">
                    {coords.isLiveGps
                      ? `GPS مباشر${coords.accuracy ? ` (±${Math.round(coords.accuracy)}م)` : ''}`
                      : `موقع ${wilayaName}`}
                  </span>
                </div>

                {/* Quick Distress Note Input */}
                <input
                  type="text"
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    updateDispatch(coords.lat, coords.lon, coords.accuracy, coords.isLiveGps, e.target.value);
                  }}
                  placeholder={
                    lang === 'ar'
                      ? 'صف حالتك باختصار (مثال: عطل سيارة على RN1، لدغة عقرب، نفاد وقود)...'
                      : 'Describe emergency briefly (e.g. vehicle stuck on RN1)...'
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:border-rose-500"
                />

                {/* Copy & Share Distress Message Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyDistress}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[var(--card)] hover:bg-[var(--line)]/40 border border-[var(--line)] text-xs font-extrabold cursor-pointer transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-500">تم نسخ نداء الاستغاثة والـ GPS!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 text-[var(--mute)]" />
                        <span>نسخ رسالة الاستغاثة + رابط الخريطة</span>
                      </>
                    )}
                  </button>

                  <a
                    href={smsHref}
                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>إرسال عبر رسالة SMS للطوارئ</span>
                  </a>
                </div>
              </div>

              {/* 3. Instant AI Emergency Consultation Triggers */}
              {onQuickEmergencyAsk && (
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold text-[var(--mute)] block">
                    {lang === 'ar'
                      ? '⚡ استشارة فورية من وكيل الاستعجالات وحارس الصحراء:'
                      : '⚡ Instant AI Emergency Guidance:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onQuickEmergencyAsk(
                          `🆘 طوارئ صحراوية في الإحداثيات (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}): تعطلت المركبة في المسلك الصحراوي، ما هي خطوات البقاء والنجاة الفورية؟`
                        );
                      }}
                      className="p-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--green)]/10 border border-[var(--line)] hover:border-[var(--green)] text-right text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>🏜️ خطة النجاة عند تعطل المركبة بالصحراء</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onQuickEmergencyAsk(
                          '🩺 طوارئ طبية عاجلة: ما هي الإسعافات الأولية الفورية للدغة العقرب الصحراوي أو ضربة الشمس الحادة في عين صالح؟'
                        );
                      }}
                      className="p-2.5 rounded-xl bg-[var(--bg)] hover:bg-[var(--green)]/10 border border-[var(--line)] hover:border-[var(--green)] text-right text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <MessageSquare className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>🩺 إسعاف لدغة العقرب وضربة الشمس</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
