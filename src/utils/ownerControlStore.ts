import { RafiqDriverUser, RafiqUiRide } from '../components/RafiqAlTariqModal';

export interface BannedEntity {
  id: string;
  target: string; // phone number, sender name, driver name, or association name
  type: 'phone' | 'sender' | 'driver' | 'association' | 'user';
  section: 'news' | 'charity' | 'rides' | 'maps' | 'desert' | 'general';
  reason: string;
  createdAt: number;
}

export interface StoredDesertTrip {
  id: string;
  d: string; // destination
  t: number; // return timestamp
  p: string; // emergency phone
  travelerName?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: number;
}

export interface StoredOasisPlace {
  id: number;
  name: string;
  nameAr: string;
  category: string;
  lat: string;
  lng: string;
  description?: string | null;
  phone?: string | null;
}

export interface StoredCommunityTask {
  id: number;
  title: string;
  notes?: string | null;
  status: string;
  dueDate?: string | null;
  locationName?: string | null;
  category?: string | null;
}

export interface AgentCustomOverride {
  id: string;
  name: string;
  role: string;
  emoji: string;
  customPrompt?: string;
  enabled: boolean;
}

export const BAN_LIST_STORAGE_KEY = 'tidikelt_owner_ban_list_v1';
export const RAFIQ_RIDES_STORAGE_KEY = 'tidikelt_rafiq_rides_v1';
export const RAFIQ_DRIVERS_STORAGE_KEY = 'tidikelt_rafiq_drivers_v1';
export const DESERT_TRIPS_STORAGE_KEY = 'tidikelt_desert_trips_v1';
export const DESERT_CHECKLIST_STORAGE_KEY = 'tidikelt_desert_checklist_v1';
export const OASIS_PLACES_STORAGE_KEY = 'tidikelt_oasis_places_v1';
export const COMMUNITY_TASKS_STORAGE_KEY = 'tidikelt_community_tasks_v1';
export const AGENT_OVERRIDES_STORAGE_KEY = 'tidikelt_custom_agents_v1';

export function emitOwnerSync(): void {
  try {
    window.dispatchEvent(new CustomEvent('tidikelt-owner-sync'));
    window.dispatchEvent(new CustomEvent('bab-alkhair-sync'));
  } catch {
    // ignore
  }
}

export function normalizeTarget(val: string): string {
  return String(val || '')
    .trim()
    .toLowerCase()
    .replace(/[\s.\-()]/g, '');
}

