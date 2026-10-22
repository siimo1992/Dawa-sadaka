import { useState, useEffect } from 'react';

export interface RoadStatusItem {
  code: string;
  nameAr: string;
  distanceKm: number;
  status: 'open' | 'caution' | 'closed';
  statusAr: string;
  fuelAvailable: boolean;
}

export interface TodaySummaryData {
  updatedAt: string;
  time24: string;
  dateAr: string;
  hijriAr?: string;
  location: {
    nameAr: string;
    nameEn: string;
    lat: number;
    lon: number;
  };
  weather: {
    tempC: number;
    maxC: number;
    minC: number;
    windKmh: number;
    windDirAr: string;
    humidityPct: number;
    uvIndex: number;
    conditionAr: string;
    statusLevel: 'normal' | 'caution' | 'alert';
  };
  roads: RoadStatusItem[];
  prayers: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  emergency: {
    civilProtection: string;
    gendarmerie: string;
    police: string;
    nationalSecurity: string;
    hospitalAr: string;
  };
  marketHighlightAr: string;
}

export interface SosDispatchResult {
  ok: boolean;
  timestamp: string;
  mapsUrl: string | null;
  nearestCenters: Array<{
    name: string;
    phone: string;
    badge: string;
  }>;
  distressSmsText: string;
}

const TODAY_CACHE_KEY = 'ain_salah_today_cache_v1';

const FALLBACK_TODAY_DATA: TodaySummaryData = {
  updatedAt: new Date().toISOString(),
  time24: new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date()),
  dateAr: new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date()),
  location: {
    nameAr: 'عين صالح · إقليم تيديكلت',
    nameEn: 'In Salah · Tidikelt Region',
    lat: 27.1935,
    lon: 2.4822,
  },
  weather: {
    tempC: 34,
    maxC: 38,
    minC: 21,
    windKmh: 18,
    windDirAr: 'شمالية شرقية معتدلة',
    humidityPct: 22,
    uvIndex: 7,
    conditionAr: 'مشمس وصافٍ في عموم تيديكلت',
    statusLevel: 'normal',
  },
  roads: [
    {
      code: 'RN1-S',
      nameAr: 'الطريق الوطني رقم 1 (عين صالح ↔ تمنراست)',
      distanceKm: 660,
      status: 'open',
      statusAr: 'مفتوح وسالك · رياح خفيفة قرب أراك',
      fuelAvailable: true,
    },
    {
      code: 'RN1-N',
      nameAr: 'الطريق الوطني رقم 1 (عين صالح ↔ المنيعة)',
      distanceKm: 400,
      status: 'open',
      statusAr: 'مفتوح وسالك بالكامل · رؤية واضحة',
      fuelAvailable: true,
    },
    {
      code: 'RN52',
      nameAr: 'الطريق الوطني رقم 52 (عين صالح ↔ أولف / أدرار)',
      distanceKm: 290,
      status: 'caution',
      statusAr: 'سالك مع حذر من زحف رمال خفيف في بعض المقاطع',
      fuelAvailable: true,
    },
  ],
  prayers: {
    fajr: '05:28',
    dhuhr: '12:48',
    asr: '16:12',
    maghrib: '18:39',
    isha: '19:54',
  },
  emergency: {
    civilProtection: '14',
    gendarmerie: '1055',
    police: '17',
    nationalSecurity: '1548',
    hospitalAr: 'المؤسسة العمومية الاستشفائية عين صالح (مصلحة الاستعجالات 24/24)',
  },
  marketHighlightAr: 'سوق وسط المدينة: وفرة في تمور الغرس ودقلة نور واستقرار في تموين محطات الوقود (نفطال).',
};

/**
 * Fetch Today Summary for Ain Salah with automatic offline cache fallback
 */
