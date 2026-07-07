'use client';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import { musicAdmin, Report, apiError } from '@/lib/api';
import { fmtDate, statusPillClass } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicAdmin.listReports({ page, limit: 25 });
      setItems(res.items); setTotalPages(res.pages);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  const resolve = async (r: Report) => {
    const resolution = prompt('Resolution note?'); if (!resolution) return;
    setBusy(r.id);
    try { await musicAdmin.resolveReport(r.id, resolution); toast.success('Resolved'); load(); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };
  const dismiss = async (r: Report) => {
    const reason = prompt('Dismissal reason?'); if (!reason) return;
    setBusy(r.id);
    try { await musicAdmin.dismissReport(r.id, reason); toast.success('Dismissed'); load(); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };

  const cols: Column<Report>[] = [
    { key: 'target', header: 'Target', render: r => <span className="text-xs">{r.targetType} · {r.targetId}</span> },
    { key: 'reason', header: 'Reason', render: r => <span className="text-xs">{r.reason ?? '—'}</span> },
    { key: 's', header: 'Status', render: r => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(r.status)}`}>{r.status}</span> },
    { key: 'created', header: 'Created', render: r => <span className="text-xs text-text-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'a', header: '', render: r => (
      <div className="flex gap-1">
        <Button size="sm" variant="success" loading={busy === r.id} onClick={() => resolve(r)}>Resolve</Button>
        <Button size="sm" variant="secondary" loading={busy === r.id} onClick={() => dismiss(r)}>Dismiss</Button>
      </div>
    )},
  ];

  return (
    <>
      <PageHeader title="Content Reports" subtitle="User-reported tracks, comments, and artists." />
      <DataTable columns={cols} data={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}
