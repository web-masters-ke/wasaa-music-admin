'use client';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface Tab { id: string; label: ReactNode; count?: number }

export default function Tabs({
  tabs, active, onChange,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="border-b border-border mb-4">
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              'px-3.5 py-2.5 text-[13px] font-semibold border-b-2 transition whitespace-nowrap',
              active === t.id
                ? 'text-brick border-brick'
                : 'text-text-muted border-transparent hover:text-text',
            )}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span className={cn(
                'ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold',
                active === t.id ? 'bg-brick/15 text-brick' : 'bg-surface-3 text-text-muted',
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