export function loadBanList(): BannedEntity[] {
  try {
    const raw = localStorage.getItem(BAN_LIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveBanList(list: BannedEntity[]): void {
  try {
    localStorage.setItem(BAN_LIST_STORAGE_KEY, JSON.stringify(list));
    emitOwnerSync();
  } catch {
    // ignore
  }
}

export function addBanEntry(params: {
  target: string;
  type?: BannedEntity['type'];
  section?: BannedEntity['section'];
  reason?: string;
}): BannedEntity | null {
  const cleanTarget = params.target.trim();
  if (!cleanTarget) return null;
  const current = loadBanList();
  const norm = normalizeTarget(cleanTarget);
  const existing = current.find((b) => normalizeTarget(b.target) === norm);
  if (existing) return existing;

  const isPhone = /^(\+?213|0)?[5-7]\d{8}$/.test(norm) || /^\d{6,}$/.test(norm);
  const entry: BannedEntity = {
    id: `ban-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    target: cleanTarget,
    type: params.type || (isPhone ? 'phone' : 'sender'),
    section: params.section || 'general',
    reason: params.reason?.trim() || 'مخالفة شروط استخدام منصة تيدكلت AI',
    createdAt: Date.now(),
  };

  const next = [entry, ...current];
  saveBanList(next);
  return entry;
}

export function removeBanEntry(idOrTarget: string): void {
  const current = loadBanList();
  const norm = normalizeTarget(idOrTarget);
  const next = current.filter(
    (b) => b.id !== idOrTarget && normalizeTarget(b.target) !== norm
  );
  saveBanList(next);
}

export function isTargetBanned(...candidates: Array<string | undefined | null>): BannedEntity | null {
  const list = loadBanList();
  if (list.length === 0) return null;
  for (const c of candidates) {
    if (!c) continue;
    const norm = normalizeTarget(c);
    if (!norm) continue;
    const found = list.find((b) => {
      const bNorm = normalizeTarget(b.target);
      return bNorm === norm || (bNorm.length >= 8 && norm.includes(bNorm));
    });
    if (found) return found;
  }
  return null;
}

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const offsetDate = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
};

export const DEFAULT_RAFIQ_DRIVERS: RafiqDriverUser[] = [
  { id: 'u0', name: 'أنت', verified: false },
  { id: 'd1', name: 'سائق رفيق الطريق', verified: true },
  { id: 'd2', name: 'ياسين', verified: true },
  { id: 'd3', name: 'محمد أمين', verified: true },
];

export const DEFAULT_RAFIQ_RIDES: RafiqUiRide[] = [
  {
    id: 'ride-dz-1',
    uid: 'd1',
    from: 'عين صالح',
    to: 'الجزائر',
    date: offsetDate(1),
    time: '06:00',
    type: 'companion',
    price: 0,
    seats: 2,
    car: 'تويوتا هايلوكس',
    note: 'رفيق قيادة يتناوب مع السائق',
    who: 'سائق رفيق الطريق',
    ok: 1,
    phone: '0555000001',
  },
  {
    id: 'ride-dz-2',
    uid: 'd2',
    from: 'عين صالح',
    to: 'تمنراست',
    date: offsetDate(0),
    time: '16:30',
    type: 'fuel',
    price: 1500,
    seats: 3,
    car: 'بيجو 406 مكيفة',
    note: 'الانطلاق من وسط المدينة',
    who: 'ياسين',
    ok: 1,
    phone: '0555000002',
  },
  {
    id: 'ride-dz-3',
    uid: 'd3',
    from: 'أدرار',
    to: 'عين صالح',
    date: offsetDate(1),
    time: '07:30',
    type: 'fuel',
    price: 1200,
    seats: 2,
    car: 'رونو سامبول',
    note: 'مرورًا بأولف وفقارة الزوى',
    who: 'محمد أمين',
    ok: 1,
    phone: '0555000003',
  },
];

export function loadRafiqDrivers(): RafiqDriverUser[] {
  try {
    const raw = localStorage.getItem(RAFIQ_DRIVERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_RAFIQ_DRIVERS;
}

export function saveRafiqDrivers(drivers: RafiqDriverUser[]): void {
  try {
    localStorage.setItem(RAFIQ_DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
    emitOwnerSync();
  } catch {
    // ignore
  }
}

export function loadRafiqRides(): RafiqUiRide[] {
  try {
    const raw = localStorage.getItem(RAFIQ_RIDES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_RAFIQ_RIDES;
}

export function saveRafiqRides(rides: RafiqUiRide[]): void {
  try {
    localStorage.setItem(RAFIQ_RIDES_STORAGE_KEY, JSON.stringify(rides));
    emitOwnerSync();
  } catch {
    // ignore
  }
}

export function loadDesertTrips(): StoredDesertTrip[] {
  const list: StoredDesertTrip[] = [];
  try {
    const rawList = localStorage.getItem(DESERT_TRIPS_STORAGE_KEY);
    if (rawList) {
      const parsed = JSON.parse(rawList);
      if (Array.isArray(parsed)) {
        list.push(...parsed);
      }
    }
    const rawActive = localStorage.getItem('trip');
    if (rawActive) {
      const active = JSON.parse(rawActive);
      if (active && active.d && active.t) {
        const exists = list.some((x) => x.t === active.t && x.d === active.d);
        if (!exists) {
          list.unshift({
            id: `trip-${active.t}`,
            d: active.d,
            t: active.t,
            p: active.p || '',
            travelerName: active.travelerName || 'مسافر مسجل',
            status: 'active',
            createdAt: Date.now(),
          });
        }
      }
    }
  } catch {
    // ignore
  }
  return list;
}

export function saveDesertTrips(trips: StoredDesertTrip[]): void {
  try {
    localStorage.setItem(DESERT_TRIPS_STORAGE_KEY, JSON.stringify(trips));
    const firstActive = trips.find((t) => t.status === 'active');
    if (firstActive) {
      localStorage.setItem(
        'trip',
        JSON.stringify({
          d: firstActive.d,
          t: firstActive.t,
          p: firstActive.p,
        })
      );
    } else {
      localStorage.removeItem('trip');
    }
    emitOwnerSync();
  } catch {
    // ignore
  }
}

export const DEFAULT_DESERT_CHECKLIST: string[] = [
  'التزود بكمية كافية من المياه الصالحة للشرب (5 لترات لكل شخص يومياً على الأقل).',
  'إبلاغ العائلة أو الحماية المدنية (14) أو الدرك الوطني (1055) بمسار الرحلة وموعد العودة.',
  'فحص الإطارات الاحتياطية، البطارية، ومستوى الوقود قبل مغادرة النطاق العمراني لعين صالح.',
  'حمل شاحن متنقل، مصباح يدوي، وحقيبة إسعافات أولية ومؤونة جافة (تمور وماء).',
  'البقاء قرب المركبة في حال التعطل لأنها أسهل في الرصد الجوي والميداني من شخص يسير منفرداً.',
];

export function loadDesertChecklist(): string[] {
  try {
    const raw = localStorage.getItem(DESERT_CHECKLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_DESERT_CHECKLIST;
}

export function saveDesertChecklist(items: string[]): void {
  try {
    localStorage.setItem(DESERT_CHECKLIST_STORAGE_KEY, JSON.stringify(items));
    emitOwnerSync();
  } catch {
    // ignore
  }
}

export const DEFAULT_OASIS_PLACES: StoredOasisPlace[] = [
  {
    id: 1,
    name: 'In Salah Hospital',
    nameAr: 'المؤسسة العمومية الاستشفائية عين صالح',
    category: 'health',
    lat: '27.1952',
    lng: '2.4810',
    description: 'المستشفى الرئيسي ومصلحة الاستعجالات الطبية بوسط مدينة عين صالح',
    phone: '029361212',
  },
  {
    id: 2,
    name: 'Old Ksar of In Salah',
    nameAr: 'القصر العتيق والمسجد العتيق - عين صالح',
    category: 'heritage',
    lat: '27.1935',
    lng: '2.4785',
    description: 'معلم تاريخي وتراثي أصيل في قلب واحة تيديكلت',
    phone: '',
  },
  {
    id: 3,
    name: 'Palm Oasis & Foggaras',
    nameAr: 'واحة النخيل والفقارات التقليدية',
    category: 'oasis',
    lat: '27.1995',
    lng: '2.4720',
    description: 'بساتين النخيل ونظام السقي التقليدي بالفقارات في عين صالح',
    phone: '',
  },
  {
    id: 4,
    name: 'Wilaya & Municipality HQ',
    nameAr: 'مقر ولاية وبلدية عين صالح',
    category: 'public_service',
    lat: '27.1982',
    lng: '2.4860',
    description: 'المصالح الإدارية والبلدية ومكتب الحالة المدنية',
    phone: '029361000',
  },
];

export function loadStoredOasisPlaces(): StoredOasisPlace[] {
  try {
    const raw = localStorage.getItem(OASIS_PLACES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_OASIS_PLACES;
}

export function saveStoredOasisPlaces(places: StoredOasisPlace[]): void {
  try {
    localStorage.setItem(OASIS_PLACES_STORAGE_KEY, JSON.stringify(places));
    emitOwnerSync();
  } catch {
    // ignore
  }
}

export function loadStoredCommunityTasks(): StoredCommunityTask[] {
  try {
    const raw = localStorage.getItem(COMMUNITY_TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveStoredCommunityTasks(tasks: StoredCommunityTask[]): void {
  try {
    localStorage.setItem(COMMUNITY_TASKS_STORAGE_KEY, JSON.stringify(tasks));
    emitOwnerSync();
  } catch {
    // ignore
  }
}

export const DEFAULT_AGENTS_LIST: AgentCustomOverride[] = [
  {
    id: 'general',
    name: 'المساعد العام لتيديكلت',
    role: 'الإجابة الشاملة وخدمات سكان عين صالح وتيديكلت',
    emoji: '🌴',
    customPrompt: '',
    enabled: true,
  },
  {
    id: 'desert',
    name: 'حارس الصحراء والطرقات',
    role: 'السلامة الصحراوية، حالة الطرق RN1، والطقس الميداني',
    emoji: '🏜️',
    customPrompt: '',
    enabled: true,
  },
  {
    id: 'admin_guide',
    name: 'دليل الوثائق والإدارة',
    role: 'إجراءات البلدية، الولاية، البريد، والملفات الإدارية',
    emoji: '🏛️',
    customPrompt: '',
    enabled: true,
  },
  {
    id: 'oasis_agri',
    name: 'خبير الواحة والفلاحة',
    role: 'غراسة النخيل، الفقارات، التمور، والفلاحة الصحراوية',
    emoji: '🌾',
    customPrompt: '',
    enabled: true,
  },
  {
    id: 'heritage',
    name: 'ذاكرة تيديكلت والتراث',
    role: 'تاريخ عين صالح، القصور العتيقة، الزوايا، والمخطوطات',
    emoji: '📜',
    customPrompt: '',
    enabled: true,
  },
  {
    id: 'health_duty',
    name: 'مرشد الصحة والمناوبة',
    role: 'الصيدليات المناوبة، الاستعجالات، والإرشاد الصحي الأولي',
    emoji: '⚕️',
    customPrompt: '',
    enabled: true,
  },
];

export function loadAgentOverrides(): AgentCustomOverride[] {
  try {
    const raw = localStorage.getItem(AGENT_OVERRIDES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return DEFAULT_AGENTS_LIST;
}

export function saveAgentOverrides(agents: AgentCustomOverride[]): void {
  try {
    localStorage.setItem(AGENT_OVERRIDES_STORAGE_KEY, JSON.stringify(agents));
    emitOwnerSync();
  } catch {
    // ignore
  }
}
