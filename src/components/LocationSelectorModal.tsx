import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  X,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  ALGERIA_WILAYAS,
  WilayaInfo,
  VisitorLocationState,
  findNearestWilaya,
  IN_SALAH_COORDS,
  getDistanceFromLatLonInKm,
} from '../utils/geoLocations';
import { Language, Translations } from '../i18n/translations';

interface LocationSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: VisitorLocationState;
  onSelectLocation: (newLocation: VisitorLocationState) => void;
  lang: Language;
  t: Translations;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  onSelectLocation,
  lang,
  t,
}) => {
  const [search, setSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGpsDetect = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setIsLocating(false);
      setLocationError(
        lang === 'ar'
          ? 'المتصفح لا يدعم تحديد الموقع الجغرافي.'
          : lang === 'en'
          ? 'Geolocation is not supported by this browser.'
          : 'La géolocalisation n\'est pas prise en charge par ce navigateur.'
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        const nearest = findNearestWilaya(lat, lng);
        const newState: VisitorLocationState = {
          wilaya: nearest,
          lat,
          lng,
          isGps: true,
          accuracyMeters: accuracy,
          detectedAt: Date.now(),
        };

        onSelectLocation(newState);
        onClose();
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        setLocationError(
          lang === 'ar'
            ? 'تعذر تحديد الموقع تلقائياً. تأكد من تفعيل الـ GPS والسماح للموقع، أو اختر ولايتك يدوياً من القائمة.'
            : lang === 'en'
            ? 'Could not retrieve GPS location. Please allow location access or pick your wilaya manually.'
            : 'Impossible d\'obtenir la position GPS. Veuillez autoriser l\'accès ou choisir manuellement.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const handleManualSelect = (wilaya: WilayaInfo) => {
    const newState: VisitorLocationState = {
      wilaya,
      lat: wilaya.lat,
      lng: wilaya.lng,
      isGps: false,
      detectedAt: Date.now(),
    };
    onSelectLocation(newState);
    onClose();
  };

  const getWilayaName = (w: WilayaInfo) => {
    if (lang === 'ar') return w.nameAr;
    if (lang === 'fr') return w.nameFr;
    return w.nameEn;
  };

  const filteredWilayas = ALGERIA_WILAYAS.filter((w) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      w.nameAr.includes(q) ||
      w.nameEn.toLowerCase().includes(q) ||
      w.nameFr.toLowerCase().includes(q) ||
      String(w.code).includes(q)
    );
  });

  const popularSaharaWilayas = ALGERIA_WILAYAS.filter((w) =>
    ['tamanrasset', 'in_salah', 'adrar', 'el_meniaa', 'timimoun', 'ghardaia', 'ouargla', 'illizi'].includes(
      w.id
    )
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="bg-[var(--card)] border border-[var(--line)] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--line)] flex items-center justify-between gap-3 bg-[var(--bg)]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--green)]/15 text-[var(--green)] flex items-center justify-center">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 id="location-modal-title" className="text-sm font-bold text-[var(--ink)] m-0">
                {t.changeWilaya}
              </h3>
              <p className="text-[11px] text-[var(--mute)] m-0">
                {t.chooseWilaya}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
            title={t.closeMenu}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Detection Bar */}
        <div className="p-4 border-b border-[var(--line)] bg-[var(--card)] space-y-3">
          <button
            onClick={handleGpsDetect}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-[var(--green)] hover:from-emerald-700 hover:to-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-900/10 cursor-pointer transition-all disabled:opacity-60"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.detectingLocation}</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>{t.detectLocation}</span>
              </>
            )}
          </button>

          {locationError && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{locationError}</span>
            </div>
          )}

          {/* Current location banner */}
          <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <span className="text-[var(--mute)] text-[10px] block">
                  {t.yourLocation}:
                </span>
                <b className="text-[var(--ink)] font-bold text-sm">
                  {getWilayaName(currentLocation.wilaya)}
                </b>
              </div>
            </div>

            <div className="text-right rtl:text-left text-[11px] text-[var(--mute)]">
              {currentLocation.wilaya.distanceFromInSalahKm > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-[var(--ink)]">
                  {currentLocation.wilaya.distanceFromInSalahKm} {t.kmFromInSalah}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {lang === 'ar' ? 'مقر المساعد الرئيسي' : 'HQ Oasis'}
                </span>
              )}
              <div className="text-[10px] text-[var(--mute)]">
                {currentLocation.isGps ? `🛰️ ${t.gpsActive}` : `📍 ${t.manualLocation}`}
              </div>
            </div>
          </div>

          {/* Quick Sahara Wilayas Pills */}
          <div>
            <span className="text-[10px] text-[var(--mute)] block mb-1.5 font-semibold">
              {lang === 'ar'
                ? 'ولايات ومناطق شائعة في الصحراء:'
                : lang === 'en'
                ? 'Quick Saharan Wilayas:'
                : 'Régions sahariennes courantes :'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {popularSaharaWilayas.map((pw) => {
                const isSelected = currentLocation.wilaya.id === pw.id;
                return (
                  <button
                    key={pw.id}
                    onClick={() => handleManualSelect(pw)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--green)] text-white border-[var(--green)] shadow-xs'
                        : 'bg-[var(--bg)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--green)]/50'
                    }`}
                  >
                    {pw.id === 'tamanrasset' && '📍 '}
                    {getWilayaName(pw)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-[var(--line)] bg-[var(--bg)]/30">
          <div className="relative">
            <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-[var(--mute)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                lang === 'ar'
                  ? 'ابحث باسم الولاية أو رقمها (مثلاً: تمنراست، أدرار، 11...)'
                  : lang === 'en'
                  ? 'Search by Wilaya name or number (e.g. Tamanrasset, 11)...'
                  : 'Rechercher par nom ou numéro (ex. Tamanrasset, 11)...'
              }
              className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
            />
          </div>
        </div>

        {/* Scrollable Wilayas List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-72">
          {filteredWilayas.map((wilaya) => {
            const isSelected = currentLocation.wilaya.id === wilaya.id;
            return (
              <button
                key={wilaya.id}
                onClick={() => handleManualSelect(wilaya)}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--green)]/15 border border-[var(--green)] text-[var(--ink)] font-bold'
                    : 'hover:bg-[var(--bg)] border border-transparent text-[var(--ink)]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-lg bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-[10px] font-bold text-[var(--mute)]">
                    {wilaya.code}
                  </span>
                  <div className="text-start">
                    <span className="font-bold block">
                      {getWilayaName(wilaya)}
                      {wilaya.id === 'tamanrasset' && (
                        <span className="ms-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                          (الصحراء الكبرى)
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-[var(--mute)]">
                      {wilaya.isSahara
                        ? lang === 'ar'
                          ? 'إقليم صحراوي'
                          : 'Saharan Region'
                        : lang === 'ar'
                        ? 'إقليم شمالي'
                        : 'Northern Region'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--mute)] font-mono">
                    {wilaya.distanceFromInSalahKm > 0
                      ? `${wilaya.distanceFromInSalahKm} ${t.kmFromInSalah}`
                      : '0 كم'}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-[var(--green)]" />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--line)] bg-[var(--bg)]/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--card)] border border-[var(--line)] text-xs text-[var(--ink)] font-semibold hover:bg-[var(--bg)] cursor-pointer"
          >
            {lang === 'ar' ? 'تم' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
