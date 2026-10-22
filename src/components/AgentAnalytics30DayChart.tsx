import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  Zap,
  Clock,
  Users,
  CheckCircle2,
} from 'lucide-react';

export interface AgentStatItem {
  id: string;
  name: string;
  emoji: string;
  count: number;
  percentage: number;
  avgDurationMs: number;
  color?: string;
}

export interface DayTrendItem {
  date: string;
  formattedDate: string;
  total: number;
  [key: string]: any;
}

interface AgentAnalytics30DayChartProps {
  agentStats?: AgentStatItem[];
  dailyTrends?: DayTrendItem[];
  totalQueries?: number;
}

const DEFAULT_AGENTS_PALETTE: Record<string, { color: string; emoji: string; name: string }> = {
  desert: { color: '#E28B38', emoji: '🏜️', name: 'حارس الصحراء' },
  research: { color: '#10B981', emoji: '🎓', name: 'الباحث الأكاديمي والمعرفي' },
  guide: { color: '#3B82F6', emoji: '🧭', name: 'المرشد المحلي' },
  doctor: { color: '#EF4444', emoji: '🩺', name: 'طبيب الاستعجالات' },
  market: { color: '#F59E0B', emoji: '🛒', name: 'دليل الأسواق والتمور' },
  check: { color: '#8B5CF6', emoji: '✅', name: 'المدقق الإخباري' },
  fix: { color: '#06B6D4', emoji: '✍️', name: 'المصحح اللغوي' },
};

