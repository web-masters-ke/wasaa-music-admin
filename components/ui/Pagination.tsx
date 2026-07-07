import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Pagination({
  page, totalPages, onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  const window = 2;
  for (let i = Math.max(1, page - window); i <= Math.min(totalPages, page + window); i++) pages.push(i);
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-text-muted">Page {page} of {totalPages}</p>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="w-8 h-8 rounded-lg border border-border bg-surface-2 text-text-muted hover:bg-surface-3 disabled:opacity-40 flex items-center justify-center"
        >
          <ChevronLeft size={13} />
        </button>
        {pages[0] > 1 && (
          <>
            <button onClick={() => onChange(1)} className="w-8 h-8 rounded-lg border border-border bg-surface-2 text-text-muted text-xs hover:bg-surface-3">1</button>
            {pages[0] > 2 && <span className="px-1 text-text-muted">…</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={cn(
              'w-8 h-8 rounded-lg text-xs font-semibold',
              p === page ? 'bg-brick text-white' : 'border border-border bg-surface-2 text-text-muted hover:bg-surface-3',
            )}
          >
            {p}
          </button>
        ))}
        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-text-muted">…</span>}
            <button onClick={() => onChange(totalPages)} className="w-8 h-8 rounded-lg border border-border bg-surface-2 text-text-muted text-xs hover:bg-surface-3">{totalPages}</button>
          </>
        )}
        <button
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="w-8 h-8 rounded-lg border border-border bg-surface-2 text-text-muted hover:bg-surface-3 disabled:opacity-40 flex items-center justify-center"
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}
