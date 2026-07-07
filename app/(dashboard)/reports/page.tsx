'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import {
  LineChartBlock, BarChartBlock, PieChartBlock, ComboChartBlock,
  RadarChartBlock, ScatterChartBlock, Funnel, ProgressRing,
} from '@/components/ui/Charts';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, apiError, Track } from '@/lib/api';
import { cn, fmtNumber } from '@/lib/utils';
import { TrendingUp, CheckCircle2, Percent, Music2 } from 'lucide-react';
import toast from 'react-hot-toast';

type Range = '7d' | '30d' | '90d' | 'ytd' | 'all';
const RANGES: Array<{ id: Range; label: string; days: number }> = [
  { id: '7d',  label: '7d',  days: 7 },
  { id: '30d', label: '30d', days: 30 },
  { id: '90d', label: '90d', days: 90 },
  { id: 'ytd', label: 'YTD', days: 365 },
  { id: 'all', label: 'All time', days: 0 },
];

type Rec = Record<string, unknown>;

function pickSeries(o: unknown, keys: string[]): Array<Rec> {
  if (!o || typeof o !== 'object') return [];
  const r = o as Rec;
  for (const k of keys) {
    const v = r[k];
    if (Array.isArray(v)) return v as Array<Rec>;
  }
  return [];
}

