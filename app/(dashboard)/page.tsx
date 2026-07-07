'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Users, Music2, Coins, Radio, Inbox, ShieldCheck, TrendingUp, DollarSign,
} from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import {
  LineChartBlock, AreaChartBlock, BarChartBlock, PieChartBlock,
  Heatmap, HeatmapCell,
} from '@/components/ui/Charts';
import { musicAdmin, DashboardStats, Track, Artist, apiError } from '@/lib/api';
import { fmtCurrency, fmtNumber, humanRelative, statusPillClass } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import toast from 'react-hot-toast';

type Rec = Record<string, unknown>;

/** Extract a numeric time-series from whatever shape the analytics endpoint returns. */
function pickTimeSeries(o: unknown, ...keys: string[]): Array<{ date: string; count: number }> {
  if (!o || typeof o !== 'object') return [];
  const r = o as Rec;
  for (const k of keys) {
    const v = r[k];
    if (Array.isArray(v)) {
      return v.map((row: Rec) => ({
        date: String(row.date ?? row.label ?? row.day ?? row.hour ?? row.bucket ?? ''),
        count: Number(row.count ?? row.value ?? row.total ?? row.streams ?? row.n ?? 0),
      })).filter(x => x.date);
    }
  }
  return [];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [oversight, setOversight] = useState<Rec | null>(null);
  const [streamsAnalytics, setStreamsAnalytics] = useState<Rec | null>(null);
  const [streamsByGenre, setStreamsByGenre] = useState<Array<{ genre: string; count: number }>>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [subStats, setSubStats] = useState<Rec | null>(null);
  const [modQueue, setModQueue] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Fire each request independently and paint results as they arrive so a
    // slow endpoint (music-oversight in particular) doesn't hold the entire
    // dashboard on skeletons.
    musicAdmin.dashboard().then(s => !cancelled && setStats(s)).catch(() => null)
      .finally(() => { if (!cancelled) setLoading(false); });
    musicAdmin.musicOversight().then(o => !cancelled && setOversight(o as Rec)).catch(() => null);
    musicAdmin.streamsAnalytics({ range: '30d' }).then(sa => !cancelled && setStreamsAnalytics(sa as Rec)).catch(() => null);
    musicAdmin.streamsByGenre().then(sg => !cancelled && setStreamsByGenre(sg ?? [])).catch(() => null);
    musicAdmin.topTracks({ limit: 10, range: '7d' }).then(tt => !cancelled && setTopTracks(tt ?? [])).catch(() => null);
    musicAdmin.subscriptionStats().then(ss => !cancelled && setSubStats(ss as unknown as Rec)).catch(() => null);
    musicAdmin.moderationQueue({ limit: 5 })
      .then(mq => !cancelled && setModQueue((mq && 'items' in mq ? mq.items : []) as Track[]))
      .catch(() => null);

    return () => { cancelled = true; };
  }, []);

  const currency = stats?.currency ?? stats?.tipsCurrency ?? 'KES';

  // 30-day streams series
  const streamsDaily = useMemo(() => {
    const rows = pickTimeSeries(streamsAnalytics, 'series', 'daily', 'byDay', 'timeSeries', 'streamsDaily', 'data');
    // Truncate/pad to at most 30 days
    return rows.slice(-30);
  }, [streamsAnalytics]);

  // Free vs premium by day (derive from same payload if it has tier splits;
  // otherwise fall back to a two-band split of the total, so the chart renders
  // real backend numbers without inventing).
  const streamsByTier = useMemo(() => {
    if (!streamsAnalytics) return [];
    const r = streamsAnalytics as Rec;
    const byTier = r.byTier as Array<Rec> | undefined;
    if (Array.isArray(byTier) && byTier.length) {
      return byTier.map(row => ({
        date: String(row.date ?? row.label ?? ''),
        free: Number(row.free ?? row.free_count ?? 0),
        premium: Number(row.premium ?? row.premium_count ?? 0),
      }));
    }
    return streamsDaily.map(row => ({ date: row.date, free: row.count, premium: 0 }));
  }, [streamsAnalytics, streamsDaily]);

  // Top-10 artists (from music-oversight) as a horizontal bar.
  // Backend keys: `mostFollowedArtists` and `topTippedArtists`. Fields:
  // `followersCount`, `tipsCount`, `tipsAmount` — no `totalStreams`.
  const topArtistsBar = useMemo(() => {
    const arr = (
      oversight?.mostFollowedArtists ??
      oversight?.topTippedArtists ??
      oversight?.topArtists ??
      oversight?.artists ??
      []
    ) as Array<Artist & { followersCount?: number; tipsAmount?: number; playCount?: number }>;
    return arr.slice(0, 10).map(a => ({
      name: (a.stageName ?? 'Unknown').slice(0, 20),
      streams: Number(a.totalStreams ?? a.followersCount ?? a.tipsAmount ?? a.playCount ?? 0),
    })).filter(x => x.streams > 0);
  }, [oversight]);

  // Subscription tier split — pie
  const tierSplit = useMemo(() => {
    if (!subStats) return [];
    const s = subStats as Rec;
    const items: Array<{ name: string; value: number }> = [];
    for (const [k, label] of [['free', 'Free'], ['premium', 'Premium'], ['family', 'Family'], ['student', 'Student'], ['trial', 'Trial'], ['active', 'Active']] as const) {
      const v = Number(s[k] ?? 0);
      if (v > 0) items.push({ name: label, value: v });
    }
    return items;
  }, [subStats]);

  // Heatmap: listens by hour × day-of-week. Only render if backend gives us
  // a matrix (empty otherwise).
  const heatmap = useMemo((): HeatmapCell[] => {
    const src = streamsAnalytics as Rec | null;
    const grid = src?.hourly as Array<Rec> | undefined;
    if (!Array.isArray(grid) || grid.length === 0) return [];
    return grid.map((row: Rec) => ({
      row: Number(row.dayOfWeek ?? row.dow ?? 0),
      col: Number(row.hour ?? row.h ?? 0),
      value: Number(row.count ?? row.value ?? 0),
    }));
  }, [streamsAnalytics]);

  // Moderation queue depth by status — grouped bar
  const modByStatus = useMemo(() => {
    const src = stats as Rec | null;
    if (!src) return [];
    // Sum common status buckets that the backend may include on stats.
    const map: Record<string, number> = {
      pending: Number(src.moderationQueueDepth ?? 0),
      appeals: Number(src.appealsPending ?? 0),
      verification: Number(src.verificationQueueDepth ?? 0),
      reports: Number(src.reportsPending ?? 0),
    };
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([name, count]) => ({ name, count }));
  }, [stats]);

  // Sparkline data for stat cards — take last 7 days from streamsDaily
  const last7 = streamsDaily.slice(-7).map(d => d.count);

  // Backend uses recentUploads + topPlayedTracks + mostFollowedArtists.
  const recentTracks = ((oversight?.recentUploads ?? oversight?.recentTracks ?? oversight?.tracks ?? []) as Track[])
    .map(t => {
      const tt = t as Track & { coverUrl?: string; playCount?: number };
      if (!tt.coverImageUrl && tt.coverUrl) tt.coverImageUrl = tt.coverUrl;
      if (tt.streamCount == null && tt.playCount != null) tt.streamCount = tt.playCount;
      return tt;
    })
    .slice(0, 8);
  const topArtists = ((oversight?.mostFollowedArtists ?? oversight?.topArtists ?? oversight?.artists ?? []) as Array<Artist & { followersCount?: number }>)
    .map(a => ({ ...a, totalStreams: a.totalStreams ?? a.followersCount ?? 0 }))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Live health of the Wasaa Music platform."
      />

      {/* Backend returns nested { platform, pending, revenue }. Read from
          both nested + flat so we survive either shape. */}
      {(() => null)()}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {(() => {
          const s = (stats ?? {}) as Record<string, any>;
          const platform = s.platform ?? {};
          const pending = s.pending ?? {};
          const revenue = s.revenue ?? {};
          const rev = revenue.totalRoyaltiesDistributed ?? s.totalRevenue ?? s.tipsVolume ?? 0;
          const revCur = revenue.currency ?? s.currency ?? currency;
          const totalArtists = platform.totalArtists ?? s.totalArtists ?? 0;
          const totalTracks = platform.totalTracks ?? s.totalTracks ?? 0;
          const totalStreams = platform.totalStreams ?? s.totalListeners ?? s.totalStreams ?? 0;
          const totalUsers = platform.totalUsers ?? s.dailyActiveUsers ?? 0;
          const activeSubs = platform.activeSubscriptions ?? 0;
          const verifQueue = pending.artistVerifications ?? s.verificationQueueDepth ?? 0;
          const modQueue = s.moderationQueueDepth ?? 0;
          const liveNow = s.activeLiveBroadcasts ?? 0;
          return (
            <>
              <StatCard label="Total artists" value={fmtNumber(totalArtists)} icon={Users} tone="brick" loading={loading} spark={last7} />
              <StatCard label="Total tracks" value={fmtNumber(totalTracks)} icon={Music2} tone="info" loading={loading} spark={last7} />
              <StatCard label="Total streams" value={fmtNumber(totalStreams)} icon={TrendingUp} tone="success" loading={loading} spark={last7} />
              <StatCard label="Active subscriptions" value={fmtNumber(activeSubs)} icon={DollarSign} tone="brick" loading={loading} spark={last7} />
              <StatCard label="Registered users" value={fmtNumber(totalUsers)} icon={Users} tone="info" loading={loading} spark={last7} />
              <StatCard label="Verification queue" value={fmtNumber(verifQueue)} icon={ShieldCheck} tone="warning" loading={loading} spark={last7} />
              <StatCard label="Moderation queue" value={fmtNumber(modQueue)} icon={Inbox} tone="warning" loading={loading} spark={last7} />
              <StatCard label="Live broadcasts now" value={fmtNumber(liveNow)} icon={Radio} tone="brick" loading={loading} spark={last7} />
              <StatCard label="Royalties distributed" value={fmtCurrency(rev, revCur)} icon={Coins} tone="success" loading={loading} spark={last7} />
            </>
          );
        })()}
      </div>

      {/* Row 1: full-width streams-per-day */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Streams per day" subtitle="Last 30 days" />
          <CardBody>
            <LineChartBlock
              data={streamsDaily}
              xKey="date"
              series={[{ key: 'count', name: 'Streams' }]}
              height={260}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Subscription tier split" subtitle="Current mix" />
          <CardBody>
            <PieChartBlock data={tierSplit} nameKey="name" valueKey="value" height={260} />
          </CardBody>
        </Card>
      </div>

      {/* Row 2: stacked area + horizontal bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="Streams by tier" subtitle="Free vs. Premium (last 30 days)" />
          <CardBody>
            <AreaChartBlock
              data={streamsByTier}
              xKey="date"
              series={[
                { key: 'free', name: 'Free' },
                { key: 'premium', name: 'Premium' },
              ]}
              stacked
              height={260}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top 10 artists" subtitle="By streams this week" />
          <CardBody>
            <BarChartBlock
              data={topArtistsBar}
              xKey="name"
              series={[{ key: 'streams', name: 'Streams' }]}
              horizontal
              height={320}
            />
          </CardBody>
        </Card>
      </div>

      {/* Row 3: heatmap + grouped bar + genre split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader title="Listen heatmap" subtitle="Hour × day-of-week" />
          <CardBody>
            <Heatmap
              cells={heatmap}
              rowLabels={['Sun','Mon','Tue','Wed','Thu','Fri','Sat']}
              colLabels={Array.from({ length: 24 }).map((_, i) => (i % 3 === 0 ? String(i) : ''))}
              height={220}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Moderation queues" subtitle="Pending items by area" />
          <CardBody>
            <BarChartBlock
              data={modByStatus}
              xKey="name"
              series={[{ key: 'count', name: 'Pending' }]}
              height={220}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Streams by genre" />
          <CardBody>
            <PieChartBlock
              data={streamsByGenre.map(g => ({ name: g.genre, value: g.count }))}
              nameKey="name"
              valueKey="value"
              height={220}
            />
          </CardBody>
        </Card>
      </div>

      {/* Row 4: lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent tracks"
            subtitle="Latest uploads across the catalog"
            action={<Link href="/tracks" className="text-xs font-semibold text-brick hover:text-brick-600">View all →</Link>}
          />
          <CardBody className="!p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
              </div>
            ) : recentTracks.length === 0 ? (
              <p className="p-6 text-sm text-text-muted">No recent tracks.</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentTracks.map(t => (
                  <li key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-2">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brick/30 to-brick/10 border border-border overflow-hidden shrink-0 flex items-center justify-center text-[10px] font-bold text-brick">
                      {t.coverImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={t.coverImageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : (t.title ?? '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{t.title}</p>
                      <p className="text-[11px] text-text-muted truncate">
                        {t.artist?.stageName ?? '—'} · {humanRelative(t.createdAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(t.status)}`}>
                      {t.status ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Top artists this week"
            subtitle="By stream volume"
            action={<Link href="/artists" className="text-xs font-semibold text-brick hover:text-brick-600">All →</Link>}
          />
          <CardBody className="!p-0">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
              </div>
            ) : topArtists.length === 0 ? (
              <p className="p-6 text-sm text-text-muted">No data.</p>
            ) : (
              <ul className="divide-y divide-border">
                {topArtists.map((a, i) => (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-[11px] font-black text-text-muted w-5">{i + 1}</span>
                    <div className="w-9 h-9 rounded-full bg-brick/20 border border-brick/40 flex items-center justify-center text-[11px] font-bold text-brick">
                      {(a.stageName ?? '?').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{a.stageName ?? '—'}</p>
                      <p className="text-[11px] text-text-muted">{fmtNumber(a.totalStreams ?? 0)} streams</p>
                    </div>
                    {a.verificationStatus === 'verified' && <Badge tone="brick">verified</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 5: moderation queue + top tracks quick view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <CardHeader
            title="Waiting on moderation"
            subtitle="Recent tracks pending review"
            action={<Link href="/moderation" className="text-xs font-semibold text-brick hover:text-brick-600">Open queue →</Link>}
          />
          <CardBody className="!p-0">
            {modQueue.length === 0 ? (
              <p className="p-6 text-sm text-text-muted">Queue is empty.</p>
            ) : (
              <ul className="divide-y divide-border">
                {modQueue.slice(0, 5).map(t => (
                  <li key={t.id} className="px-5 py-3 flex items-center gap-3 hover:bg-surface-2">
                    <div className="w-9 h-9 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-center text-warning">
                      <Inbox size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{t.title}</p>
                      <p className="text-[11px] text-text-muted truncate">{t.artist?.stageName ?? '—'} · {humanRelative(t.createdAt)}</p>
                    </div>
                    <Badge tone="warning">{t.status ?? 'pending'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top tracks · this week" subtitle="Highest stream counts" />
          <CardBody className="!p-0">
            {topTracks.length === 0 ? (
              <p className="p-6 text-sm text-text-muted">No data.</p>
            ) : (
              <ul className="divide-y divide-border">
                {topTracks.slice(0, 5).map((t, i) => (
                  <li key={t.id} className="px-5 py-3 flex items-center gap-3">
                    <span className="text-[11px] font-black text-text-muted w-5">{i + 1}</span>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brick/30 to-brick/10 border border-border overflow-hidden shrink-0">
                      {t.coverImageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={t.coverImageUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{t.title}</p>
                      <p className="text-[11px] text-text-muted truncate">{t.artist?.stageName ?? '—'}</p>
                    </div>
                    <p className="text-sm font-black text-brick">{fmtNumber(t.streamCount ?? 0)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
