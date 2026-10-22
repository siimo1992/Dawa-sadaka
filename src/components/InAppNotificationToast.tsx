import React, { useEffect, useState, useRef } from 'react';
import {
  Flame,
  Wind,
  CloudRain,
  X,
  ExternalLink,
  CheckCircle2,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export interface VerifiedBriefItem {
  id: string;
  source: string;
  text: string;
  categoryName?: string;
  categoryEmoji?: string;
  isWeatherAlert?: boolean;
}

export interface AppNotification {
  id: string;
  type: 'news' | 'weather' | 'system' | 'comprehensive_brief';
  title: string;
  message: string;
  source?: string;
  isVerified?: boolean;
  verifiedItems?: VerifiedBriefItem[];
  category?: string;
  categoryName?: string;
  categoryEmoji?: string;
  categoryBadgeClass?: string;
  severity?: 'danger' | 'warning' | 'info';
  timestamp: number;
  duration?: number; // ms, default 9000
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastItemProps {
  notification: AppNotification;
  onDismiss: (id: string) => void;
  isOwnerLoggedIn?: boolean;
  onDisablePermanently?: () => void;
}

function ToastItem({
  notification,
  onDismiss,
  isOwnerLoggedIn = false,
  onDisablePermanently,
}: ToastItemProps) {
  const duration = notification.duration ?? 9500;
  const [isPaused, setIsPaused] = useState(false);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(duration);

  const verifiedItems = notification.verifiedItems || [];
  const hasMultipleSlides = verifiedItems.length > 1;

  useEffect(() => {
    if (duration <= 0) return;

    let animFrame: number;
    startTimeRef.current = Date.now();

    const tick = () => {
      if (!isPaused) {
        const elapsed = Date.now() - startTimeRef.current;
        const remaining = Math.max(0, remainingTimeRef.current - elapsed);
        if (remaining <= 0) {
          onDismiss(notification.id);
          return;
        }
      }
      animFrame = requestAnimationFrame(tick);
    };

    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, [isPaused, duration, notification.id, onDismiss]);

  const handleMouseEnter = () => {
    setIsPaused(true);
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    startTimeRef.current = Date.now();
    setIsPaused(false);
  };

  const getWeatherStyle = (severity?: 'danger' | 'warning' | 'info') => {
    switch (severity) {
      case 'danger':
        return {
          wrapper:
            'bg-gradient-to-r from-rose-950/95 via-stone-900/95 to-stone-950/95 border-rose-500/70 text-rose-100 shadow-rose-950/40',
          badge: 'bg-rose-500 text-white font-bold',
          icon: <Flame className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />,
          typeLabel: 'موجز شامل · تحذير طارئ وأخبار موثقة',
        };
      case 'info':
        return {
          wrapper:
            'bg-gradient-to-r from-emerald-950/95 via-stone-900/95 to-stone-950/95 border-emerald-500/70 text-emerald-100 shadow-emerald-950/40',
          badge: 'bg-emerald-600 text-white font-bold',
          icon: <CloudRain className="w-5 h-5 text-emerald-400 shrink-0" />,
          typeLabel: 'موجز شامل · أخبار موثقة وحالة الطقس',
        };
      case 'warning':
      default:
        return {
          wrapper:
            'bg-gradient-to-r from-amber-950/95 via-stone-900/95 to-stone-950/95 border-amber-500/70 text-amber-100 shadow-amber-950/40',
          badge: 'bg-amber-500 text-slate-950 font-bold',
          icon: <Wind className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />,
          typeLabel: 'موجز شامل · تنبيه جوي وأخبار موثقة',
        };
    }
  };

  const isComprehensiveOrWeather =
    notification.type === 'weather' || notification.type === 'comprehensive_brief';
  const weatherStyle = isComprehensiveOrWeather ? getWeatherStyle(notification.severity) : null;
  const activeSlide =
    verifiedItems.length > 0
      ? verifiedItems[activeSlideIndex % verifiedItems.length]
      : null;

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-top-3 fade-in max-w-sm sm:max-w-md w-full ${
        isComprehensiveOrWeather && weatherStyle
          ? weatherStyle.wrapper
          : 'bg-[var(--card)]/95 border-[var(--green)]/40 text-[var(--ink)] shadow-emerald-950/20'
      }`}
      role="alert"
      aria-live="assertive"
    >
      {/* Top Header Row with Icon, Badges, and Close Button */}
      <div className="p-3.5 pb-3 flex items-start gap-3">
        {/* Leading Icon */}
        <div className="mt-0.5 shrink-0">
          {isComprehensiveOrWeather && weatherStyle ? (
            weatherStyle.icon
          ) : (
            <div className="w-8 h-8 rounded-xl bg-[var(--green)]/15 text-[var(--green)] flex items-center justify-center font-bold text-base shadow-xs">
              {notification.categoryEmoji || '📰'}
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0 pr-0.5">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {isComprehensiveOrWeather && weatherStyle ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${weatherStyle.badge}`}>
                {weatherStyle.typeLabel}
              </span>
            ) : (
              <>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green)] text-white font-bold shadow-2xs inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{notification.isVerified !== false ? 'خبر موثق' : 'إشعار'}</span>
                </span>
                {notification.categoryName && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                      notification.categoryBadgeClass ||
                      'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {notification.categoryEmoji} {notification.categoryName}
                  </span>
                )}
              </>
            )}

            <span className="text-[10px] opacity-75 mr-auto">الآن</span>
          </div>

          {/* Primary Alert or Active Slide Content */}
          {activeSlide ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h4
                  className={`text-xs sm:text-sm font-extrabold leading-tight m-0 ${
                    isComprehensiveOrWeather ? 'text-white' : 'text-[var(--ink)]'
                  }`}
                >
                  {activeSlide.isWeatherAlert
                    ? notification.title
                    : `${activeSlide.categoryEmoji || '✓'} خبر موثق: ${activeSlide.source}`}
                </h4>
                {hasMultipleSlides && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-black/25 text-white/90 shrink-0 tabular-nums">
                    {activeSlideIndex + 1}/{verifiedItems.length}
                  </span>
                )}
              </div>

              <p
                className={`text-xs m-0 leading-relaxed line-clamp-3 ${
                  isComprehensiveOrWeather ? 'text-white/90' : 'text-[var(--mute)]'
                }`}
              >
                {activeSlide.text}
              </p>

              {/* Slide switcher for browsing all verified news & weather inside the brief */}
              {hasMultipleSlides && (
                <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/10">
                  <span className="text-[10px] opacity-80">
                    يشمل الأحوال الجوية وكل خبر موثق ({verifiedItems.length})
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlideIndex((prev) =>
                          prev === 0 ? verifiedItems.length - 1 : prev - 1
                        )
                      }
                      className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white flex items-center gap-0.5 cursor-pointer"
                      title="الخبر الموثق السابق"
                    >
                      <ChevronRight className="w-3 h-3" />
                      <span>السابق</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveSlideIndex((prev) => (prev + 1) % verifiedItems.length)
                      }
                      className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-bold text-white flex items-center gap-0.5 cursor-pointer"
                      title="الخبر الموثق التالي"
                    >
                      <span>التالي</span>
                      <ChevronLeft className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <h4
                className={`text-xs sm:text-sm font-extrabold leading-tight m-0 ${
                  isComprehensiveOrWeather ? 'text-white' : 'text-[var(--ink)]'
                }`}
              >
                {notification.title}
              </h4>

              <p
                className={`text-xs mt-1 mb-0 leading-relaxed line-clamp-3 ${
                  isComprehensiveOrWeather ? 'text-white/90' : 'text-[var(--mute)]'
                }`}
              >
                {notification.message}
              </p>
            </>
          )}

          {/* Action Row + Owner Permanent Block Button */}
          <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
            {notification.onAction && notification.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  notification.onAction?.();
                  onDismiss(notification.id);
                }}
                className={`text-xs px-3 py-1 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs ${
                  isComprehensiveOrWeather
                    ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                    : 'bg-[var(--green)] text-white hover:opacity-90'
                }`}
              >
                <span>{notification.actionLabel}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {/* Exclusive Owner Control: Permanently block all notifications for all visitors */}
            {isOwnerLoggedIn && onDisablePermanently && (
              <button
                type="button"
                onClick={onDisablePermanently}
                className="text-[11px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1 cursor-pointer bg-rose-600/90 hover:bg-rose-600 text-white border border-rose-400/40 shadow-xs transition-colors"
                title="منع ظهور التنبيهات نهائياً لجميع الزوار"
              >
                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                <span>منع التنبيهات نهائياً للزوار</span>
              </button>
            )}
          </div>
        </div>

        {/* Close Button ("×") */}
        <button
          type="button"
          onClick={() => onDismiss(notification.id)}
          className={`shrink-0 p-1.5 rounded-xl transition-colors cursor-pointer ${
            isComprehensiveOrWeather
              ? 'text-white/70 hover:text-white hover:bg-white/15'
              : 'text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
          }`}
          title="إغلاق الإشعار"
          aria-label="إغلاق الإشعار"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}

