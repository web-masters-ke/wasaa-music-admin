import { LucideIcon, Inbox } from 'lucide-react';
import { ReactNode } from 'react';

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  message,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="p-10 flex flex-col items-center text-center">
      <div className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-3">
        <Icon size={18} className="text-text-muted" />
      </div>
      <p className="text-sm font-semibold text-text">{title}</p>
      {message && <p className="text-xs text-text-muted mt-1 max-w-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
