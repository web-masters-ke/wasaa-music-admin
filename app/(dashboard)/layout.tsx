'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-surface-2 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={20} className="text-brick animate-spin" />
          <p className="text-xs text-text-muted font-medium">Loading admin console…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-2 text-text">
      <Sidebar />
      <div className="ml-60">
        <Topbar />
        <main className="p-6 min-h-[calc(100vh-56px)]">
          <div className="max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
