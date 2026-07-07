'use client';
import { usePathname } from 'next/navigation';
import { ChevronRight, Sun, Moon, Bell, Search, HelpCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { initials } from '@/lib/utils';

const LABELS: Record<string, string> = {
  reports: 'Reports', tracks: 'Tracks', moderation: 'Moderation',
  albums: 'Albums', playlists: 'Playlists',
  artists: 'Artists', verification: 'Verification', strikes: 'Strikes',
  users: 'Users', 'live-events': 'Live Events', schedule: 'Scheduled',
  tickets: 'Tickets', appeals: 'Appeals', finance: 'Finance',
  royalties: 'Royalties', payouts: 'Payouts', tips: 'Tips',
  ads: 'Ads', campaigns: 'Campaigns', creatives: 'Creatives', targeting: 'Targeting',
  frequency: 'Frequency', analytics: 'Analytics',
  cms: 'CMS', featured: 'Featured', banners: 'Banners', trending: 'Trending',
  genres: 'Genres', legal: 'Legal',
  system: 'System', audit: 'Audit', config: 'Config', roles: 'Roles', health: 'Health',
};

export default function Topbar() {
  const pathname = usePathname();
  const { user, roleLabel } = useAuth();
  const { theme, toggle } = useTheme();

  const segments = pathname.replace(/^\//, '').split('/').filter(Boolean);
  const crumbs = [{ label: 'Dashboard' }, ...segments.map(s => ({
    label: LABELS[s] ?? s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
  }))];

  const displayName = user?.profile?.firstName || user?.email?.split('@')[0] || 'Admin';
  const av = initials(user?.profile?.firstName, user?.profile?.lastName) || (displayName[0] ?? 'A').toUpperCase();

  return (
    <header className="h-14 bg-surface/85 backdrop-blur-md border-b border-border flex items-center justify-between px-6 shrink-0 sticky top-0 z-20">
      <nav className="flex items-center gap-1">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight size={11} className="text-text-muted mx-0.5" />}
            <span className={i === crumbs.length - 1 ? 'text-[13px] font-semibold text-text' : 'text-[13px] text-text-muted'}>
              {c.label}
            </span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text-muted w-56">
          <Search size={13} />
          <span className="text-xs">Search catalog, artists…</span>
          <kbd className="ml-auto text-[10px] bg-surface-3 border border-border px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        </div>
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-xl border border-border bg-surface-2 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-3 transition"
          title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
        <button className="w-8 h-8 rounded-xl border border-border bg-surface-2 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-3 transition relative">
          <Bell size={14} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brick rounded-full" />
        </button>
        <button className="w-8 h-8 rounded-xl border border-border bg-surface-2 flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-3 transition">
          <HelpCircle size={14} />
        </button>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brick flex items-center justify-center text-white text-[11px] font-bold select-none">
            {av}
          </div>
          <div className="hidden sm:block leading-none">
            <p className="text-[12px] font-semibold text-text">{displayName}</p>
            <p className="text-[10px] text-text-muted mt-1">{roleLabel(user?.roles?.[0])}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
