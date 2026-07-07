'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import StatCard from '@/components/ui/StatCard';
import {
  ComboChartBlock, BarChartBlock, PieChartBlock, Heatmap, HeatmapCell, ChartEmpty,
} from '@/components/ui/Charts';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, apiError, AdsAnalytics, AdCampaign, AdCreative } from '@/lib/api';
import { cn, fmtNumber } from '@/lib/utils';
import { LineChart, Megaphone, MousePointerClick, Percent, Coins } from 'lucide-react';
import toast from 'react-hot-toast';

type Range = '7d' | '30d' | '90d' | 'all';
const RANGES: Range[] = ['7d', '30d', '90d', 'all'];

export default function AdAnalyticsPage() {
  const [range, setRange] = useState<Range>('30d');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AdsAnalytics | null>(null);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now);
      if (range === '7d')  from.setDate(now.getDate() - 7);
      if (range === '30d') from.setDate(now.getDate() - 30);
      if (range === '90d') from.setDate(now.getDate() - 90);
      const params: Record<string, string> = {};
      if (range !== 'all') params.from = from.toISOString();
      const [a, c, cr] = await Promise.all([
        musicAdmin.adsAnalytics(params).catch(() => null),
        musicAdmin.listAdCampaigns({ limit: 100 }).then(r => r.items).catch(() => []),
        musicAdmin.listAdCreatives({ limit: 100 }).then(r => r.items).catch(() => []),
      ]);
      setAnalytics(a);
      setCampaigns(c);
      setCreatives(cr);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [range]);
  useEffect(() => { load(); }, [load]);

  const totals = analytics?.totals ?? { impressions: 0, clicks: 0, ctr: 0 };
  const perCampaign = analytics?.perCampaign ?? [];

  const campaignsById = useMemo(() => new Map(campaigns.map(c => [c.id, c])), [campaigns]);

  const comboData = useMemo(() => {
    return perCampaign.slice(0, 12).map(row => {
      const c = campaignsById.get(row.campaignId);
      return {
        name: c?.name?.slice(0, 18) ?? row.campaignId.slice(0, 6),
        impressions: row.impressions,
        ctr: Number((row.ctr * 100).toFixed(2)),
      };
    });
  }, [perCampaign, campaignsById]);

  const stackedByType = useMemo(() => {
    const rows: Record<string, Record<string, unknown>> = {};
    for (const row of perCampaign) {
      const c = campaignsById.get(row.campaignId);
      const name = c?.name?.slice(0, 18) ?? row.campaignId.slice(0, 6);
      const type = c?.campaignType ?? 'display';
      if (!rows[name]) rows[name] = { name };
      rows[name][type] = (Number(rows[name][type] ?? 0)) + row.impressions;
    }
    return Object.values(rows);
  }, [perCampaign, campaignsById]);

  const creativeSplit = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cr of creatives) {
      const t = cr.assetType ?? 'unknown';
      map[t] = (map[t] ?? 0) + 1;
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [creatives]);

  const heatmap: HeatmapCell[] = useMemo(() => {
    const src = (analytics as Record<string, unknown> | null)?.hourly;
    if (!Array.isArray(src)) return [];
    return (src as Array<Record<string, unknown>>).map(row => ({
      row: Number(row.dayOfWeek ?? row.dow ?? 0),
      col: Number(row.hour ?? row.h ?? 0),
      value: Number(row.impressions ?? row.count ?? 0),
    }));
  }, [analytics]);

  const topCreatives = useMemo(() => {
    const byCampaign = new Map(perCampaign.map(r => [r.campaignId, r.impressions]));
    return creatives
      .map(cr => ({ cr, score: cr.campaignId ? (byCampaign.get(cr.campaignId) ?? 0) : 0 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .filter(x => x.score > 0)
      .map(x => ({
        name: (x.cr.altText ?? x.cr.objectKey ?? x.cr.id).slice(0, 24),
        impressions: x.score,
      }));
  }, [creatives, perCampaign]);

  const noData = !loading && totals.impressions === 0 && totals.clicks === 0;

  return (
    <RequireRole
      allow={['music_admin', 'super_admin', 'admin', 'analytics_admin']}
      fallback={<p className="p-6 text-sm text-text-muted">Ad Analytics — Analytics access only.</p>}
    >
      <PageHeader
        title="Ad Analytics"
        subtitle="Impressions, clicks, CTR by campaign, creative, and day-of-week."
        actions={
          <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-xl p-1">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'h-8 px-3 rounded-lg text-xs font-semibold',
                  range === r ? 'bg-brick text-white' : 'text-text-muted hover:text-text',
                )}
              >
                {r === 'all' ? 'All time' : r}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Impressions" value={fmtNumber(totals.impressions)} icon={Megaphone} tone="brick" loading={loading} />
        <StatCard label="Clicks" value={fmtNumber(totals.clicks)} icon={MousePointerClick} tone="info" loading={loading} />
        <StatCard label="CTR" value={`${(totals.ctr * 100).toFixed(2)}%`} icon={Percent} tone="success" loading={loading} />
        <StatCard label="Campaigns live" value={fmtNumber(campaigns.filter(c => c.status === 'active').length)} icon={Coins} tone="warning" loading={loading} />
      </div>

      {noData ? (
        <Card>
          <CardBody>
            <div className="h-64">
              <ChartEmpty
                icon={LineChart}
                message="No impressions or clicks yet — the ad-serve worker hasn't logged any events for this window. Analytics pipeline runs hourly."
              />
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-4">
            <Card>
              <CardHeader title="Impressions & CTR" subtitle="Bar = impressions, line = CTR% — per campaign" />
              <CardBody>
                {loading ? <div className="skeleton h-64 w-full" /> : (
                  <ComboChartBlock
                    data={comboData}
                    xKey="name"
                    bars={[{ key: 'impressions', name: 'Impressions' }]}
                    lines={[{ key: 'ctr', name: 'CTR %' }]}
                    height={320}
                  />
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <Card className="lg:col-span-2">
              <CardHeader title="Impressions by campaign · stacked by type" />
              <CardBody>
                {loading ? <div className="skeleton h-64 w-full" /> : (
                  <BarChartBlock
                    data={stackedByType}
                    xKey="name"
                    series={[
                      { key: 'display', name: 'Display' },
                      { key: 'audio',   name: 'Audio' },
                      { key: 'video',   name: 'Video' },
                      { key: 'native',  name: 'Native' },
                    ]}
                    stacked
                    height={280}
                  />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Creative type split" />
              <CardBody>
                {loading ? <div className="skeleton h-64 w-full" /> : (
                  <PieChartBlock data={creativeSplit} nameKey="name" valueKey="value" height={280} />
                )}
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader title="Impressions heatmap" subtitle="Hour × day-of-week" />
              <CardBody>
                <Heatmap
                  cells={heatmap}
                  rowLabels={['Sun','Mon','Tue','Wed','Thu','Fri','Sat']}
                  colLabels={Array.from({ length: 24 }).map((_, i) => (i % 3 === 0 ? String(i) : ''))}
                  height={220}
                  empty={<ChartEmpty message="No hourly rollup yet — waiting on ad-serve worker to populate AdImpression hourly aggregation." />}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Top-performing creatives" subtitle="By impressions attributed" />
              <CardBody>
                {loading ? <div className="skeleton h-64 w-full" /> : (
                  <BarChartBlock
                    data={topCreatives}
                    xKey="name"
                    series={[{ key: 'impressions', name: 'Impressions' }]}
                    horizontal
                    height={280}
                  />
                )}
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </RequireRole>
  );
}
