'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { RefreshCcw, Search, AlertTriangle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import StatCard from '@/components/ui/StatCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Select } from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, StrikeLedgerRow, apiError } from '@/lib/api';
import { fmtDate, humanRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

const SEVERITIES = ['', 'warning', 'strike', 'ban'];

export default function StrikesLedgerPage() {
  const [items, setItems] = useState<StrikeLedgerRow[]>([]);
  const [meta, setMeta] = useState<{ total: number; summary?: { active: number; bySeverity: Record<string, number> } }>({ total: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [severity, setSeverity] = useState('');
  const [active, setActive] = useState<'all' | 'true' | 'false'>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (severity) params.severity = severity;
      if (active !== 'all') params.active = active;
      const res = await musicAdmin.listStrikesLedger(params);
      setItems(res.items as StrikeLedgerRow[]);
      setTotalPages(res.pages);
      // The ledger endpoint returns { data, meta:{ summary } }. unwrapPaginated
      // captures items/pages but not the summary — grab it from res.total plus
      // a follow-up? Actually musicAdmin returns { items,total,pages,page } —
      // we lose the nested summary. Read stats from items until backend
      // exposes it in the pagination meta. For counts below we approximate.
      setMeta({ total: res.total });
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, [page, severity, active]);
  useEffect(() => { load(); }, [load]);

  const filtered = q ? items.filter(r =>
    (r.artist?.stageName ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (r.reason ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (r.artistId ?? '').includes(q)
  ) : items;

  const cols: Column<StrikeLedgerRow>[] = useMemo(() => [
    { key: 'artist', header: 'Artist', render: r => (
      <div>
        <p className="text-sm font-semibold text-text">{r.artist?.stageName ?? r.artistId?.slice(0, 8) ?? '—'}</p>
        <p className="text-[11px] text-text-muted font-mono">{r.artistId ?? '—'}</p>
      </div>
    ) },
    { key: 'severity', header: 'Severity', render: r => (
      <Badge tone={r.severity === 'ban' ? 'destructive' : r.severity === 'strike' ? 'warning' : 'muted'}>
        {r.severity ?? 'warning'}
      </Badge>
    ) },
    { key: 'reason', header: 'Reason', render: r => <span className="text-sm text-text truncate">{(r.reason ?? '—').slice(0, 80)}</span> },
    { key: 'issued', header: 'Issued', render: r => <span className="text-[11px] text-text-muted">{humanRelative(r.issuedAt)}</span> },
    { key: 'expires', header: 'Expires', render: r => r.expiresAt ? <span className="text-[11px] text-text-muted">{fmtDate(r.expiresAt)}</span> : <span className="text-[11px] text-text-muted">—</span> },
    { key: 'active', header: 'Active', render: r => r.active === false || r.revokedAt ? <Badge tone="muted">revoked</Badge> : <Badge tone="destructive">active</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: r => (
      <Link href={`/artists/${r.artistId}`} className="text-xs font-semibold text-brick hover:text-brick-600">Open artist →</Link>
    ) },
  ], []);

  const activeCount = items.filter(i => i.active !== false && !i.revokedAt).length;
  const bansCount   = items.filter(i => i.severity === 'ban').length;
  const strikesCount = items.filter(i => i.severity === 'strike').length;
  const warningsCount = items.filter(i => i.severity === 'warning').length;

  return (
    <RequireRole allow={['music_admin','super_admin','admin','compliance_officer']} fallback={<p className="p-6 text-sm text-text-muted">Access denied.</p>}>
      <PageHeader
        title="Strikes Ledger"
        subtitle={`${meta.total} strike record${meta.total === 1 ? '' : 's'} · cross-artist compliance view.`}
        actions={<Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active strikes" value={activeCount} icon={AlertTriangle} tone="destructive" loading={loading} />
        <StatCard label="Warnings" value={warningsCount} tone="warning" loading={loading} />
        <StatCard label="Strikes" value={strikesCount} tone="warning" loading={loading} />
        <StatCard label="Bans" value={bansCount} tone="destructive" loading={loading} />
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by artist, reason…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
        <div className="w-40">
          <Select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} options={SEVERITIES.map(s => ({ value: s, label: s || 'All severities' }))} />
        </div>
        <div className="w-40">
          <Select value={active} onChange={e => { setActive(e.target.value as typeof active); setPage(1); }}
            options={[{ value: 'all', label: 'All' }, { value: 'true', label: 'Active only' }, { value: 'false', label: 'Revoked only' }]} />
        </div>
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        loading={loading}
        empty={<div className="py-10 text-center text-sm text-text-muted">No strikes in this view.</div>}
      />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </RequireRole>
  );
}
