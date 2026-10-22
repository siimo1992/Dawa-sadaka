import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Sun,
  Flame,
  Wind,
  ThermometerSun,
  Calendar,
  AlertTriangle,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

export interface DayForecast {
  day: string;
  dayShort: string;
  date: string;
  maxTemp: number;
  minTemp: number;
  windSpeed: number;
  uvIndex: number;
  condition: string;
  icon: string;
  safetyTip: string;
  riskLevel: 'medium' | 'high' | 'extreme';
}

const FORECAST_5_DAYS: DayForecast[] = [
  {
    day: 'اليوم (السبت)',
    dayShort: 'السبت',
    date: '04 أكتوبر',
    maxTemp: 42,
    minTemp: 24,
    windSpeed: 28,
    uvIndex: 10,
    condition: 'رياح رملية خفيفة مع حرارة شديدة',
    icon: '🌪️',
    safetyTip: 'تجنب السفر بالهجيرة. الرؤية الأفقية قد تنخفض على طريق تمنراست.',
    riskLevel: 'high',
  },
  {
    day: 'غداً (الأحد)',
    dayShort: 'الأحد',
    date: '05 أكتوبر',
    maxTemp: 43,
    minTemp: 25,
    windSpeed: 22,
    uvIndex: 11,
    condition: 'مشمس حار جداً وسماء صافية',
    icon: '☀️',
    safetyTip: 'أعلى درجات حرارة متوقعة. تأكد من تبريد المحرك وتوفير 5 لتر ماء للشخص.',
    riskLevel: 'extreme',
  },
  {
    day: 'الإثنين',
    dayShort: 'الإثنين',
    date: '06 أكتوبر',
    maxTemp: 40,
    minTemp: 23,
    windSpeed: 18,
    uvIndex: 9,
    condition: 'أجواء صحراوية حارة ومستقرة',
    icon: '🌤️',
    safetyTip: 'رياح معتدلة وحركة سير عادية على كافة المحاور.',
    riskLevel: 'medium',
  },
  {
    day: 'الثلاثاء',
    dayShort: 'الثلاثاء',
    date: '07 أكتوبر',
    maxTemp: 39,
    minTemp: 22,
    windSpeed: 15,
    uvIndex: 9,
    condition: 'سماء صافية مع رياح هادئة',
    icon: '☀️',
    safetyTip: 'طقس ملائم للتنقل مع تفادي ساعات الذروة بين 12:00 و 15:30.',
    riskLevel: 'medium',
  },
  {
    day: 'الأربعاء',
    dayShort: 'الأربعاء',
    date: '08 أكتوبر',
    maxTemp: 41,
    minTemp: 24,
    windSpeed: 25,
    uvIndex: 10,
    condition: 'عودة نشاط نسبي للرياح الرملية',
    icon: '🌪️',
    safetyTip: 'احتمال تصاعد زوابع رملية في المسالك المفتوحة بعد الظهر.',
    riskLevel: 'high',
  },
];

export interface WeatherForecastChartProps {
  lang?: 'ar' | 'en' | 'fr';
}

