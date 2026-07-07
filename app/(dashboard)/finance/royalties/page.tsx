'use client';
import { useEffect, useMemo, useState, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import StatCard from '@/components/ui/StatCard';
import { BarChartBlock, PieChartBlock, LineChartBlock } from '@/components/ui/Charts';
import { Select } from '@/components/forms';
import Button from '@/components/ui/Button';
import { musicAdmin, Royalty, apiError } from '@/lib/api';
import { fmtCurrency, fmtDate, statusPillClass } from '@/lib/utils';
import { RequireRole } from '@/lib/auth';
import { Coins, Users, Landmark, DollarSign, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUSES = ['', 'pending', 'approved', 'paid', 'rejected'];

export default function RoyaltiesPage() {
  const [items, setItems] = useState<Royalty[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (status) params.status = status;
      const res = await musicAdmin.royaltyLedger(params);
      setItems(res.items); setTotalPages(res.pages); setTotal(res.total);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  const adjust = async (r: Royalty) => {
    const raw = prompt('New amount:'); if (!raw) return;
    const reason = prompt('Adjustment reason?'); if (!reason) return;
    setBusy(r.id);
    try { await musicAdmin.adjustRoyalty(r.id, Number(raw), reason); toast.success('Adjusted'); load(); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };

  const cols: Column<Royalty>[] = [
    { key: 'artist', header: 'Artist', render: r => (
      <div>
        <p className="text-sm font-semibold text-text">{r.artist?.stageName ?? '—'}</p>
        <p className="text-[11px] text-text-muted font-mono">{r.artistId?.slice(0, 8) ?? '—'}</p>
      </div>
    ) },
    { key: 'track', header: 'Track', render: r => <span className="text-xs text-text-muted">{r.track?.title ?? r.trackId ?? '—'}</span> },
    { key: 'period', header: 'Period', render: r => <span className="text-xs text-text-muted">{r.period ?? '—'}</span> },
    { key: 'amount', header: 'Amount', render: r => <span className="text-sm font-black text-brick">{fmtCurrency(r.amount, r.currency)}</span> },
    { key: 's', header: 'Status', render: r => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(r.status)}`}>{r.status}</span> },
    { key: 'created', header: 'Created', render: r => <span className="text-xs text-text-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'a', header: '', className: 'text-right', render: r => <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => adjust(r)}>Adjust</Button> },
  ];

  const filtered = q ? items.filter(i => (i.artist?.stageName ?? '').toLowerCase().includes(q.toLowerCase()) || (i.track?.title ?? '').toLowerCase().includes(q.toLowerCase())) : items;

  // Summaries
  const summary = useMemo(() => {
    const totalAmt = items.reduce((a, r) => a + Number(r.amount ?? 0), 0);
    const byStatus: Record<string, number> = {};
    for (const r of items) {
      const s = r.status ?? 'unknown';
      byStatus[s] = (byStatus[s] ?? 0) + Number(r.amount ?? 0);
    }
    const byArtist: Record<string, number> = {};
    for (const r of items) {
      const key = r.artist?.stageName ?? r.artistId ?? '—';
      byArtist[key] = (byArtist[key] ?? 0) + Number(r.amount ?? 0);
    }
    const byPeriod: Record<string, number> = {};
    for (const r of items) {
      const key = r.period ?? fmtDate(r.createdAt);
      byPeriod[key] = (byPeriod[key] ?? 0) + Number(r.amount ?? 0);
    }
    return {
      totalAmt,
      statusPie: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      artistBar: Object.entries(byArtist).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, amount]) => ({ name: name.slice(0, 18), amount })),
      periodLine: Object.entries(byPeriod).slice(-20).map(([period, amount]) => ({ period, amount })),
    };
  }, [items]);

  return (
    <RequireRole allow={['finance_admin','music_admin','super_admin']} fallback={<div className="p-6 text-sm text-text-muted">Finance access only.</div>}>
      <PageHeader title="Royalties" subtitle={`${total} entries in ledger · per-track / per-period royalty records.`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total on page" value={fmtCurrency(summary.totalAmt, 'KES')} icon={DollarSign} tone="success" loading={loading} />
        <StatCard label="Entries" value={total} icon={Landmark} tone="brick" loading={loading} />
        <StatCard label="Distinct artists" value={new Set(items.map(i => i.artistId)).size} icon={Users} tone="info" loading={loading} />
        <StatCard label="Pending status" value={items.filter(i => i.status === 'pending').length} icon={Coins} tone="warning" loading={loading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardHeader title="Status distribution" />
          <CardBody>
            <PieChartBlock data={summary.statusPie} nameKey="name" valueKey="value" height={240} />
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Top 10 artists by royalty" />
          <CardBody>
            <BarChartBlock data={summary.artistBar} xKey="name" series={[{ key: 'amount', name: 'Amount (KES)' }]} horizontal height={240} />
          </CardBody>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader title="Royalty by period" />
        <CardBody>
          <LineChartBlock data={summary.periodLine} xKey="period" series={[{ key: 'amount', name: 'Amount (KES)' }]} height={220} />
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search artist, track…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
        <div className="w-40">
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} options={STATUSES.map(s => ({ value: s, label: s || 'All statuses' }))} />
        </div>
      </div>

      <DataTable columns={cols} data={filtered} loading={loading} empty={<div className="py-10 text-center text-sm text-text-muted">No royalty entries.</div>} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </RequireRole>
  );
}
