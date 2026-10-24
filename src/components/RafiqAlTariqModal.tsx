import React, { useState, useEffect, useRef } from 'react';

export type CompanionType = 'CO_DRIVER' | 'COST_SHARE' | 'FAMILY_ONLY';
export type RideFilterType = 'all' | 'companion' | 'fuel' | 'family' | 'free';
export type RideUiType = 'companion' | 'fuel' | 'family';

export interface RafiqDriverUser {
  id: string;
  name: string;
  verified?: boolean;
  banned?: boolean;
}

export interface RafiqUiRide {
  id: string | number;
  uid: string;
  from: string;
  to: string;
  date: string;
  time: string;
  type: RideUiType;
  price: number;
  seats: number;
  car: string;
  note: string;
  who: string;
  ok: number;
  phone: string;
  review?: boolean;
  edited?: boolean;
}

interface RafiqAlTariqModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  lang?: 'ar' | 'fr' | 'en';
  isAdminLoggedIn?: boolean;
  embedded?: boolean;
  onBackToChat?: () => void;
}

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const off = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
};

const TYPES: Record<RideUiType, [string, string]> = {
  companion: ['wheel', 'رفيق قيادة'],
  fuel: ['fuel', 'وقود'],
  family: ['users', 'عائلات'],
};

const INITIAL_DRIVERS: RafiqDriverUser[] = [
  { id: 'u0', name: 'أنت', verified: false },
  { id: 'd1', name: 'سائق رفيق الطريق', verified: true },
  { id: 'd2', name: 'ياسين', verified: true },
  { id: 'd3', name: 'محمد أمين', verified: true },
];

