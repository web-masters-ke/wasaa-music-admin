'use client';
/**
 * Chart primitives — recharts wrappers styled with our --chart-* CSS vars.
 * All pie charts explicitly set innerRadius={0} (NOT donuts).
 */
import { ReactNode, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { LucideIcon, LineChart as LineIcon } from 'lucide-react';

/**
 * 8-slot palette read from CSS vars. Works in both light and dark themes.
 * Falls back to hardcoded values for SSR (before CSS applies).
 */
export const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)',
  'var(--chart-5)', 'var(--chart-6)', 'var(--chart-7)', 'var(--chart-8)',
];
const CHART_HEX_FALLBACK = ['#0081FF', '#4FA5FF', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#64748B'];
export const paletteFor = (i: number) => CHART_COLORS[i % CHART_COLORS.length];
export const hexFor = (i: number) => CHART_HEX_FALLBACK[i % CHART_HEX_FALLBACK.length];

const TOOLTIP_STYLE = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text)',
} as const;

const AXIS = { fontSize: 11, stroke: 'var(--text-muted)' } as const;
const GRID = { stroke: 'var(--border)', strokeDasharray: '3 3' } as const;

/* --------------------------------------------------------------------------
 * Empty state — for when backend returns empty payloads (no fabrication).
 * -------------------------------------------------------------------------- */