export default function ReportsPage() {
  const [range, setRange] = useState<Range>('30d');
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<Rec | null>(null);
  const [byGenre, setByGenre] = useState<Array<{ genre: string; count: number }>>([]);
  const [topTracks, setTopTracks] = useState<Track[]>([]);
  const [topCountries, setTopCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [conversions, setConversions] = useState<Rec | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, g, t, c, cv] = await Promise.all([
        musicAdmin.streamsAnalytics({ range }).catch(() => null),
        musicAdmin.streamsByGenre().catch(() => []),
        musicAdmin.topTracks({ limit: 12, range }).catch(() => []),
        musicAdmin.subscriptionTopCountries().catch(() => []),
        musicAdmin.subscriptionConversionsSummary().catch(() => null),
      ]);
      setStreams(s as Rec | null);
      setByGenre(g ?? []);
      setTopTracks(t ?? []);
      setTopCountries(c ?? []);
      setConversions(cv as Rec | null);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => { load(); }, [load]);

  // ---------- Derived series ----------

  // DAU / retention combo
  const dauRetention = useMemo(() => {
    const daily = pickSeries(streams, ['series', 'daily', 'byDay', 'streamsDaily', 'data']);
    return daily.map((row: Rec) => ({
      date: String(row.date ?? row.label ?? row.day ?? ''),
      dau: Number(row.dau ?? row.dailyActiveUsers ?? row.uniqueUsers ?? row.users ?? 0),
      retention: Number(row.retention ?? row.retentionRate ?? row.retention_rate ?? 0),
    }));
  }, [streams]);

  // Radar (5 axes) — read from streams payload health block if present,
  // otherwise from constants derived from data we have.
  const platformHealth = useMemo(() => {
    const r = streams as Rec | null;
    const src = (r?.health ?? r?.platformHealth) as Rec | undefined;
    if (src) {
      return [
        { axis: 'Reach',        value: Number(src.reach ?? 0) },
        { axis: 'Engagement',   value: Number(src.engagement ?? 0) },
        { axis: 'Retention',    value: Number(src.retention ?? 0) },
        { axis: 'Monetization', value: Number(src.monetization ?? 0) },
        { axis: 'Growth',       value: Number(src.growth ?? 0) },
      ];
    }
    return [];
  }, [streams]);

  // Funnel — visit → signup → verified → converted
  const funnelSteps = useMemo(() => {
    const src = conversions as Rec | null;
    if (!src) return [];
    const visits = Number(src.visits ?? src.impressions ?? 0);
    const signups = Number(src.signups ?? src.registrations ?? 0);
    const verified = Number(src.verified ?? src.activated ?? 0);
    const converted = Number(src.converted ?? src.subscribed ?? src.paid ?? 0);
    const steps = [
      { label: 'Visits',   value: visits },
      { label: 'Signups',  value: signups },
      { label: 'Verified', value: verified },
      { label: 'Converted', value: converted },
    ].filter(s => s.value > 0);
    return steps;
  }, [conversions]);

  // Scatter — duration vs completion rate per track
  const durationVsCompletion = useMemo(() => {
    return topTracks.map(t => ({
      duration: Math.round(Number(t.duration ?? 0)),
      completion: Number((t as Rec).completionRate ?? (t as Rec).completion ?? 0) * 100,
      streams: Number(t.streamCount ?? 0),
    })).filter(x => x.duration > 0);
  }, [topTracks]);

  // SLA progress rings from the payload if present
  const slaMod = Number((streams as Rec | null)?.slaModeration ?? 0);
  const slaVer = Number((streams as Rec | null)?.slaVerification ?? 0);

  const timeRange = RANGES.find(r => r.id === range)!;

  return (
    <RequireRole
      allow={['music_admin', 'super_admin', 'admin', 'analytics_admin']}
      fallback={<p className="p-6 text-sm text-text-muted">Reports are available only to admins and analytics_admin.</p>}
    >
      <PageHeader
        title="Reports"
        subtitle="Cross-platform analytics — streams, retention, funnel, geo, and top-of-charts."
        actions={
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-semibold',
                  range === r.id ? 'bg-brick text-white shadow-sm' : 'text-text-muted hover:text-text',
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Headline stats from real /admin/analytics/streams payload */}
      {(() => {
        const s = (streams ?? {}) as Rec;
        const totalStreams = Number(s.total ?? s.totalStreams ?? 0);
        const completed = Number(s.completed ?? s.completedStreams ?? 0);
        const rate = Number(s.completionRate ?? (totalStreams > 0 ? Math.round((completed / totalStreams) * 100) : 0));
        const topGenre = byGenre[0];
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatCard label="Total streams" value={fmtNumber(totalStreams)} icon={TrendingUp} tone="brick" loading={loading} />
            <StatCard label="Completed" value={fmtNumber(completed)} icon={CheckCircle2} tone="success" loading={loading} />
            <StatCard label="Completion rate" value={`${rate}%`} icon={Percent} tone="info" loading={loading} />
            <StatCard label="Top genre" value={topGenre ? `${topGenre.genre} (${fmtNumber(topGenre.count)})` : '—'} icon={Music2} tone="warning" loading={loading} />
          </div>
        );
      })()}

      {/* Genre split + top tracks — prominent, using the real data we DO have */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="lg:col-span-1">
          <CardHeader title="Streams by genre" subtitle={`${byGenre.length} genres`} />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <PieChartBlock
                data={byGenre.map(g => ({ name: g.genre, value: g.count }))}
                nameKey="name"
                valueKey="value"
                height={280}
              />
            )}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Top tracks" subtitle={`Ranked by streams · ${topTracks.length} shown`} />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <BarChartBlock
                data={topTracks.slice(0, 10).map(t => ({
                  title: ((t.title ?? '') as string).slice(0, 24),
                  streams: Number((t as Rec).streamCount ?? (t as Rec).playCount ?? 0),
                }))}
                xKey="title"
                series={[{ key: 'streams', name: 'Streams' }]}
                horizontal
                height={280}
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 1: combo (DAU bar + retention line) — full width */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <Card>
          <CardHeader
            title="Daily active users + Retention"
            subtitle={`Bar = DAU, Line = retention rate — window ${timeRange.label}`}
          />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <ComboChartBlock
                data={dauRetention}
                xKey="date"
                bars={[{ key: 'dau', name: 'DAU' }]}
                lines={[{ key: 'retention', name: 'Retention %' }]}
                height={280}
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 2: radar + funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="Platform health" subtitle="Reach · Engagement · Retention · Monetization · Growth" />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <RadarChartBlock data={platformHealth} categoryKey="axis" valueKey="value" height={280} />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Acquisition funnel" subtitle="Visit → Signup → Verified → Converted" />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <Funnel steps={funnelSteps} height={280} />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 3: scatter + top countries horizontal bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <Card>
          <CardHeader title="Duration vs completion" subtitle="One dot per track (bubble sized by stream count)" />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <ScatterChartBlock
                data={durationVsCompletion}
                xKey="duration"
                yKey="completion"
                zKey="streams"
                height={280}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top 10 countries by listeners" />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <BarChartBlock
                data={topCountries.slice(0, 10).map(c => ({ country: c.country ?? 'Unknown', count: c.count }))}
                xKey="country"
                series={[{ key: 'count', name: 'Listeners' }]}
                horizontal
                height={280}
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 4: SLA rings + genre pie + streams line */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader title="SLA compliance" subtitle="Moderation and verification" />
          <CardBody className="flex items-center justify-around gap-4 min-h-[240px]">
            <div className="text-center">
              <ProgressRing value={slaMod} label="Moderation" />
            </div>
            <div className="text-center">
              <ProgressRing value={slaVer} label="Verification" color="var(--chart-2)" />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Streams by genre" />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <PieChartBlock
                data={byGenre.map(g => ({ name: g.genre, value: g.count }))}
                nameKey="name"
                valueKey="value"
                height={240}
              />
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Streams trend" subtitle={`Over ${timeRange.label}`} />
          <CardBody>
            {loading ? <div className="skeleton h-64 w-full" /> : (
              <LineChartBlock
                data={dauRetention}
                xKey="date"
                series={[{ key: 'dau', name: 'DAU' }]}
                height={240}
              />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 5: top tracks bar */}
      <Card>
        <CardHeader title="Top tracks" subtitle={`By stream count over ${timeRange.label}`} />
        <CardBody>
          {loading ? <div className="skeleton h-72 w-full" /> : (
            <BarChartBlock
              data={topTracks.map(t => ({ title: (t.title ?? '—').slice(0, 24), streamCount: Number(t.streamCount ?? 0) }))}
              xKey="title"
              series={[{ key: 'streamCount', name: 'Streams' }]}
              height={320}
            />
          )}
          <p className="text-[11px] text-text-muted mt-2">
            {loading ? '' : `${topTracks.length} tracks · ${fmtNumber(topTracks.reduce((a, t) => a + Number(t.streamCount ?? 0), 0))} total streams`}
          </p>
        </CardBody>
      </Card>
    </RequireRole>
  );
}