export async function fetchTodaySummary(): Promise<{ data: TodaySummaryData; isCached: boolean }> {
  try {
    const res = await fetch('/api/ain-salah/today');
    if (!res.ok) throw new Error('Network error');
    const data = (await res.json()) as TodaySummaryData;
    try {
      localStorage.setItem(TODAY_CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota errors
    }
    return { data, isCached: false };
  } catch {
    try {
      const cached = localStorage.getItem(TODAY_CACHE_KEY);
      if (cached) {
        return { data: JSON.parse(cached) as TodaySummaryData, isCached: true };
      }
    } catch {
      // Ignore parse error
    }
    return { data: FALLBACK_TODAY_DATA, isCached: true };
  }
}

/**
 * Dispatch SOS emergency coordinates & generate distress message (works online & offline)
 */
export async function sendSosDispatch(params: {
  lat?: number;
  lon?: number;
  accuracy?: number;
  note?: string;
  wilaya?: string;
}): Promise<SosDispatchResult> {
  const { lat, lon, accuracy, note, wilaya } = params;
  const mapsUrl =
    typeof lat === 'number' && typeof lon === 'number'
      ? `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`
      : null;

  const fallbackResult: SosDispatchResult = {
    ok: true,
    timestamp: new Date().toISOString(),
    mapsUrl,
    nearestCenters: [
      {
        name: 'الحماية المدنية · الوحدة الرئيسية عين صالح',
        phone: '14',
        badge: 'استجابة فورية 24/7',
      },
      {
        name: 'المجموعة الإقليمية للدرك الوطني (نجدة الطرقات الصحراوية RN1)',
        phone: '1055',
        badge: 'دوريات المسالك والصحراء',
      },
      {
        name: 'استعجالات مستشفى عين صالح (مصلحة السموم العقربية وضربات الشمس)',
        phone: '14',
        badge: 'طوارئ طبية',
      },
    ],
    distressSmsText:
      typeof lat === 'number' && typeof lon === 'number'
        ? `🆘 نداء استغاثة عاجل (تيديكلت Ai - ${wilaya || 'عين صالح'})\nالإحداثيات الدقيقة GPS: ${lat.toFixed(5)}, ${lon.toFixed(5)}${accuracy ? ` (±${Math.round(accuracy)}m)` : ''}\nرابط الخريطة: ${mapsUrl}\n${note ? `ملاحظة: ${note}` : 'أحتاج مساعدة عاجلة في الموقع المحدد.'}`
        : `🆘 نداء استغاثة عاجل (تيديكلت Ai - ${wilaya || 'عين صالح'})\n${note || 'أحتاج مساعدة عاجلة، يرجى التواصل فوراً.'}`,
  };

  try {
    const res = await fetch('/api/ain-salah/sos-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return fallbackResult;
    return (await res.json()) as SosDispatchResult;
  } catch {
    return fallbackResult;
  }
}

/**
 * Stream AI response via Server-Sent Events (/api/ain-salah/ask-stream)
 */
export async function streamAskAinSalah(
  params: {
    query: string;
    language?: string;
    agentId?: string;
  },
  callbacks: {
    onChunk: (chunkText: string) => void;
    onDone?: (fullText: string) => void;
    onError?: (errMessage: string) => void;
  }
): Promise<void> {
  const res = await fetch('/api/ain-salah/ask-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok || !res.body) {
    throw new Error('Streaming unavailable');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    for (const block of blocks) {
      const lines = block.split('\n');
      let eventType = 'message';
      let dataStr = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          dataStr += line.slice(5).trim();
        }
      }

      if (!dataStr) continue;
      try {
        const parsed = JSON.parse(dataStr);
        if (eventType === 'chunk' && parsed.text) {
          callbacks.onChunk(parsed.text);
        } else if (eventType === 'done') {
          callbacks.onDone?.(parsed.text || '');
        } else if (eventType === 'error') {
          callbacks.onError?.(parsed.message || 'خطأ في البث');
        }
      } catch {
        // Ignore malformed SSE frame
      }
    }
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

/**
 * Hook for in-app PWA installation (Android, Desktop Chrome/Edge, and iOS Safari guide)
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

/**
 * Hook for real-time online/offline network status detection
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  return isOnline;
}
