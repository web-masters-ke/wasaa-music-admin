'use client';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import { musicAdmin, Payout, apiError } from '@/lib/api';
import { fmtCurrency, fmtDate, statusPillClass } from '@/lib/utils';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function PayoutsPage() {
  const [items, setItems] = useState<Payout[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'pending') {
        const list = await musicAdmin.pendingPayouts();
        setItems(list); setTotalPages(1);
      } else {
        const res = await musicAdmin.listPayouts({ page, limit: 25, status: tab === 'all' ? undefined : tab });
        setItems(res.items); setTotalPages(res.pages);
      }
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page, tab]);
  useEffect(() => { load(); }, [load]);

  const approve = async (p: Payout) => {
    const notes = prompt('Notes (optional):') ?? undefined;
    setBusy(p.id);
    try { await musicAdmin.approvePayout(p.id, notes); toast.success('Approved'); load(); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };
  const reject = async (p: Payout) => {
    const reason = prompt('Reject reason?'); if (!reason) return;
    setBusy(p.id);
    try { await musicAdmin.rejectPayout(p.id, reason); toast.success('Rejected'); load(); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };

  const cols: Column<Payout>[] = [
    { key: 'artist', header: 'Artist', render: p => <span className="text-xs">{p.artist?.stageName ?? p.artistId}</span> },
    { key: 'amount', header: 'Amount', render: p => <span className="text-xs font-semibold">{fmtCurrency(p.amount, p.currency)}</span> },
    { key: 'method', header: 'Method', render: p => <span className="text-xs text-text-muted">{p.method ?? '—'}</span> },
    { key: 's', header: 'Status', render: p => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(p.status)}`}>{p.status}</span> },
    { key: 'created', header: 'Requested', render: p => <span className="text-xs text-text-muted">{fmtDate(p.createdAt)}</span> },
    { key: 'a', header: '', render: p => (
      p.status === 'pending' ? (
        <div className="flex gap-1">
          <Button size="sm" variant="success" loading={busy === p.id} onClick={() => approve(p)}>Approve</Button>
          <Button size="sm" variant="destructive" loading={busy === p.id} onClick={() => reject(p)}>Reject</Button>
        </div>
      ) : <span className="text-[10px] text-text-muted">—</span>
    )},
  ];

  return (
    <RequireRole allow={['finance_admin','music_admin','super_admin']} fallback={<div className="p-6 text-sm text-text-muted">Finance access only.</div>}>
      <PageHeader title="Payouts" subtitle="Artist payout requests." />
      <Tabs
        active={tab}
        onChange={v => { setTab(v); setPage(1); }}
        tabs={[
          { id: 'pending', label: 'Pending' },
          { id: 'paid',    label: 'Paid' },
          { id: 'rejected',label: 'Rejected' },
          { id: 'all',     label: 'All' },
        ]}
      />
      <DataTable columns={cols} data={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </RequireRole>
  );
}
