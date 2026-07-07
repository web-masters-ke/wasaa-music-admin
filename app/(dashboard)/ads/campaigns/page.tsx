'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCcw, Search } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import { Select } from '@/components/forms';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, AdCampaign, apiError } from '@/lib/api';
import { fmtCurrency, fmtDate, statusPillClass } from '@/lib/utils';
import toast from 'react-hot-toast';

const STATUSES = ['', 'draft', 'pending_approval', 'approved', 'active', 'paused', 'rejected', 'completed', 'archived'];
const TYPES    = ['', 'display', 'audio', 'video', 'native'];

export default function AdCampaignsPage() {
  const [items, setItems] = useState<AdCampaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [campaignType, setCampaignType] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (q) params.q = q;
      if (status) params.status = status;
      if (campaignType) params.campaignType = campaignType;
      const res = await musicAdmin.listAdCampaigns(params);
      setItems(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, q, status, campaignType]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce search
    return () => clearTimeout(t);
  }, [load]);

  const cols: Column<AdCampaign>[] = useMemo(() => [
    {
      key: 'name', header: 'Campaign',
      render: r => (
        <div>
          <p className="text-sm font-semibold text-text">{r.name}</p>
          <p className="text-[11px] text-text-muted">{r.advertiserName ?? '—'}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: r => <Badge tone="muted">{r.campaignType ?? '—'}</Badge> },
    { key: 'status', header: 'Status', render: r => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(r.status)}`}>
        {r.status ?? '—'}
      </span>
    ) },
    { key: 'budget', header: 'Budget', render: r => fmtCurrency(r.budgetTotal ?? 0, r.currency ?? 'KES') },
    { key: 'daily', header: 'Daily', render: r => fmtCurrency(r.budgetDaily ?? 0, r.currency ?? 'KES') },
    { key: 'window', header: 'Runs', render: r => (
      <div className="text-[11px] text-text-muted">
        <p>{fmtDate(r.startDate)}</p>
        <p>→ {fmtDate(r.endDate)}</p>
      </div>
    ) },
    { key: 'created', header: 'Created', render: r => <span className="text-[11px] text-text-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right', render: r => (
      <Link href={`/ads/campaigns/${r.id}`} className="text-xs font-semibold text-brick hover:text-brick-600">Open →</Link>
    ) },
  ], []);

  return (
    <RequireRole allow={['music_admin', 'super_admin', 'admin']} fallback={<p className="p-6 text-sm text-text-muted">Access denied.</p>}>
      <PageHeader
        title="Ad Campaigns"
        subtitle={`${total} campaign${total === 1 ? '' : 's'} · advertisers, budgets, targeting.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>
            <Link href="/ads/campaigns/new" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-brick hover:bg-brick-600 text-white text-sm font-semibold">
              <Plus size={13} /> New campaign
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1); }}
            placeholder="Search campaigns…"
            className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick"
          />
        </div>
        <div className="w-40">
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} options={STATUSES.map(s => ({ value: s, label: s || 'All statuses' }))} />
        </div>
        <div className="w-40">
          <Select value={campaignType} onChange={e => { setCampaignType(e.target.value); setPage(1); }} options={TYPES.map(s => ({ value: s, label: s || 'All types' }))} />
        </div>
      </div>

      <DataTable
        columns={cols}
        data={items}
        loading={loading}
        empty={
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text mb-1">No campaigns yet</p>
            <p className="text-xs text-text-muted mb-3">Create your first campaign to start booking ad inventory.</p>
            <Link href="/ads/campaigns/new" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-brick hover:bg-brick-600 text-white text-sm font-semibold">
              <Plus size={13} /> New campaign
            </Link>
          </div>
        }
      />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </RequireRole>
  );
}