export function ChartEmpty({
  message = 'No data yet — analytics pipeline runs hourly',
  icon: Icon = LineIcon,
  className,
}: { message?: string; icon?: LucideIcon; className?: string }) {
  return (
    <div className={cn('h-full flex flex-col items-center justify-center text-center px-4', className)}>
      <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-2">
        <Icon size={16} className="text-text-muted" />
      </div>
      <p className="text-xs text-text-muted max-w-xs">{message}</p>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Sparkline — tiny 40px line for inline stat cards. Renders empty div when no data.
 * -------------------------------------------------------------------------- */
export function Sparkline({
  data, color, height = 32,
}: { data: Array<{ v: number }>; color?: string; height?: number }) {
  if (!data || data.length < 2) return <div className="opacity-40 text-[10px]">·</div>;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color ?? paletteFor(0)}
            strokeWidth={1.75}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Line, Area (stacked), Bar (grouped or stacked), horizontal Bar.
 * -------------------------------------------------------------------------- */
interface Series { key: string; name: string; color?: string; type?: 'bar' | 'line' | 'area' }

export function LineChartBlock({
  data, xKey, series, height = 260, empty,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Series[];
  height?: number;
  empty?: ReactNode;
}) {
  if (!data || data.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color ?? paletteFor(i)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaChartBlock({
  data, xKey, series, height = 260, stacked = true, empty,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
  empty?: ReactNode;
}) {
  if (!data || data.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stackId={stacked ? 'a' : undefined}
              stroke={s.color ?? paletteFor(i)}
              fill={s.color ?? paletteFor(i)}
              fillOpacity={0.35}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChartBlock({
  data, xKey, series, height = 260, stacked, horizontal, empty,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  series: Series[];
  height?: number;
  stacked?: boolean;
  horizontal?: boolean;
  empty?: ReactNode;
}) {
  if (!data || data.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={horizontal ? { left: 40 } : undefined}>
          <CartesianGrid {...GRID} />
          {horizontal ? (
            <>
              <XAxis type="number" {...AXIS} />
              <YAxis type="category" dataKey={xKey} width={110} {...AXIS} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} {...AXIS} />
              <YAxis {...AXIS} />
            </>
          )}
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'var(--surface-3)' }} />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11 }} />}
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId={stacked ? 'a' : undefined}
              fill={s.color ?? paletteFor(i)}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Solid Pie — innerRadius=0 by spec (NOT donuts).
 * -------------------------------------------------------------------------- */
export function PieChartBlock({
  data, nameKey = 'name', valueKey = 'value', height = 260, empty,
}: {
  data: Array<Record<string, unknown>>;
  nameKey?: string;
  valueKey?: string;
  height?: number;
  empty?: ReactNode;
}) {
  if (!data || data.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            innerRadius={0}
            outerRadius="80%"
            paddingAngle={1}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {data.map((_, i) => <Cell key={i} fill={paletteFor(i)} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Combo Chart — bar + line on same axes (e.g. impressions bar, CTR line)
 * -------------------------------------------------------------------------- */
export function ComboChartBlock({
  data, xKey, bars, lines, height = 260, empty,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  bars: Series[];
  lines: Series[];
  height?: number;
  empty?: ReactNode;
}) {
  if (!data || data.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey={xKey} {...AXIS} />
          <YAxis yAxisId="left" {...AXIS} />
          <YAxis yAxisId="right" orientation="right" {...AXIS} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {bars.map((s, i) => (
            <Bar
              key={s.key}
              yAxisId="left"
              dataKey={s.key}
              name={s.name}
              fill={s.color ?? paletteFor(i)}
              radius={[4, 4, 0, 0]}
            />
          ))}
          {lines.map((s, i) => (
            <Line
              key={s.key}
              yAxisId="right"
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color ?? paletteFor((bars.length + i) % 8)}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Radar Chart — for multi-axis platform-health style visualizations
 * -------------------------------------------------------------------------- */
export function RadarChartBlock({
  data, categoryKey, valueKey = 'value', height = 260, empty,
}: {
  data: Array<Record<string, unknown>>;
  categoryKey: string;
  valueKey?: string;
  height?: number;
  empty?: ReactNode;
}) {
  if (!data || data.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey={categoryKey} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          <PolarRadiusAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
          <Radar dataKey={valueKey} stroke={paletteFor(0)} fill={paletteFor(0)} fillOpacity={0.35} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Scatter — for e.g. duration vs completion-rate
 * -------------------------------------------------------------------------- */
export function ScatterChartBlock({
  data, xKey, yKey, zKey, height = 260, empty,
}: {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  zKey?: string;
  height?: number;
  empty?: ReactNode;
}) {
  if (!data || data.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid {...GRID} />
          <XAxis type="number" dataKey={xKey} {...AXIS} name={xKey} />
          <YAxis type="number" dataKey={yKey} {...AXIS} name={yKey} />
          {zKey && <ZAxis type="number" dataKey={zKey} range={[40, 200]} />}
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={data} fill={paletteFor(0)} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Heatmap — day-of-week × hour, custom SVG grid (no plugin needed).
 * Ideal for "listens by hour of day".
 * -------------------------------------------------------------------------- */
export interface HeatmapCell { row: number; col: number; value: number }

export function Heatmap({
  cells, rowLabels, colLabels, height = 220, empty,
}: {
  cells: HeatmapCell[];
  rowLabels: string[];
  colLabels: string[];
  height?: number;
  empty?: ReactNode;
}) {
  const maxValue = useMemo(() => cells.reduce((m, c) => Math.max(m, c.value), 0), [cells]);
  if (!cells || cells.length === 0 || maxValue === 0) {
    return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  }
  const rows = rowLabels.length;
  const cols = colLabels.length;
  const cellByRC = new Map(cells.map(c => [`${c.row}-${c.col}`, c.value]));
  return (
    <div style={{ height }} className="w-full overflow-x-auto">
      <div className="h-full flex flex-col text-[10px] min-w-fit">
        <div className="flex-1 flex">
          <div className="flex flex-col justify-between py-1 pr-2 text-text-muted">
            {rowLabels.map(l => <span key={l} className="h-[calc((100%-2rem)/7)] leading-none">{l}</span>)}
          </div>
          <div className="flex-1 grid gap-0.5" style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}>
            {Array.from({ length: rows * cols }).map((_, i) => {
              const r = Math.floor(i / cols); const c = i % cols;
              const v = cellByRC.get(`${r}-${c}`) ?? 0;
              const pct = maxValue ? v / maxValue : 0;
              return (
                <div
                  key={i}
                  title={`${rowLabels[r]} · ${colLabels[c]}: ${v}`}
                  className="rounded-sm"
                  style={{
                    background: `rgba(0, 129, 255, ${0.08 + 0.9 * pct})`,
                  }}
                />
              );
            })}
          </div>
        </div>
        <div className="flex mt-1">
          <div className="w-10 shrink-0" />
          <div className="flex-1 grid text-text-muted text-center" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
            {colLabels.map(l => <span key={l}>{l}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------------
 * Funnel — vertical funnel with descending width, labels + values.
 * -------------------------------------------------------------------------- */
export function Funnel({
  steps, height = 260, empty,
}: {
  steps: Array<{ label: string; value: number }>;
  height?: number;
  empty?: ReactNode;
}) {
  if (!steps || steps.length === 0) return <div style={{ height }}>{empty ?? <ChartEmpty />}</div>;
  const top = steps[0]?.value || 1;
  return (
    <div style={{ height }} className="w-full flex flex-col items-center justify-center gap-1.5 px-4">
      {steps.map((s, i) => {
        const pct = top ? s.value / top : 0;
        const width = Math.max(0.15, pct) * 100;
        const conv = top ? (s.value / top * 100).toFixed(1) : '—';
        return (
          <div key={s.label} className="w-full flex items-center gap-3">
            <span className="text-[11px] text-text-muted w-24 truncate">{s.label}</span>
            <div className="flex-1 h-8 relative bg-surface-2 rounded-md overflow-hidden border border-border">
              <div
                className="h-full rounded-md flex items-center justify-end pr-2 text-[11px] font-bold text-white"
                style={{ width: `${width}%`, background: paletteFor(i) }}
              >
                {s.value.toLocaleString()}
              </div>
            </div>
            <span className="text-[11px] text-text-muted w-12 text-right">{conv}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------------------------------------------------------
 * ProgressRing — SLA %, verification %, retention %
 * -------------------------------------------------------------------------- */
export function ProgressRing({
  value, label, size = 96, thickness = 8, color,
}: {
  value: number; // 0-100
  label?: ReactNode;
  size?: number;
  thickness?: number;
  color?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (v / 100) * c;
  const stroke = color ?? paletteFor(0);
  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-3)" strokeWidth={thickness} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={stroke} strokeWidth={thickness} fill="none"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 500ms ease' }}
        />
        <text
          x="50%" y="50%"
          textAnchor="middle"
          dy=".3em"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
          className="fill-text font-black"
          fontSize={size * 0.22}
        >
          {v.toFixed(0)}%
        </text>
      </svg>
      {label && <p className="text-[11px] font-semibold text-text-muted text-center">{label}</p>}
    </div>
  );
}
