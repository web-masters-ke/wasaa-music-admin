import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sparkline, paletteFor } from './Charts';

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  loading,
  spark,
  sparkColor,
  delta,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: 'default' | 'brick' | 'success' | 'warning' | 'destructive' | 'info';
  loading?: boolean;
  /** 7-day trend for inline sparkline. */
  spark?: number[];
  sparkColor?: string;
  /** Percentage delta vs previous window, e.g. 4.2 or -1.1 */
  delta?: number;
}) {
  const toneMap = {
    default:     'bg-surface-2 text-text',
    brick:       'bg-brick/10 text-brick',
    success:     'bg-success/10 text-success',
    warning:     'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
    info:        'bg-info/10 text-info',
  } as const;
  const sparkPaletteIdx = { default: 7, brick: 0, success: 2, warning: 3, destructive: 5, info: 1 }[tone];
  const sparkData = spark?.length ? spark.map(v => ({ v })) : undefined;

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-widest font-bold text-text-muted">{label}</p>
        {Icon && (
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', toneMap[tone])}>
            <Icon size={14} />
          </div>
        )}
      </div>
      {loading ? (
        <div className="skeleton h-8 w-24" />
      ) : (
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-black text-text tracking-tight">{value}</p>
          {typeof delta === 'number' && (
            <span className={cn(
              'text-[11px] font-bold',
              delta >= 0 ? 'text-success' : 'text-destructive',
            )}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      {sparkData ? (
        <Sparkline data={sparkData} color={sparkColor ?? paletteFor(sparkPaletteIdx)} height={32} />
      ) : hint ? (
        <p className="text-[11px] text-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
