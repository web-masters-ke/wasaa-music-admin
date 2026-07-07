import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export default function Badge({
  children,
  tone = 'default',
  className,
}: {
  children: ReactNode;
  tone?: 'default' | 'brick' | 'success' | 'warning' | 'destructive' | 'info' | 'muted';
  className?: string;
}) {
  const map = {
    default:     'bg-surface-3 text-text border-border',
    brick:       'bg-brick/10 text-brick border-brick/20',
    success:     'bg-success/10 text-success border-success/20',
    warning:     'bg-warning/10 text-warning border-warning/20',
    destructive: 'bg-destructive/10 text-destructive border-destructive/20',
    info:        'bg-info/10 text-info border-info/20',
    muted:       'bg-surface-2 text-text-muted border-border',
  } as const;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border uppercase tracking-wider',
      map[tone],
      className,
    )}>
      {children}
    </span>
  );
}