const INITIAL_RIDES: RafiqUiRide[] = [
  {
    id: 'ride-dz-1',
    uid: 'd1',
    from: 'عين صالح',
    to: 'الجزائر',
    date: off(1),
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
    date: off(0),
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
    date: off(1),
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

const Icon: React.FC<{ name: string }> = ({ name }) => (
  <svg className="i" aria-hidden="true">
    <use href={`#i-${name}`} />
  </svg>
);

export const RafiqAlTariqModal: React.FC<RafiqAlTariqModalProps> = ({
  isOpen = false,
  onClose,
  lang = 'ar',
  isAdminLoggedIn = false,
  embedded = false,
  onBackToChat,
}) => {
  const ME = 'u0';
  const [drivers, setDrivers] = useState<RafiqDriverUser[]>(INITIAL_DRIVERS);
  const [rides, setRides] = useState<RafiqUiRide[]>(INITIAL_RIDES);
  const [flt, setFlt] = useState<RideFilterType>('all');

  // Search inputs
  const [fromVal, setFromVal] = useState('عين صالح');
  const [toVal, setToVal] = useState('');
  const [dateVal, setDateVal] = useState('');
  const [paxVal, setPaxVal] = useState(1);

  // Expanded ride cards
  const [expandedIds, setExpandedIds] = useState<Record<string | number, boolean>>({});

  // Modals & Popovers
  const [isPubOpen, setIsPubOpen] = useState(false);
  const [editingRideId, setEditingRideId] = useState<string | number | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [openMenuRideId, setOpenMenuRideId] = useState<string | number | null>(null);

  // Owner / Admin Mode & Control Panel
  const [isAdminMode, setIsAdminMode] = useState<boolean>(isAdminLoggedIn);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'drivers' | 'queue'>('drivers');

  // Confirmation Dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    okLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // Publish / Edit form state
  const [pFrom, setPFrom] = useState('');
  const [pTo, setPTo] = useState('');
  const [pDate, setPDate] = useState(off(0));
  const [pTime, setPTime] = useState('');
  const [pSeats, setPSeats] = useState('3');
  const [pPrice, setPPrice] = useState('');
  const [pType, setPType] = useState<RideUiType>('fuel');
  const [pCar, setPCar] = useState('');
  const [pNote, setPNote] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAgree, setPAgree] = useState(false);

  // Toast state
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isAdminLoggedIn) {
      setIsAdminMode(true);
    }
  }, [isAdminLoggedIn]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastVisible(false);
    }, 2300);
  };

  const getDriver = (uid: string, fallbackName?: string): RafiqDriverUser =>
    drivers.find((d) => d.id === uid) || {
      id: uid,
      name: fallbackName || 'سائق رفيق الطريق',
      verified: false,
    };

  const mapServerRideToUi = (raw: any, index: number): RafiqUiRide => {
    const rawCompanion = raw?.companion_type || raw?.companionType;
    const type: RideUiType =
      rawCompanion === 'CO_DRIVER' || raw?.type === 'companion'
        ? 'companion'
        : rawCompanion === 'FAMILY_ONLY' || raw?.type === 'family'
        ? 'family'
        : 'fuel';

    const price =
      typeof raw?.price_dzd === 'number' && !Number.isNaN(raw.price_dzd)
        ? raw.price_dzd
        : typeof raw?.price === 'number' && !Number.isNaN(raw.price)
        ? raw.price
        : 0;

    const depStr = String(raw?.departure_time || raw?.departureTime || '');
    const timeMatch = depStr.match(/(\d{1,2}:\d{2})/);
    const time = raw?.time || (timeMatch ? timeMatch[1].padStart(5, '0') : '06:00');

    let date = raw?.date || off(1);
    if (!raw?.date) {
      if (depStr.includes('اليوم')) date = off(0);
      else if (depStr.includes('غد')) date = off(1);
    }

    const notesRaw = String(raw?.notes || '');
    const parts = notesRaw.split('·').map((s) => s.trim()).filter(Boolean);
    const car = raw?.car || parts[0] || '—';
    const note = raw?.note !== undefined ? raw.note : parts.slice(1).join(' · ');

    const cleanPhone = String(raw?.phone || raw?.driverPhone || `055500000${index + 1}`)
      .replace(/[\s.\-]/g, '');

    const driverName = String(raw?.who || raw?.driverName || 'سائق رفيق الطريق');
    const uid =
      raw?.uid ||
      (driverName === 'أنت'
        ? 'u0'
        : driverName === 'ياسين'
        ? 'd2'
        : driverName === 'محمد أمين'
        ? 'd3'
        : 'd1');

    return {
      id: raw?.id || index + 1,
      uid,
      from: String(raw?.from || raw?.origin || 'عين صالح'),
      to: String(raw?.to || raw?.destination || 'الجزائر'),
      date,
      time,
      type,
      price,
      seats: typeof raw?.seats === 'number' ? raw.seats : 2,
      car,
      note,
      who: driverName,
      ok: raw?.ok !== undefined ? Number(raw.ok) : uid === 'u0' ? 0 : 1,
      phone: /^0[5-7]\d{8}$/.test(cleanPhone) ? cleanPhone : '0555000001',
    };
  };

  const isVisible = embedded || Boolean(isOpen);

  useEffect(() => {
    if (!isVisible) return;
    fetch('/api/rafiq/rides')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.rides) && data.rides.length > 0) {
          setRides(data.rides.slice(0, 12).map(mapServerRideToUi));
        }
      })
      .catch(() => {});
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('.menu-wrap')) {
        setOpenMenuRideId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuRideId(null);
        setConfirmDialog(null);
        setIsAdminPanelOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const canEditRide = (r: RafiqUiRide) =>
    (r.uid === ME || r.who === 'أنت') && !getDriver(ME).banned;
  const canMenuRide = (r: RafiqUiRide) => isAdminMode || r.uid === ME || r.who === 'أنت';
  const isRideVisible = (r: RafiqUiRide) => {
    if (isAdminMode) return true;
    const d = getDriver(r.uid, r.who);
    if (d.banned) return false;
    if (r.review && r.uid !== ME && r.who !== 'أنت') return false;
    return true;
  };

  const dayLabel = (d: string) => {
    if (d === off(0)) return 'اليوم';
    if (d === off(1)) return 'غدًا';
    try {
      return new Date(`${d}T00:00`).toLocaleDateString('ar-DZ', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return d;
    }
  };

  const f = fromVal.trim();
  const t = toVal.trim();
  const d = dateVal;
  const p = Number(paxVal) || 1;

  const filteredList = rides
    .filter(
      (r) =>
        isRideVisible(r) &&
        (!f || r.from.includes(f)) &&
        (!t || r.to.includes(t)) &&
        (!d || r.date === d) &&
        (r.seats < 1 || r.seats >= p) &&
        (flt === 'all' || (flt === 'free' ? r.price === 0 : r.type === flt))
    )
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const pendingRides = rides.filter((r) => r.review);
  const bannedDriversCount = drivers.filter((dr) => dr.banned).length;

  const handleSwap = () => {
    const prevFrom = fromVal;
    setFromVal(toVal);
    setToVal(prevFrom);
  };

  const handleToggleExtra = (id: string | number) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const askConfirm = (
    title: string,
    message: string,
    okLabel: string,
    onConfirm: () => void
  ) => {
    setConfirmDialog({ title, message, okLabel, onConfirm });
  };

  const toggleVerifyDriver = (uid: string, fallbackName?: string) => {
    const target = getDriver(uid, fallbackName);
    const nextVerified = !target.verified;
    setDrivers((prev) => {
      const exists = prev.some((dr) => dr.id === uid);
      if (!exists) {
        return [...prev, { id: uid, name: target.name, verified: nextVerified }];
      }
      return prev.map((dr) =>
        dr.id === uid ? { ...dr, verified: nextVerified } : dr
      );
    });
    setRides((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, ok: nextVerified ? 1 : 0 } : r))
    );
    showToast(
      nextVerified
        ? `مُنحت علامة التوثيق لـ ${target.name}`
        : `نُزعت علامة التوثيق من ${target.name}`
    );
  };

  const toggleBanDriver = (uid: string, fallbackName?: string) => {
    const target = getDriver(uid, fallbackName);
    if (target.banned) {
      setDrivers((prev) =>
        prev.map((dr) => (dr.id === uid ? { ...dr, banned: false } : dr))
      );
      showToast(`أُلغي حظر ${target.name}`);
      return;
    }
    askConfirm(
      `حظر ${target.name}`,
      'ستُخفى كل رحلاته، ولن يستطيع نشر رحلات جديدة.',
      'حظر',
      () => {
        setDrivers((prev) => {
          const exists = prev.some((dr) => dr.id === uid);
          if (!exists) {
            return [...prev, { id: uid, name: target.name, banned: true }];
          }
          return prev.map((dr) =>
            dr.id === uid ? { ...dr, banned: true } : dr
          );
        });
        showToast(`تم حظر ${target.name}`);
      }
    );
  };

  const purgeDriverRides = (uid: string, fallbackName?: string) => {
    const target = getDriver(uid, fallbackName);
    askConfirm(
      `حذف رحلات ${target.name}`,
      'ستُحذف كل رحلات هذا السائق نهائيًا.',
      'حذف الكل',
      () => {
        const toDelete = rides.filter((r) => r.uid === uid);
        setRides((prev) => prev.filter((r) => r.uid !== uid));
        toDelete.forEach((r) => {
          fetch(`/api/rafiq/rides/${r.id}`, { method: 'DELETE' }).catch(() => {});
        });
        showToast(`حُذفت رحلات ${target.name}`);
      }
    );
  };

  const openPublishModalForNew = () => {
    if (getDriver(ME).banned) {
      showToast('حسابك محظور من النشر');
      return;
    }
    setEditingRideId(null);
    setPFrom('');
    setPTo('');
    setPDate(off(0));
    setPTime('');
    setPSeats('3');
    setPPrice('');
    setPType('fuel');
    setPCar('');
    setPNote('');
    setPPhone('');
    setPAgree(false);
    setIsPubOpen(true);
  };

  const openEditModalForRide = (ride: RafiqUiRide) => {
    setEditingRideId(ride.id);
    setPFrom(ride.from);
    setPTo(ride.to);
    setPDate(ride.date || off(0));
    setPTime(ride.time || '06:00');
    setPSeats(String(ride.seats || 1));
    setPPrice(ride.type === 'companion' ? '' : String(ride.price ?? 0));
    setPType(ride.type);
    setPCar(ride.car === '—' ? '' : ride.car);
    setPNote(ride.note || '');
    setPPhone(ride.phone || '0555000001');
    setPAgree(true);
    setIsPubOpen(true);
  };

  const handleMenuAction = (ride: RafiqUiRide, action: string) => {
    setOpenMenuRideId(null);
    if (action === 'edit') {
      openEditModalForRide(ride);
    } else if (action === 'del') {
      askConfirm(
        'حذف الرحلة',
        'سيُحذف إعلان هذه الرحلة نهائيًا.',
        'حذف',
        () => {
          setRides((prev) => prev.filter((x) => x.id !== ride.id));
          fetch(`/api/rafiq/rides/${ride.id}`, { method: 'DELETE' }).catch(
            () => {}
          );
          showToast('تم حذف الرحلة');
        }
      );
    } else if (action === 'ok') {
      setRides((prev) =>
        prev.map((x) => (x.id === ride.id ? { ...x, review: false } : x))
      );
      showToast('تم اعتماد الرحلة');
    } else if (action === 'verify') {
      toggleVerifyDriver(ride.uid, ride.who);
    } else if (action === 'ban') {
      toggleBanDriver(ride.uid, ride.who);
    }
  };

  const handleBook = async (ride: RafiqUiRide) => {
    if (ride.seats <= 0) return;
    const bookedSeats = Math.min(p, ride.seats);

    setRides((prev) =>
      prev.map((item) =>
        item.id === ride.id
          ? { ...item, seats: Math.max(0, item.seats - bookedSeats) }
          : item
      )
    );

    showToast(`تم حجز ${bookedSeats} ${bookedSeats === 1 ? 'مقعد' : 'مقاعد'}`);

    try {
      await fetch('/api/rafiq/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rideId: ride.id, seatsToBook: bookedSeats }),
      });
    } catch {
      // Optimistic local state already updated
    }
  };

  const handlePublishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (getDriver(ME).banned) {
      showToast('حسابك محظور من النشر');
      return;
    }

    const cleanFrom = pFrom.trim();
    const cleanTo = pTo.trim();
    const cleanDate = pDate.trim();
    const cleanTime = pTime.trim();
    const cleanCar = pCar.trim() || '—';
    const cleanNote = pNote.trim();
    const cleanPhone = pPhone.trim().replace(/[\s.\-]/g, '');

    if (!cleanFrom || !cleanTo || !cleanDate || !cleanTime) return;
    if (!/^0[5-7]\d{8}$/.test(cleanPhone)) {
      showToast('رقم الهاتف غير صحيح');
      return;
    }

    const newPrice = pType === 'companion' ? 0 : Math.max(0, Number(pPrice) || 0);
    const newSeats = Math.max(1, Number(pSeats) || 1);
    const companion_type: CompanionType =
      pType === 'companion'
        ? 'CO_DRIVER'
        : pType === 'family'
        ? 'FAMILY_ONLY'
        : 'COST_SHARE';
    const combinedNotes = [cleanCar !== '—' ? cleanCar : '', cleanNote]
      .filter(Boolean)
      .join(' · ');

    if (editingRideId !== null) {
      setRides((prev) =>
        prev.map((item) =>
          item.id === editingRideId
            ? {
                ...item,
                from: cleanFrom,
                to: cleanTo,
                date: cleanDate,
                time: cleanTime,
                type: pType,
                price: newPrice,
                seats: newSeats,
                car: cleanCar,
                note: cleanNote,
                phone: cleanPhone,
                edited: true,
              }
            : item
        )
      );
      setIsPubOpen(false);
      setEditingRideId(null);
      showToast('تم حفظ تعديل الرحلة');

      try {
        await fetch(`/api/rafiq/rides/${editingRideId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: cleanFrom,
            destination: cleanTo,
            departure_time: `${dayLabel(cleanDate)} · ${cleanTime}`,
            companion_type,
            price_dzd: newPrice,
            seats: newSeats,
            notes: combinedNotes || cleanCar,
            driverPhone: cleanPhone,
          }),
        });
      } catch {
        // Optimistic update already applied
      }
      return;
    }

    const meDriver = getDriver(ME, 'أنت');
    const newRide: RafiqUiRide = {
      id: Date.now(),
      uid: ME,
      from: cleanFrom,
      to: cleanTo,
      date: cleanDate,
      time: cleanTime,
      type: pType,
      price: newPrice,
      seats: newSeats,
      car: cleanCar,
      note: cleanNote,
      who: 'أنت',
      ok: meDriver.verified ? 1 : 0,
      phone: cleanPhone,
      review: !isAdminMode,
    };

    setRides((prev) => [newRide, ...prev]);
    setFlt('all');
    setFromVal('');
    setToVal('');
    setDateVal('');
    setIsPubOpen(false);

    showToast(isAdminMode ? 'تم نشر رحلتك' : 'تم نشر رحلتك (تظهر لك وللمشرف)');

    try {
      await fetch('/api/rafiq/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: cleanFrom,
          destination: cleanTo,
          departure_time: `${dayLabel(cleanDate)} · ${cleanTime}`,
          companion_type,
          price_dzd: newPrice,
          seats: newSeats,
          notes: combinedNotes || cleanCar,
          driverName: 'أنت',
          driverPhone: cleanPhone,
        }),
      });
    } catch {
      // Optimistic local state already updated
    }
  };

  return (
    <div
      className={
        embedded
          ? 'flex-1 w-full h-full min-h-0 overflow-y-auto rafiq-page relative flex flex-col bg-[var(--page)] text-[var(--ink)]'
          : 'fixed inset-0 z-50 overflow-y-auto rafiq-page'
      }
      dir="rtl"
      role={embedded ? 'region' : 'dialog'}
      aria-modal={embedded ? undefined : 'true'}
      aria-label={lang === 'ar' ? 'كاش بلاصة معك | تيديكلت AI' : 'Kash Bilasa | Tidikelt AI'}
    >
      {/* SVG Sprite Symbols */}
      <svg width="0" height="0" className="sr" aria-hidden="true">
        <defs>
          <symbol id="i-wheel" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.2" />
            <path d="M12 14.2V21M9.9 11.2 3.6 9.6M14.1 11.2l6.3-1.6" />
          </symbol>
          <symbol id="i-fuel" viewBox="0 0 24 24">
            <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0v-6l-3-3M6.5 7.5h5" />
          </symbol>
          <symbol id="i-users" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <circle cx="17.5" cy="9" r="2.4" />
            <path d="M17 14.2c2.4.2 4.5 2.1 4.5 5" />
          </symbol>
          <symbol id="i-user" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
          </symbol>
          <symbol id="i-tag" viewBox="0 0 24 24">
            <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
            <circle cx="7.5" cy="7.5" r="1.2" />
          </symbol>
          <symbol id="i-car" viewBox="0 0 24 24">
            <path d="M4 16v-4l2-5h12l2 5v4M3 16h18v3H3zM7 19v1.5M17 19v1.5M4 12h16" />
          </symbol>
          <symbol id="i-check" viewBox="0 0 24 24">
            <path d="M12 3l2.4 1.8 3-.1.9 2.9 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-.9 2.9-3-.1L12 21l-2.4-1.8-3 .1-.9-2.9-2.4-1.8.9-2.9-.9-2.9 2.4-1.8.9-2.9 3 .1z" />
            <path d="m8.8 12 2.2 2.2 4.2-4.4" />
          </symbol>
          <symbol id="i-swap" viewBox="0 0 24 24">
            <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
          </symbol>
          <symbol id="i-search" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </symbol>
          <symbol id="i-plus" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </symbol>
          <symbol id="i-down" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </symbol>
          <symbol id="i-clock" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </symbol>
          <symbol id="i-cal" viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </symbol>
          <symbol id="i-pin" viewBox="0 0 24 24">
            <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </symbol>
          <symbol id="i-help" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.3a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" />
          </symbol>
          <symbol id="i-arrow" viewBox="0 0 24 24">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </symbol>
          <symbol id="i-x" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </symbol>
          <symbol id="i-list" viewBox="0 0 24 24">
            <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
          </symbol>
          <symbol id="i-money" viewBox="0 0 24 24">
            <rect x="3" y="6" width="18" height="12" rx="3" />
            <circle cx="12" cy="12" r="2.5" />
          </symbol>
          <symbol id="i-phone" viewBox="0 0 24 24">
            <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />
          </symbol>
          <symbol id="i-chat" viewBox="0 0 24 24">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          </symbol>
          <symbol id="i-shield" viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
            <path d="M12 8v5M12 16h.01" />
          </symbol>
          <symbol id="i-dots" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.3" />
            <circle cx="12" cy="12" r="1.3" />
            <circle cx="19" cy="12" r="1.3" />
          </symbol>
          <symbol id="i-edit" viewBox="0 0 24 24">
            <path d="M4 20h4L19 9l-4-4L4 16z" />
            <path d="m13.5 6.5 4 4" />
          </symbol>
          <symbol id="i-trash" viewBox="0 0 24 24">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </symbol>
          <symbol id="i-ban" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="m5.6 5.6 12.8 12.8" />
          </symbol>
          <symbol id="i-panel" viewBox="0 0 24 24">
            <rect x="3" y="3" width="8" height="8" rx="2" />
            <rect x="13" y="3" width="8" height="5" rx="2" />
            <rect x="13" y="10" width="8" height="11" rx="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" />
          </symbol>
          <symbol id="i-shieldok" viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
            <path d="m8.8 12 2.2 2.2 4.2-4.4" />
          </symbol>
        </defs>
      </svg>

      {/* Top Sticky Bar */}
      <header className="bar">
        <div className="bar-in">
          <div className="brand">
            <span className="mark">
              <Icon name="wheel" />
            </span>
            <span title="Kash Bilasa">{lang === 'ar' ? 'كاش بلاصة معك' : 'Kash Bilasa'}</span>
          </div>
          <button
            className="icon-btn"
            id="pBtn"
            type="button"
            hidden={!isAdminMode}
            onClick={() => setIsAdminPanelOpen(true)}
            aria-label="لوحة تحكم المالك"
            title="لوحة تحكم المالك"
          >
            <Icon name="panel" />
          </button>
          <button
            className="icon-btn"
            id="helpBtn"
            type="button"
            onClick={() => setIsHelpOpen(true)}
            aria-label="كيف تعمل الخدمة؟"
          >
            <Icon name="help" />
          </button>
          <button
            className="pub"
            id="pubBtn"
            type="button"
            onClick={openPublishModalForNew}
          >
            <Icon name="plus" />
            انشر
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={onBackToChat || onClose}
            aria-label={embedded ? 'العودة إلى المحادثة' : 'إغلاق'}
            title={embedded ? 'العودة إلى المحادثة الذكية' : 'العودة إلى المحادثة'}
          >
            {embedded ? <Icon name="arrow" /> : <Icon name="x" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <form
          className="search"
          id="sf"
          autoComplete="off"
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="route-box">
            <div className="dots" aria-hidden="true">
              <i></i>
              <b></b>
              <i className="sq"></i>
            </div>
            <div className="inputs">
              <input
                id="from"
                aria-label="من"
                placeholder="من أين؟"
                value={fromVal}
                onChange={(e) => setFromVal(e.target.value)}
              />
              <input
                id="to"
                aria-label="إلى"
                placeholder="إلى أين؟"
                value={toVal}
                onChange={(e) => setToVal(e.target.value)}
              />
            </div>
            <button
              className="swap"
              id="swap"
              type="button"
              onClick={handleSwap}
              aria-label="تبديل الانطلاق والوجهة"
            >
              <Icon name="swap" />
            </button>
          </div>
          <div className="row2">
            <label className="cf date">
              <Icon name="cal" />
              <input
                type="date"
                id="date"
                min={off(0)}
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                aria-label="موعد السفر"
              />
            </label>
            <label className="cf pax">
              <Icon name="user" />
              <select
                id="pax"
                aria-label="عدد الركاب"
                value={paxVal}
                onChange={(e) => setPaxVal(Number(e.target.value))}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </label>
            <button className="go" type="submit" aria-label="بحث">
              <Icon name="search" />
              <span className="search-label">بحث</span>
            </button>
          </div>
        </form>

        <div className="chips" id="chips" role="group" aria-label="نوع الرحلة">
          <button
            className="chip"
            type="button"
            data-f="all"
            aria-pressed={flt === 'all'}
            onClick={() => setFlt('all')}
          >
            <Icon name="list" />
            الكل
          </button>
          <button
            className="chip"
            type="button"
            data-f="companion"
            aria-pressed={flt === 'companion'}
            onClick={() => setFlt('companion')}
          >
            <Icon name="wheel" />
            رفيق قيادة
          </button>
          <button
            className="chip"
            type="button"
            data-f="fuel"
            aria-pressed={flt === 'fuel'}
            onClick={() => setFlt('fuel')}
          >
            <Icon name="fuel" />
            وقود
          </button>
          <button
            className="chip"
            type="button"
            data-f="family"
            aria-pressed={flt === 'family'}
            onClick={() => setFlt('family')}
          >
            <Icon name="users" />
            عائلات
          </button>
          <button
            className="chip"
            type="button"
            data-f="free"
            aria-pressed={flt === 'free'}
            onClick={() => setFlt('free')}
          >
            <Icon name="tag" />
            مجانًا
          </button>
        </div>

        <div className="notice" role="note">
          <Icon name="shield" />
          <span>
            المنصة وسيط فقط بين السائق والراكب، ولا تتحمل أي مسؤولية عن الرحلات. سافر بحيطة وحذر.
          </span>
        </div>

        <div className="count" id="count" aria-live="polite">
          <Icon name="list" />
          {filteredList.length}
          {filteredList.length === 1 ? ' رحلة' : ' رحلات'}
        </div>

        <div className="list" id="list">
          {filteredList.length === 0 ? (
            <div className="empty">
              <Icon name="search" />
              <div>لا توجد رحلات على هذا الخط</div>
            </div>
          ) : (
            filteredList.map((r) => {
              const typeMeta = TYPES[r.type] || TYPES.fuel;
              const isOpenExtra = Boolean(expandedIds[r.id]);
              const priceVal = Number(r.price ?? 0);
              const driver = getDriver(r.uid, r.who);
              const isVerified = Boolean(driver.verified || r.ok);
              const isBanned = Boolean(driver.banned);
              const isMine = canEditRide(r);
              const showMenu = canMenuRide(r);
              const isMenuOpen = openMenuRideId === r.id;

              return (
                <article
                  className={`card${isBanned ? ' banned' : ''}`}
                  key={r.id}
                  data-id={r.id}
                >
                  <div className="top">
                    <div className="when">
                      <b>{r.time}</b>
                      <small>{dayLabel(r.date)}</small>
                    </div>
                    <div className="route">
                      <span>{r.from}</span>
                      <Icon name="arrow" />
                      <span>{r.to}</span>
                    </div>
                    {priceVal === 0 ? (
                      <div className="price free">مجانًا</div>
                    ) : (
                      <div className="price">
                        {priceVal.toLocaleString('en-US')} <small>دج</small>
                      </div>
                    )}
                  </div>

                  <div className="meta">
                    <span className={`pill ${r.type}`}>
                      <Icon name={typeMeta[0]} />
                      {typeMeta[1]}
                    </span>
                    <span className="m" aria-label="المقاعد المتاحة">
                      <Icon name="users" />
                      {r.seats}
                    </span>
                    {r.edited && <span className="badge-pill">عُدّل</span>}
                    {r.review && <span className="badge-pill rev">قيد المراجعة</span>}
                    {isBanned && <span className="badge-pill ban">محظور</span>}
                  </div>

                  {isOpenExtra && (
                    <div className="extra">
                      <div>
                        <Icon name="car" />
                        {r.car}
                      </div>
                      {r.note ? (
                        <div>
                          <Icon name="pin" />
                          {r.note}
                        </div>
                      ) : null}
                      {r.phone ? (
                        <div className="contact">
                          <a className="cbtn call" href={`tel:+213${r.phone.slice(1)}`}>
                            <Icon name="phone" />
                            اتصال
                          </a>
                          <a
                            className="cbtn wa"
                            href={`https://wa.me/213${r.phone.slice(1)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Icon name="chat" />
                            واتساب
                          </a>
                        </div>
                      ) : null}
                      <div className="warn">
                        <Icon name="shield" />
                        تأكد من التفاصيل قبل السفر. المنصة وسيط فقط.
                      </div>
                    </div>
                  )}

                  <div className="foot">
                    <span className="avatar">{(r.who || 'س').charAt(0)}</span>
                    <span>{r.who}</span>
                    {isVerified ? (
                      <span className="ok" title="موثّق" aria-label="موثّق">
                        <Icon name="check" />
                      </span>
                    ) : null}

                    <div className="spacer" />

                    {showMenu && (
                      <div className="menu-wrap">
                        <button
                          className="menu-btn"
                          type="button"
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                          aria-label="خيارات الرحلة"
                          title="خيارات الرحلة"
                          onClick={() =>
                            setOpenMenuRideId((prev) =>
                              prev === r.id ? null : r.id
                            )
                          }
                        >
                          <Icon name="dots" />
                        </button>

                        <div
                          className={`pop${isMenuOpen ? ' show' : ''}`}
                          role="menu"
                        >
                          {(isMine || isAdminMode) && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleMenuAction(r, 'edit')}
                            >
                              <Icon name="edit" />
                              تعديل الرحلة
                            </button>
                          )}
                          {(isMine || isAdminMode) && (
                            <button
                              type="button"
                              role="menuitem"
                              className="danger"
                              onClick={() => handleMenuAction(r, 'del')}
                            >
                              <Icon name="trash" />
                              حذف الرحلة
                            </button>
                          )}
                          {isAdminMode && (
                            <>
                              <hr />
                              <div className="lbl">
                                <Icon name="shieldok" />
                                صلاحيات المالك
                              </div>
                              {r.review && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleMenuAction(r, 'ok')}
                                >
                                  <Icon name="check" />
                                  اعتماد النشر
                                </button>
                              )}
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleMenuAction(r, 'verify')}
                              >
                                <Icon name="shieldok" />
                                {isVerified
                                  ? 'نزع علامة التوثيق'
                                  : 'منح علامة التوثيق'}
                              </button>
                              {r.uid !== ME && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  className={!isBanned ? 'danger' : ''}
                                  onClick={() => handleMenuAction(r, 'ban')}
                                >
                                  <Icon name="ban" />
                                  {isBanned
                                    ? 'إلغاء حظر السائق'
                                    : 'حظر السائق'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      className="more"
                      type="button"
                      aria-expanded={isOpenExtra}
                      aria-label="التفاصيل"
                      onClick={() => handleToggleExtra(r.id)}
                    >
                      <Icon name="down" />
                    </button>
                    <button
                      className="book"
                      type="button"
                      disabled={r.seats < 1}
                      onClick={() => handleBook(r)}
                    >
                      {r.seats < 1 ? (
                        'مكتمل'
                      ) : (
                        <>
                          <Icon name="check" />
                          احجز
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Owner / Admin Mode Preview Toggle */}
        <button
          className="devtog"
          id="aBtn"
          type="button"
          aria-pressed={isAdminMode}
          onClick={() => {
            const next = !isAdminMode;
            setIsAdminMode(next);
            if (!next) setIsAdminPanelOpen(false);
            showToast(
              next ? 'وضع المالك والمشرف مفعّل' : 'وضع المالك والمشرف متوقف'
            );
          }}
        >
          <Icon name="shieldok" />
          <span>معاينة: صلاحيات المالك والمشرف</span>
        </button>
      </main>

      {/* Publish / Edit Ride Dialog */}
      {isPubOpen && (
        <div
          className="dlg-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPubOpen(false);
              setEditingRideId(null);
            }
          }}
        >
          <div
            className="dlg-box"
            role="dialog"
            aria-modal="true"
            aria-label={editingRideId !== null ? 'تعديل الرحلة' : 'انشر رحلة'}
          >
            <form className="dlg" id="pf" onSubmit={handlePublishSubmit}>
              <h2>
                <Icon name={editingRideId !== null ? 'edit' : 'plus'} />
                {editingRideId !== null ? 'تعديل الرحلة' : 'انشر رحلة'}
              </h2>
              <label className="cf">
                <Icon name="pin" />
                <input
                  id="p-from"
                  required
                  placeholder="من"
                  aria-label="من"
                  value={pFrom}
                  onChange={(e) => setPFrom(e.target.value)}
                />
              </label>
              <label className="cf">
                <Icon name="pin" />
                <input
                  id="p-to"
                  required
                  placeholder="إلى"
                  aria-label="إلى"
                  value={pTo}
                  onChange={(e) => setPTo(e.target.value)}
                />
              </label>
              <div className="grid2">
                <label className="cf">
                  <Icon name="cal" />
                  <input
                    type="date"
                    id="p-date"
                    required
                    min={off(0)}
                    value={pDate}
                    onChange={(e) => setPDate(e.target.value)}
                    aria-label="التاريخ"
                  />
                </label>
                <label className="cf">
                  <Icon name="clock" />
                  <input
                    type="time"
                    id="p-time"
                    required
                    value={pTime}
                    onChange={(e) => setPTime(e.target.value)}
                    aria-label="الوقت"
                  />
                </label>
                <label className="cf">
                  <Icon name="users" />
                  <input
                    type="number"
                    id="p-seats"
                    min={1}
                    max={8}
                    value={pSeats}
                    onChange={(e) => setPSeats(e.target.value)}
                    required
                    aria-label="المقاعد المتاحة"
                  />
                </label>
                <label className="cf">
                  <Icon name="money" />
                  <input
                    type="number"
                    id="p-price"
                    min={0}
                    step={100}
                    placeholder="دج / مقعد"
                    value={pType === 'companion' ? '' : pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    disabled={pType === 'companion'}
                    aria-label="السعر بالدينار للمقعد"
                  />
                </label>
              </div>
              <label className="cf">
                <Icon name="wheel" />
                <select
                  id="p-type"
                  aria-label="نوع الرحلة"
                  value={pType}
                  onChange={(e) => {
                    const nextType = e.target.value as RideUiType;
                    setPType(nextType);
                    if (nextType === 'companion') setPPrice('');
                  }}
                >
                  <option value="companion">رفيق قيادة (مجانًا)</option>
                  <option value="fuel">تقاسم وقود</option>
                  <option value="family">عائلات</option>
                </select>
              </label>
              <label className="cf">
                <Icon name="car" />
                <input
                  id="p-car"
                  placeholder="السيارة (اختياري)"
                  aria-label="السيارة"
                  value={pCar}
                  onChange={(e) => setPCar(e.target.value)}
                />
              </label>
              <label className="cf">
                <Icon name="pin" />
                <input
                  id="p-note"
                  placeholder="ملاحظات الطريق أو نقطة الالتقاء (اختياري)"
                  aria-label="ملاحظات الطريق"
                  value={pNote}
                  onChange={(e) => setPNote(e.target.value)}
                />
              </label>
              <label className="cf">
                <Icon name="phone" />
                <input
                  type="tel"
                  inputMode="tel"
                  id="p-phone"
                  required
                  placeholder="رقم الهاتف 05XXXXXXXX"
                  aria-label="رقم هاتفك للتواصل"
                  dir="ltr"
                  className="text-right"
                  value={pPhone}
                  onChange={(e) => setPPhone(e.target.value)}
                />
              </label>
              <label className="agree">
                <input
                  type="checkbox"
                  id="p-agree"
                  required
                  checked={pAgree}
                  onChange={(e) => setPAgree(e.target.checked)}
                />
                <span>
                  أفهم أن المنصة وسيط فقط ولا تتحمل مسؤولية الرحلة، وأن رقمي سيظهر للمسافرين.
                </span>
              </label>
              <div className="dlg-actions">
                <button className="go" type="submit">
                  <Icon name={editingRideId !== null ? 'check' : 'plus'} />
                  <span>{editingRideId !== null ? 'حفظ التعديل' : 'نشر'}</span>
                </button>
                <button
                  className="ghost"
                  type="button"
                  id="pClose"
                  onClick={() => {
                    setIsPubOpen(false);
                    setEditingRideId(null);
                  }}
                  aria-label="إغلاق"
                >
                  <Icon name="x" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Owner / Admin Control Panel Dialog */}
      {isAdminPanelOpen && (
        <div
          className="dlg-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAdminPanelOpen(false);
          }}
        >
          <div
            className="dlg-box"
            role="dialog"
            aria-modal="true"
            aria-label={lang === 'ar' ? 'لوحة تحكم المالك — كاش بلاصة معك' : 'Owner Panel — Kash Bilasa'}
          >
            <div className="dlg">
              <h2>
                <Icon name="panel" />
                <span>لوحة تحكم المالك</span>
                <button
                  className="icon-btn ms-auto"
                  type="button"
                  aria-label="إغلاق"
                  onClick={() => setIsAdminPanelOpen(false)}
                >
                  <Icon name="x" />
                </button>
              </h2>

              <div className="stat-row">
                <div className="stat">
                  <Icon name="car" />
                  <b>{rides.length}</b>
                  <span className="sr">الرحلات</span>
                </div>
                <div className="stat">
                  <Icon name="clock" />
                  <b>{pendingRides.length}</b>
                  <span className="sr">بانتظار المراجعة</span>
                </div>
                <div className="stat">
                  <Icon name="ban" />
                  <b>{bannedDriversCount}</b>
                  <span className="sr">المحظورون</span>
                </div>
              </div>

              <div className="chips" role="group" aria-label="أقسام اللوحة">
                <button
                  className="chip"
                  type="button"
                  aria-pressed={adminTab === 'drivers'}
                  onClick={() => setAdminTab('drivers')}
                >
                  <Icon name="users" />
                  السائقون والناشرون
                </button>
                <button
                  className="chip"
                  type="button"
                  aria-pressed={adminTab === 'queue'}
                  onClick={() => setAdminTab('queue')}
                >
                  <Icon name="clock" />
                  المراجعة {pendingRides.length}
                </button>
              </div>

              <div>
                {adminTab === 'drivers' ? (
                  drivers.map((dr) => {
                    const count = rides.filter((r) => r.uid === dr.id).length;
                    return (
                      <div key={dr.id} className="urow">
                        <span className="avatar" aria-hidden="true">
                          {dr.name.charAt(0)}
                        </span>
                        <div className="who-col">
                          <div className="who-line">
                            <span>{dr.name}</span>
                            {dr.verified && (
                              <span className="ok" title="موثّق" aria-label="موثّق">
                                <Icon name="check" />
                              </span>
                            )}
                            {dr.banned && (
                              <span className="badge-pill ban">محظور</span>
                            )}
                          </div>
                          <div className="who-meta">
                            {count} {count === 1 ? 'رحلة' : 'رحلات'}
                          </div>
                        </div>

                        <button
                          className="tgl vf"
                          type="button"
                          aria-pressed={!!dr.verified}
                          title={dr.verified ? 'نزع التوثيق' : 'منح التوثيق'}
                          aria-label={
                            dr.verified ? 'نزع علامة التوثيق' : 'منح علامة التوثيق'
                          }
                          onClick={() => toggleVerifyDriver(dr.id, dr.name)}
                        >
                          <Icon name="shieldok" />
                        </button>

                        {dr.id !== ME && (
                          <button
                            className="tgl bn"
                            type="button"
                            aria-pressed={!!dr.banned}
                            title={dr.banned ? 'إلغاء الحظر' : 'حظر السائق'}
                            aria-label={dr.banned ? 'إلغاء الحظر' : 'حظر السائق'}
                            onClick={() => toggleBanDriver(dr.id, dr.name)}
                          >
                            <Icon name="ban" />
                          </button>
                        )}

                        <button
                          className="tgl dl"
                          type="button"
                          title="حذف كل رحلاته"
                          aria-label="حذف كل رحلاته"
                          onClick={() => purgeDriverRides(dr.id, dr.name)}
                        >
                          <Icon name="trash" />
                        </button>
                      </div>
                    );
                  })
                ) : pendingRides.length === 0 ? (
                  <div className="empty">
                    <Icon name="check" />
                    <div>لا توجد رحلات بانتظار المراجعة</div>
                  </div>
                ) : (
                  pendingRides.map((r) => {
                    const dr = getDriver(r.uid, r.who);
                    return (
                      <div key={r.id} className="q-item">
                        <div className="who-line">
                          <span>{dr.name}</span>
                          {dr.verified && (
                            <span className="ok" title="موثّق">
                              <Icon name="check" />
                            </span>
                          )}
                          <span className="who-meta">
                            · {dayLabel(r.date)} {r.time}
                          </span>
                        </div>
                        <p>
                          {r.from} ← {r.to} ({r.car}) ·{' '}
                          {r.price === 0 ? 'مجانًا' : `${r.price} دج`}
                        </p>
                        <div className="q-acts">
                          <button
                            type="button"
                            className="ap"
                            onClick={() => {
                              setRides((prev) =>
                                prev.map((x) =>
                                  x.id === r.id ? { ...x, review: false } : x
                                )
                              );
                              showToast('تم اعتماد الرحلة');
                            }}
                          >
                            <Icon name="check" />
                            اعتماد
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRides((prev) =>
                                prev.filter((x) => x.id !== r.id)
                              );
                              fetch(`/api/rafiq/rides/${r.id}`, {
                                method: 'DELETE',
                              }).catch(() => {});
                              showToast('تم رفض وحذف الرحلة');
                            }}
                          >
                            <Icon name="x" />
                            رفض
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div
          className="dlg-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div className="dlg-box" role="dialog" aria-modal="true">
            <div className="dlg">
              <h2>{confirmDialog.title}</h2>
              <p>{confirmDialog.message}</p>
              <div className="dlg-actions">
                <button
                  className="go danger"
                  type="button"
                  onClick={() => {
                    const fn = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    fn();
                  }}
                >
                  {confirmDialog.okLabel}
                </button>
                <button
                  className="ghost"
                  type="button"
                  aria-label="إلغاء"
                  onClick={() => setConfirmDialog(null)}
                >
                  <Icon name="x" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Dialog */}
      {isHelpOpen && (
        <div
          className="dlg-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsHelpOpen(false);
          }}
        >
          <div className="dlg-box" role="dialog" aria-modal="true" aria-label="كيف تعمل؟">
            <div className="dlg">
              <h2>
                <Icon name="help" />
                كيف تعمل؟
              </h2>
              <div className="steps">
                <div>
                  <Icon name="search" />
                  ابحث
                </div>
                <div>
                  <Icon name="check" />
                  احجز
                </div>
                <div>
                  <Icon name="car" />
                  سافر
                </div>
              </div>
              <button
                className="go"
                type="button"
                id="hClose"
                onClick={() => setIsHelpOpen(false)}
              >
                <span className="inline">تم</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <div className={`toast ${toastVisible ? 'show' : ''}`} id="toast" role="status">
        {toastMsg}
      </div>
    </div>
  );
};

export default RafiqAlTariqModal;
