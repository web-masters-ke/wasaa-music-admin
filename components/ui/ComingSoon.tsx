import { Rocket } from 'lucide-react';

export default function ComingSoon({
  title = 'Coming soon',
  message = 'This module is planned but no backend endpoint is wired yet.',
}: { title?: string; message?: string }) {
  return (
    <div className="bg-surface border border-border border-dashed rounded-2xl p-10 flex flex-col items-center text-center">
      <div className="w-12 h-12 rounded-2xl bg-brick/10 border border-brick/20 flex items-center justify-center mb-4">
        <Rocket size={20} className="text-brick" />
      </div>
      <h3 className="text-lg font-bold text-text mb-2">{title}</h3>
      <p className="text-sm text-text-muted max-w-md">{message}</p>
    </div>
  );
}