export function InAppNotificationToastContainer({
  notifications,
  onDismiss,
  onClearAll,
  notificationsPermanentlyDisabled = false,
  isOwnerLoggedIn = false,
  onDisablePermanently,
}: {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
  onClearAll?: () => void;
  notificationsPermanentlyDisabled?: boolean;
  isOwnerLoggedIn?: boolean;
  onDisablePermanently?: () => void;
}) {
  if (notificationsPermanentlyDisabled || notifications.length === 0) return null;

  return (
    <div
      className="fixed top-16 sm:top-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-[70] flex flex-col gap-2.5 pointer-events-none select-none"
      aria-live="polite"
    >
      {notifications.length > 1 && onClearAll && (
        <div className="pointer-events-auto self-end">
          <button
            type="button"
            onClick={onClearAll}
            className="px-2.5 py-1 rounded-full bg-stone-900/80 hover:bg-stone-900 text-white text-[10px] font-bold border border-white/10 shadow-sm cursor-pointer transition-colors backdrop-blur-md flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            <span>إغلاق كافة التنبيهات ({notifications.length})</span>
          </button>
        </div>
      )}

      {notifications.map((n) => (
        <ToastItem
          key={n.id}
          notification={n}
          onDismiss={onDismiss}
          isOwnerLoggedIn={isOwnerLoggedIn}
          onDisablePermanently={onDisablePermanently}
        />
      ))}
    </div>
  );
}
