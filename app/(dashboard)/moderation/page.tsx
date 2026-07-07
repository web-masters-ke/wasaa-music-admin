'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import { musicAdmin, Track, apiError } from '@/lib/api';
import { humanRelative, statusPillClass } from '@/lib/utils';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { RequireRole } from '@/lib/auth';

export default function ModerationPage() {
  const router = useRouter();
  const [items, setItems] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicAdmin.moderationQueue({ page, limit: 25 });
      setItems(res.items); setTotalPages(res.pages);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    try { await musicAdmin.approveTrack(id); toast.success('Approved'); setItems(items.filter(x => x.id !== id)); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };
  const reject = async (id: string) => {
    const reason = prompt('Reason?'); if (!reason) return;
    setBusy(id);
    try { await musicAdmin.rejectTrack(id, reason); toast.success('Rejected'); setItems(items.filter(x => x.id !== id)); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };

  const cols: Column<Track>[] = [
    { key: 't', header: 'Item', render: t => (
      <div>
        <p className="text-sm font-semibold text-text">{t.title}</p>
        <p className="text-[11px] text-text-muted">{t.artist?.stageName ?? '—'}</p>
      </div>
    )},
    { key: 's', header: 'Status', render: t => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(t.status)}`}>{t.status}</span> },
    { key: 'submitted', header: 'Submitted', render: t => <span className="text-xs text-text-muted">{humanRelative(t.createdAt)}</span> },
    { key: 'a', header: 'Actions', render: t => (
      <div className="flex gap-1">
        <Button size="sm" variant="success" loading={busy === t.id} onClick={e => { e.stopPropagation(); approve(t.id); }}>Approve</Button>
        <Button size="sm" variant="destructive" loading={busy === t.id} onClick={e => { e.stopPropagation(); reject(t.id); }}>Reject</Button>
      </div>
    )},
  ];

  return (
    <RequireRole allow={['music_admin','super_admin','admin','content_moderator']} fallback={<div className="p-6 text-sm text-text-muted">Access denied.</div>}>
      <PageHeader title="Moderation Queue" subtitle="Unified queue of tracks, albums, comments, and live-event messages." />
      <DataTable columns={cols} data={items} loading={loading} onRowClick={t => router.push(`/tracks/${t.id}`)} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <p className="text-[11px] text-text-muted mt-3">Unified moderation across content types is scaffolded but currently sources from /admin/moderation/queue (tracks only). Comments and live messages join as their queue endpoints ship.</p>
    </RequireRole>
  );
}