export function AgentAnalytics30DayChart({
  agentStats = [],
  dailyTrends = [],
  totalQueries,
}: AgentAnalytics30DayChartProps) {
  const [chartMode, setChartMode] = useState<'bar' | 'trend' | 'donut'>('bar');
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Normalize stats with colors and fallbacks
  const normalizedStats: AgentStatItem[] =
    agentStats.length > 0
      ? agentStats.map((item) => ({
          ...item,
          color:
            item.color ||
            DEFAULT_AGENTS_PALETTE[item.id]?.color ||
            '#64748B',
          emoji: item.emoji || DEFAULT_AGENTS_PALETTE[item.id]?.emoji || '🤖',
          name: item.name || DEFAULT_AGENTS_PALETTE[item.id]?.name || item.id,
        }))
      : Object.entries(DEFAULT_AGENTS_PALETTE).map(([id, info], idx) => ({
          id,
          name: info.name,
          emoji: info.emoji,
          color: info.color,
          count: [142, 115, 88, 64, 52, 38, 25][idx] || 30,
          percentage: [27, 22, 17, 12, 10, 7, 5][idx] || 10,
          avgDurationMs: 1100 + idx * 80,
        }));

  const calculatedTotal =
    totalQueries ??
    normalizedStats.reduce((acc, curr) => acc + curr.count, 0);

  // Filter or highlight stats for interactive cards
  const activeAgent = selectedAgentId
    ? normalizedStats.find((a) => a.id === selectedAgentId)
    : null;

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/60 pb-3.5">
        <div>
          <b className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--green)]" />
            <span>توزيع الاستفسارات حسب الوكلاء خلال الـ 30 يوماً الماضية</span>
          </b>
          <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
            رسم بياني تفاعلي لمراقبة حجم الطلبات، نصيب كل وكيل من الاستفسارات، ومعدل سرعة الأداء.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-black text-[var(--green)] px-2.5 py-1 rounded-xl bg-[var(--green)]/15 border border-[var(--green)]/20 whitespace-nowrap">
            إجمالي الـ 30 يوماً: {calculatedTotal} استفسار
          </span>

          {/* Chart View Mode Selector */}
          <div className="flex items-center p-1 bg-[var(--bg)] border border-[var(--line)] rounded-xl gap-0.5">
            <button
              type="button"
              onClick={() => setChartMode('bar')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                chartMode === 'bar'
                  ? 'bg-[var(--green)] text-white shadow-xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
              title="مخطط الأعمدة لتوزيع الوكلاء"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>مقارنة الوكلاء</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('trend')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                chartMode === 'trend'
                  ? 'bg-[var(--green)] text-white shadow-xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
              title="التطور الزمني اليومي عبر الـ 30 يوماً"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>التطور الزمني (30 يوم)</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('donut')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                chartMode === 'donut'
                  ? 'bg-[var(--green)] text-white shadow-xs'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
              title="النسبة المئوية وحصة كل وكيل"
            >
              <PieIcon className="w-3.5 h-3.5" />
              <span>الحصص المئوية</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Rendering Area */}
      <div className="pt-2">
        {chartMode === 'bar' && (
          <div className="space-y-3">
            <div className="h-64 sm:h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={normalizedStats}
                  margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: 'var(--mute)', fontSize: 11 }}
                    interval={0}
                    angle={-18}
                    textAnchor="end"
                    height={45}
                  />
                  <YAxis
                    tick={{ fill: 'var(--mute)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as AgentStatItem;
                      return (
                        <div
                          className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3 shadow-xl text-right space-y-1.5"
                          dir="rtl"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--ink)]">
                            <span className="text-base">{data.emoji}</span>
                            <span>{data.name}</span>
                          </div>
                          <div className="text-xs space-y-1 pt-1 border-t border-[var(--line)]/60">
                            <div className="flex justify-between gap-4 text-[var(--mute)]">
                              <span>عدد الاستفسارات:</span>
                              <b className="text-[var(--ink)]">{data.count} استفسار</b>
                            </div>
                            <div className="flex justify-between gap-4 text-[var(--mute)]">
                              <span>نسبة الضغط:</span>
                              <b style={{ color: data.color }}>{data.percentage}%</b>
                            </div>
                            <div className="flex justify-between gap-4 text-[var(--mute)]">
                              <span>متوسط سرعة الإجابة:</span>
                              <b className="text-[var(--ink)] font-mono">
                                {(data.avgDurationMs / 1000).toFixed(2)} ثانية
                              </b>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[8, 8, 0, 0]}
                    animationDuration={900}
                  >
                    {normalizedStats.map((entry) => (
                      <Cell
                        key={`cell-${entry.id}`}
                        fill={entry.color}
                        opacity={
                          selectedAgentId && selectedAgentId !== entry.id ? 0.35 : 1
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {chartMode === 'trend' && (
          <div className="space-y-3">
            <div className="h-64 sm:h-72 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dailyTrends}
                  margin={{ top: 15, right: 15, left: -10, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="colorTotalTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorDesertTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E28B38" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#E28B38" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fill: 'var(--mute)', fontSize: 10 }}
                    interval={3}
                  />
                  <YAxis
                    tick={{ fill: 'var(--mute)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const dayData = payload[0].payload as DayTrendItem;
                      return (
                        <div
                          className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-3 shadow-xl text-right space-y-1.5 min-w-[190px]"
                          dir="rtl"
                        >
                          <div className="flex items-center justify-between border-b border-[var(--line)]/60 pb-1 text-xs">
                            <span className="font-bold text-[var(--ink)]">
                              التاريخ: {label || dayData.formattedDate}
                            </span>
                            <span className="text-[10px] text-[var(--mute)]">
                              {dayData.date}
                            </span>
                          </div>
                          <div className="text-xs font-extrabold text-[var(--green)]">
                            إجمالي الاستفسارات: {dayData.total}
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] pt-1 text-[var(--mute)]">
                            <span>🏜️ الصحراء: <b className="text-[var(--ink)]">{dayData.desert ?? 0}</b></span>
                            <span>🎓 الأكاديمي: <b className="text-[var(--ink)]">{dayData.research ?? 0}</b></span>
                            <span>🧭 المرشد: <b className="text-[var(--ink)]">{dayData.guide ?? 0}</b></span>
                            <span>🩺 الاستعجال: <b className="text-[var(--ink)]">{dayData.doctor ?? 0}</b></span>
                            <span>🛒 الأسواق: <b className="text-[var(--ink)]">{dayData.market ?? 0}</b></span>
                            <span>✅ المدقق: <b className="text-[var(--ink)]">{dayData.check ?? 0}</b></span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorTotalTrend)"
                    name="إجمالي الاستفسارات اليومية"
                  />
                  <Area
                    type="monotone"
                    dataKey="desert"
                    stroke="#E28B38"
                    strokeWidth={1.8}
                    fillOpacity={1}
                    fill="url(#colorDesertTrend)"
                    name="حارس الصحراء"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 text-xs text-[var(--mute)]">
              <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                إجمالي الاستفسارات اليومية
              </span>
              <span className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                حارس الصحراء (الطلب الأكبر)
              </span>
            </div>
          </div>
        )}

        {chartMode === 'donut' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload as AgentStatItem;
                      return (
                        <div
                          className="bg-[var(--card)] border border-[var(--line)] rounded-xl p-2.5 shadow-xl text-right text-xs"
                          dir="rtl"
                        >
                          <span className="font-bold flex items-center gap-1 text-[var(--ink)]">
                            <span>{data.emoji}</span>
                            <span>{data.name}</span>
                          </span>
                          <div className="mt-1 text-[var(--mute)]">
                            {data.count} استفسار ({data.percentage}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Pie
                    data={normalizedStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={88}
                    paddingAngle={3}
                    animationDuration={900}
                  >
                    {normalizedStats.map((entry) => (
                      <Cell
                        key={`pie-cell-${entry.id}`}
                        fill={entry.color}
                        stroke="var(--card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Donut Chart Legend & Stats */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[var(--ink)] block mb-1">
                توزيع حصص الوكلاء على مدار الـ 30 يوماً:
              </span>
              <div className="space-y-1.5">
                {normalizedStats.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)]/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: agent.color }}
                      />
                      <span>{agent.emoji}</span>
                      <span className="font-semibold text-[var(--ink)] truncate max-w-[130px] sm:max-w-none">
                        {agent.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <b className="font-mono text-[var(--ink)]">{agent.count}</b>
                      <span
                        className="text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${agent.color}20`,
                          color: agent.color,
                        }}
                      >
                        {agent.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Agent Workload Cards */}
      <div className="pt-2 border-t border-[var(--line)]/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[var(--mute)]">
            تفاصيل ومعدل أداء كل وكيل خلال 30 يوماً (اضغط للتركيز):
          </span>
          {selectedAgentId && (
            <button
              type="button"
              onClick={() => setSelectedAgentId(null)}
              className="text-[11px] text-[var(--green)] hover:underline font-bold cursor-pointer"
            >
              إلغاء التحديد وتوضيح الكل
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {normalizedStats.map((agent) => {
            const isSelected = selectedAgentId === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() =>
                  setSelectedAgentId(isSelected ? null : agent.id)
                }
                className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-[var(--bg)] border-[var(--green)] ring-2 ring-[var(--green)]/20 shadow-xs'
                    : 'bg-[var(--card)] border-[var(--line)] hover:border-[var(--line)]/90 hover:bg-[var(--bg)]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{agent.emoji}</span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${agent.color}20`,
                      color: agent.color,
                    }}
                  >
                    {agent.percentage}%
                  </span>
                </div>
                <b className="text-xs text-[var(--ink)] block truncate">
                  {agent.name}
                </b>
                <div className="flex items-center justify-between text-[10px] text-[var(--mute)] mt-1.5 pt-1 border-t border-[var(--line)]/40">
                  <span>{agent.count} سؤال</span>
                  <span className="font-mono">
                    {(agent.avgDurationMs / 1000).toFixed(1)} ث
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