export const WeatherForecastChart: React.FC<WeatherForecastChartProps> = ({ lang = 'ar' }) => {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [selectedDay, setSelectedDay] = useState<DayForecast>(FORECAST_5_DAYS[0]);

  // Localized texts
  const t = {
    ar: {
      title: 'توقعات درجات الحرارة لـ 5 أيام (عين صالح)',
      subtitle: 'مخطط بياني تفاعلي لتغيرات الحرارة اليومية والليلية لمسافري الصحراء',
      areaBtn: 'منحنى حراري',
      barBtn: 'أعمدة بيانية',
      maxLabel: 'القصوى:',
      minLabel: 'الدنيا:',
      windUnit: 'كم/سا',
      tipLabel: 'إرشادات السلامة والطقس:',
      riskLabel: 'مستوى الخطورة:',
    },
    en: {
      title: '5-Day Temperature Forecast (In Salah)',
      subtitle: 'Interactive temperature chart and thermal variation advisory for desert travelers',
      areaBtn: 'Temperature Curve',
      barBtn: 'Bar Chart',
      maxLabel: 'Max:',
      minLabel: 'Min:',
      windUnit: 'km/h',
      tipLabel: 'Weather & Safety Advisory:',
      riskLabel: 'Risk Level:',
    },
    fr: {
      title: 'Prévisions des températures sur 5 jours (In Salah)',
      subtitle: 'Graphique thermique interactif et recommandations pour les trajets sahariens',
      areaBtn: 'Courbe thermique',
      barBtn: 'Histogramme',
      maxLabel: 'Max :',
      minLabel: 'Min :',
      windUnit: 'km/h',
      tipLabel: 'Conseils sécurité & météo :',
      riskLabel: 'Niveau de vigilance :',
    },
  }[lang];

  // Custom Tooltip component for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DayForecast = payload[0].payload;
      return (
        <div className="bg-[var(--card)] border border-[var(--line)] p-3 rounded-xl shadow-xl text-xs space-y-1.5 max-w-[220px]">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-1">
            <span className="font-bold text-[var(--ink)] flex items-center gap-1">
              <span>{data.icon}</span>
              <span>{data.day}</span>
            </span>
            <span className="text-[10px] text-[var(--mute)]">{data.date}</span>
          </div>

          <div className="flex items-center justify-between font-semibold pt-0.5">
            <span className="text-[#B3402A] flex items-center gap-1">
              <span>{t.maxLabel}</span>
              <span className="font-mono text-sm">{data.maxTemp}°C</span>
            </span>
            <span className="text-[#2F5D50] flex items-center gap-1">
              <span>{t.minLabel}</span>
              <span className="font-mono text-sm">{data.minTemp}°C</span>
            </span>
          </div>

          <p className="text-[11px] text-[var(--mute)] leading-relaxed m-0">
            {data.condition}
          </p>

          <div className="flex items-center justify-between text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/60">
            <span className="flex items-center gap-1">
              <Wind className="w-3 h-3 text-[#C9922E]" />
              <span>{data.windSpeed} {t.windUnit}</span>
            </span>
            <span className="flex items-center gap-1">
              <Sun className="w-3 h-3 text-[#B3402A]" />
              <span>UV: {data.uvIndex}</span>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-4 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
            <ThermometerSun className="w-4 h-4" />
          </div>
          <div>
            <b className="text-sm text-[var(--ink)] block">
              {t.title}
            </b>
            <p className="text-[11px] text-[var(--mute)] m-0">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* View Switcher Button (Curve Area vs Bars) */}
        <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--line)] self-start sm:self-auto">
          <button
            onClick={() => setChartType('area')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              chartType === 'area'
                ? 'bg-[var(--green)] text-[var(--on)]'
                : 'text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            {t.areaBtn}
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              chartType === 'bar'
                ? 'bg-[var(--green)] text-[var(--on)]'
                : 'text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            {t.barBtn}
          </button>
        </div>
      </div>

      {/* 5-Day Quick Peek Carousel / Grid */}
      <div className="grid grid-cols-5 gap-1.5 select-none">
        {FORECAST_5_DAYS.map((item, idx) => {
          const isSelected = selectedDay.dayShort === item.dayShort;
          return (
            <button
              key={idx}
              onClick={() => setSelectedDay(item)}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[var(--bg)] border-[#C9922E] shadow-sm ring-1 ring-[#C9922E]/40'
                  : 'bg-[var(--bg)]/50 border-[var(--line)] hover:border-[var(--green)]/50'
              }`}
            >
              <span className="text-[10px] text-[var(--mute)] font-semibold block truncate">
                {item.dayShort}
              </span>
              <span className="text-base my-0.5 block">{item.icon}</span>
              <span className="text-xs font-bold text-[#B3402A] block font-mono">
                {item.maxTemp}°
              </span>
              <span className="text-[10px] text-[var(--mute)] block font-mono">
                {item.minTemp}°
              </span>
            </button>
          );
        })}
      </div>

      {/* Recharts Visual Chart Container */}
      <div className="w-full h-[240px] pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart
              data={FORECAST_5_DAYS}
              margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                {/* Max Temp Gradient (Desert Orange / Red) */}
                <linearGradient id="maxTempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#B3402A" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#B3402A" stopOpacity={0.02} />
                </linearGradient>

                {/* Min Temp Gradient (Oasis Green) */}
                <linearGradient id="minTempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F5D50" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2F5D50" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.6} />

              <XAxis
                dataKey="dayShort"
                stroke="var(--mute)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--line)' }}
              />

              <YAxis
                stroke="var(--mute)"
                fontSize={10}
                domain={[15, 48]}
                unit="°"
                tickLine={false}
                axisLine={false}
              />

              <Tooltip content={<CustomTooltip />} />

              {/* Area for High Temp */}
              <Area
                type="monotone"
                dataKey="maxTemp"
                name="الدرجة القصوى"
                stroke="#B3402A"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#maxTempGrad)"
                activeDot={{ r: 6, fill: '#B3402A', stroke: '#fff', strokeWidth: 2 }}
              />

              {/* Area for Low Temp */}
              <Area
                type="monotone"
                dataKey="minTemp"
                name="الدرجة الدنيا"
                stroke="#2F5D50"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#minTempGrad)"
                activeDot={{ r: 5, fill: '#2F5D50', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          ) : (
            <BarChart
              data={FORECAST_5_DAYS}
              margin={{ top: 15, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" opacity={0.6} />
              <XAxis
                dataKey="dayShort"
                stroke="var(--mute)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--line)' }}
              />
              <YAxis
                stroke="var(--mute)"
                fontSize={10}
                domain={[15, 48]}
                unit="°"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                formatter={(val) => (val === 'maxTemp' ? 'الحرارة القصوى (°C)' : 'الحرارة الدنيا (°C)')}
              />
              <Bar dataKey="maxTemp" fill="#B3402A" radius={[6, 6, 0, 0]} name="maxTemp" />
              <Bar dataKey="minTemp" fill="#2F5D50" radius={[6, 6, 0, 0]} name="minTemp" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Legend / Guide */}
      <div className="flex items-center justify-between text-xs px-2 pt-1 border-t border-[var(--line)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-[#B3402A]" />
            <span className="font-semibold text-xs text-[var(--ink)]">الحرارة القصوى (النهار)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-[#2F5D50]" />
            <span className="font-semibold text-xs text-[var(--ink)]">الحرارة الدنيا (الليل)</span>
          </div>
        </div>

        <span className="text-[10px] text-[var(--mute)]">المصدر: الأرصاد الصحراوية</span>
      </div>

      {/* Selected Day Tactical Desert Advice */}
      <div className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-xl space-y-1.5 animate-in fade-in">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#C9922E]" />
            <span>نصيحة السلامة لـ {selectedDay.day}:</span>
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              selectedDay.riskLevel === 'extreme'
                ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                : selectedDay.riskLevel === 'high'
                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
            }`}
          >
            {selectedDay.riskLevel === 'extreme'
              ? '⚠️ حرارة قياسية'
              : selectedDay.riskLevel === 'high'
              ? 'نشاط رملي / حرارة'
              : 'أجواء عادية'}
          </span>
        </div>

        <p className="text-xs text-[var(--ink)] leading-relaxed m-0">
          {selectedDay.safetyTip}
        </p>

        <div className="flex items-center gap-1 text-[11px] text-[var(--mute)] pt-0.5">
          <Clock className="w-3 h-3 text-[#B3402A]" />
          <span>ساعات ذروة الهجيرة الصحراوية المحظورة: 11:30 صباحاً إلى 16:30 مساءً.</span>
        </div>
      </div>
    </div>
  );
};
