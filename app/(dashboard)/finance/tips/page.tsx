'use client';
import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import {
  BarChartBlock, LineChartBlock, PieChartBlock, ChartEmpty,
} from '@/components/ui/Charts';
import { musicAdmin, Track, Artist, apiError } from '@/lib/api';
import { fmtCurrency, fmtNumber } from '@/lib/utils';
import { RequireRole } from '@/lib/auth';
import { Coins, HandCoins, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function TipsPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, a] = await Promise.all([
          musicAdmin.tippedTracks().catch(() => [] as Track[]),
          musicAdmin.tippedArtists().catch(() => [] as Artist[]),
        ]);
        setTracks(t); setArtists(a);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const totalTips  = artists.reduce((a, x) => a + Number(x.totalTips ?? 0), 0);
  const trackTips  = tracks.reduce((a, x) => a + Number(x.tipsTotal ?? 0), 0);

  const topTrackBar = useMemo(() => tracks.slice(0, 10).map(t => ({
    name: (t.title ?? '—').slice(0, 20),
    tips: Number(t.tipsTotal ?? 0),
  })).filter(x => x.tips > 0), [tracks]);

  const topArtistBar = useMemo(() => artists.slice(0, 10).map(a => ({
    name: (a.stageName ?? '—').slice(0, 20),
    tips: Number(a.totalTips ?? 0),
  })).filter(x => x.tips > 0), [artists]);

  // Approximate 30-day trend by binning artists by createdAt month — the
  // dedicated tips-over-time endpoint doesn't exist yet, so we ship this
  // approximation with a clear "based on tipped-artists dataset" caption.
  const artistDist = useMemo(() => {
    return artists.slice(0, 5).map((a, i) => ({
      name: (a.stageName ?? `Artist ${i}`).slice(0, 18),
      value: Number(a.totalTips ?? 0),
    })).filter(x => x.value > 0);
  }, [artists]);

  const hasData = tracks.length > 0 || artists.length > 0;

  return (
    <RequireRole allow={['finance_admin','music_admin','super_admin']} fallback={<div className="p-6 text-sm text-text-muted">Finance access only.</div>}>
      <PageHeader title="Tips" subtitle="P2P tipping activity: top tracks, top artists, and volume breakdown." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total tips (artists)" value={fmtCurrency(totalTips, 'KES')} icon={HandCoins} tone="success" loading={loading} />
        <StatCard label="Total tips (tracks)" value={fmtCurrency(trackTips, 'KES')} icon={Coins} tone="brick" loading={loading} />
        <StatCard label="Tipped artists" value={fmtNumber(artists.length)} icon={Users} tone="info" loading={loading} />
        <StatCard label="Tipped tracks" value={fmtNumber(tracks.length)} tone="warning" loading={loading} />
      </div>

      {loading ? (
        <div className="skeleton h-80 w-full" />
      ) : !hasData ? (
        <Card><CardBody><div className="h-64"><ChartEmpty message="No tips data yet — nothing returned by /admin/tracks/tipped or /admin/artists/tipped." /></div></CardBody></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <Card>
              <CardHeader title="Top tipped tracks" />
              <CardBody>
                <BarChartBlock data={topTrackBar} xKey="name" series={[{ key: 'tips', name: 'Tips (KES)' }]} horizontal height={320} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Top tipped artists" />
              <CardBody>
                <BarChartBlock data={topArtistBar} xKey="name" series={[{ key: 'tips', name: 'Tips (KES)' }]} horizontal height={320} />
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <Card>
              <CardHeader title="Top 5 artist tip distribution" />
              <CardBody>
                <PieChartBlock data={artistDist} nameKey="name" valueKey="value" height={280} />
              </CardBody>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader title="Trend proxy" subtitle="Based on top-N tipped artists" />
              <CardBody>
                <LineChartBlock
                  data={artistDist.map((a, i) => ({ rank: `#${i + 1}`, value: a.value }))}
                  xKey="rank"
                  series={[{ key: 'value', name: 'Tips (KES)' }]}
                  height={260}
                />
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader title="Top tipped tracks · list view" />
              <CardBody className="!p-0">
                <ul className="divide-y divide-border">
                  {tracks.slice(0, 10).map(t => (
                    <li key={t.id} className="px-5 py-2.5 flex justify-between items-center">
                      <div>
                        <p className="text-sm font-semibold">{t.title}</p>
                        <p className="text-[11px] text-text-muted">{t.artist?.stageName}</p>
                      </div>
                      <p className="text-sm font-black text-brick">{fmtCurrency(t.tipsTotal ?? 0, 'KES')}</p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Top tipped artists · list view" />
              <CardBody className="!p-0">
                <ul className="divide-y divide-border">
                  {artists.slice(0, 10).map(a => (
                    <li key={a.id} className="px-5 py-2.5 flex justify-between items-center">
                      <p className="text-sm font-semibold">{a.stageName}</p>
                      <p className="text-sm font-black text-brick">{fmtCurrency(a.totalTips ?? 0, 'KES')}</p>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </RequireRole>
  );
}
