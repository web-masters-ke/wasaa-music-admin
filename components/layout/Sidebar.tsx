'use client';
import { useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, BarChart3, Music2, Disc3, ListMusic,
  Users, ShieldCheck, AlertTriangle, User2,
  Radio, Tv2, Ticket as TicketIcon,
  Flag, Scale, Inbox,
  Coins, HandCoins, Landmark,
  Megaphone, Image as ImageIcon, Target, Timer, LineChart,
  Star, Layout, TrendingUp, Palette, FileText,
  ScrollText, Settings, KeyRound, Activity,
  LogOut, Music,
} from 'lucide-react';
import { useAuth, RequireRole, AdminRole } from '@/lib/auth';
import { cn, initials } from '@/lib/utils';
import PerpetualScrollbar from './PerpetualScrollbar';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  allow?: AdminRole[];
  badge?: string;
}
interface Section {
  label: string;
  items: NavItem[];
  allow?: AdminRole[];
}

const SECTIONS: Section[] = [
  {
    label: 'Overview',
    items: [
      { href: '/',        icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/reports', icon: BarChart3,       label: 'Reports', allow: ['music_admin','super_admin','admin','analytics_admin'] },
    ],
  },
  {
    label: 'Content & Catalog',
    items: [
      { href: '/tracks',            icon: Music2,   label: 'Tracks',    allow: ['music_admin','super_admin','admin','content_moderator','artist_manager','label_manager'] },
      { href: '/tracks/moderation', icon: Inbox,    label: 'Moderation Queue', allow: ['music_admin','super_admin','admin','content_moderator'] },
      { href: '/albums',            icon: Disc3,    label: 'Albums',    allow: ['music_admin','super_admin','admin','content_moderator','artist_manager','label_manager'] },
      { href: '/playlists',         icon: ListMusic,label: 'Playlists', allow: ['music_admin','super_admin','admin'] },
    ],
  },
  {
    label: 'Artists & Users',
    items: [
      { href: '/artists',              icon: Users,       label: 'Artists',           allow: ['music_admin','super_admin','admin','artist_manager','label_manager'] },
      { href: '/artists/verification', icon: ShieldCheck, label: 'Verification Queue',allow: ['music_admin','super_admin','admin'] },
      { href: '/artists/strikes',      icon: AlertTriangle,label:'Strikes Ledger',    allow: ['music_admin','super_admin','admin','compliance_officer'] },
      { href: '/users',                icon: User2,       label: 'Users',             allow: ['music_admin','super_admin','admin','support_agent'] },
    ],
  },
  {
    label: 'Live Streaming',
    items: [
      { href: '/live-events',         icon: Radio,      label: 'Live Events',   allow: ['music_admin','super_admin','admin','artist_manager'] },
      { href: '/live-events/schedule',icon: Tv2,        label: 'Scheduled',     allow: ['music_admin','super_admin','admin','artist_manager'] },
      { href: '/tickets',             icon: TicketIcon, label: 'Tickets',       allow: ['music_admin','super_admin','admin','finance_admin'] },
    ],
  },
  {
    label: 'Moderation',
    items: [
      { href: '/moderation',         icon: Inbox, label: 'Moderation Queue', allow: ['music_admin','super_admin','admin','content_moderator'] },
      { href: '/moderation/appeals', icon: Scale, label: 'Appeal Review',    allow: ['music_admin','super_admin','admin','content_moderator'] },
      { href: '/moderation/reports', icon: Flag,  label: 'Content Reports',  allow: ['music_admin','super_admin','admin','content_moderator','support_agent'] },
    ],
  },
  {
    label: 'Finance',
    allow: ['finance_admin','music_admin','super_admin'],
    items: [
      { href: '/finance/royalties', icon: Coins,     label: 'Royalties', allow: ['finance_admin','music_admin','super_admin'] },
      { href: '/finance/payouts',   icon: HandCoins, label: 'Payouts',   allow: ['finance_admin','music_admin','super_admin'] },
      { href: '/finance/tips',      icon: Landmark,  label: 'Tips',      allow: ['finance_admin','music_admin','super_admin'] },
    ],
  },
  {
    label: 'Ads & Growth',
    items: [
      { href: '/ads/campaigns', icon: Megaphone,  label: 'Campaigns',       allow: ['music_admin','super_admin','admin'] },
      { href: '/ads/creatives', icon: ImageIcon,  label: 'Creatives',       allow: ['music_admin','super_admin','admin'] },
      { href: '/ads/targeting', icon: Target,     label: 'Targeting Rules', allow: ['music_admin','super_admin','admin'] },
      { href: '/ads/frequency', icon: Timer,      label: 'Frequency Caps',  allow: ['music_admin','super_admin','admin'] },
      { href: '/ads/analytics', icon: LineChart,  label: 'Ad Analytics',    allow: ['music_admin','super_admin','admin','analytics_admin'] },
    ],
  },
  {
    label: 'CMS',
    items: [
      { href: '/cms/featured',  icon: Star,      label: 'Featured Playlists', allow: ['music_admin','super_admin','admin'] },
      { href: '/cms/banners',   icon: Layout,    label: 'Banners',            allow: ['music_admin','super_admin','admin'] },
      { href: '/cms/trending',  icon: TrendingUp,label: 'Trending Overrides', allow: ['music_admin','super_admin','admin'] },
      { href: '/cms/genres',    icon: Palette,   label: 'Genre Curation',     allow: ['music_admin','super_admin','admin'] },
      { href: '/cms/legal',     icon: FileText,  label: 'Copy & Legal',       allow: ['music_admin','super_admin','admin','compliance_officer'] },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/system/audit',  icon: ScrollText, label: 'Audit Log',           allow: ['music_admin','super_admin','admin','compliance_officer'] },
      { href: '/system/config', icon: Settings,   label: 'Config',              allow: ['music_admin','super_admin'] },
      { href: '/system/roles',  icon: KeyRound,   label: 'Roles & Delegation',  allow: ['super_admin'] },
      { href: '/system/health', icon: Activity,   label: 'Health',              allow: ['music_admin','super_admin','admin'] },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole, roleLabel } = useAuth();
  const scrollRef = useRef<HTMLElement | null>(null);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/');

  const displayName =
    user?.profile?.firstName
      ? `${user.profile.firstName} ${user.profile.lastName ?? ''}`.trim()
      : user?.email?.split('@')[0] ?? 'Admin';
  const av = initials(user?.profile?.firstName ?? user?.firstName, user?.profile?.lastName ?? user?.lastName)
    || (displayName[0] ?? 'A').toUpperCase();

  const primaryRole = useMemo(() => user?.roles?.[0], [user]);

  return (
    <aside
      className="fixed inset-y-0 left-0 w-60 text-white flex flex-col z-40 border-r border-white/5"
      style={{
        background:
          'linear-gradient(180deg, #0F0F12 0%, #0A0A0C 60%, #08080A 100%), ' +
          'radial-gradient(ellipse 60% 30% at 0% 0%, rgba(0,129,255,0.10), transparent 60%)',
      }}
    >
      {/* Logo — WasaaChat parent brand + "Music" accent */}
      <div className="h-16 px-4 flex items-center gap-2 border-b border-white/5 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wasaachat-logo-light.png"
          alt="WasaaChat"
          className="h-6 w-auto"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }}
        />
        <div className="leading-tight ml-1">
          <p className="text-[13px] font-black tracking-tight" style={{ color: '#0081FF' }}>
            Music
          </p>
          <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold">Admin</p>
        </div>
      </div>

      {/* Scroll container — native scrollbar hidden; PerpetualScrollbar overlays a brick one */}
      <div className="relative flex-1 overflow-hidden">
        <nav
          ref={scrollRef}
          className="sidebar-scroll-hidden absolute inset-0 overflow-y-auto py-3 pl-3 pr-4 space-y-4"
        >
          {SECTIONS.map(section => {
            if (section.allow && !hasRole(section.allow)) return null;
            const visibleItems = section.items.filter(i => !i.allow || hasRole(i.allow));
            if (visibleItems.length === 0) return null;
            return (
              <div key={section.label}>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest px-2 mb-1.5">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map(({ href, icon: Icon, label, allow, badge }) => {
                    const active = isActive(href);
                    const link = (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12.5px] font-medium transition-all',
                          active
                            ? 'bg-brick/20 text-white border border-brick/40 shadow-sm shadow-brick/10'
                            : 'text-white/55 hover:text-white hover:bg-white/5',
                        )}
                      >
                        <Icon size={14} strokeWidth={active ? 2.5 : 2} />
                        <span className="flex-1">{label}</span>
                        {badge && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-brick text-white">
                            {badge}
                          </span>
                        )}
                      </Link>
                    );
                    return allow ? (
                      <RequireRole key={href} allow={allow}>{link}</RequireRole>
                    ) : link;
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <PerpetualScrollbar scrollRef={scrollRef} pathname={pathname} />
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-white/5">
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-brick/20 border border-brick/40 flex items-center justify-center text-[11px] font-bold text-brick-300 shrink-0">
            {av}
          </div>
          <div className="flex-1 min-w-0 leading-none">
            <p className="text-[12px] font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-white/45 mt-1 truncate">{roleLabel(primaryRole)}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[12px] text-white/55 hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
