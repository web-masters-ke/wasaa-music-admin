import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  width?: string | number;
}

export function DataTable<T extends { id: string }>({
  columns, data, onRowClick, loading, empty,
}: {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {columns.map(c => (
                <th
                  key={c.key}
                  className={cn(
                    'text-left px-4 py-2.5 text-[11px] font-bold text-text-muted uppercase tracking-wider',
                    c.className,
                  )}
                  style={c.width ? { width: c.width } : undefined}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {columns.map(c => (
                    <td key={c.key} className="px-4 py-3.5">
                      <div className="skeleton h-4 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-14 text-center">
                  {empty ?? <span className="text-text-muted text-sm">No records to show.</span>}
                </td>
              </tr>
            ) : (
              data.map(row => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border last:border-b-0',
                    onRowClick && 'hover:bg-surface-2 cursor-pointer',
                  )}
                >
                  {columns.map(c => (
                    <td key={c.key} className={cn('px-4 py-3', c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
