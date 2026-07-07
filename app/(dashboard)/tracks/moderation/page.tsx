'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import { musicAdmin, Track, apiError } from '@/lib/api';
import { fmtDate, humanRelative, statusPillClass } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function ModerationQueuePage() {
  const router = useRouter();
  const [items, setItems] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicAdmin.moderationQueue({ page, limit: 25 });
      setItems(res.items); setTotalPages(res.pages);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      await musicAdmin.approveTrack(id);
      toast.success('Approved');
      setItems(items.filter(x => x.id !== id));
    } catch (err) { toast.error(apiError(err).message); }
    finally { setBusyId(null); }
  };
  const reject = async (id: string) => {
    const reason = prompt('Reason for rejection?');
    if (!reason) return;
    setBusyId(id);
    try {
      await musicAdmin.rejectTrack(id, reason);
      toast.success('Rejected');
      setItems(items.filter(x => x.id !== id));
    } catch (err) { toast.error(apiError(err).message); }
    finally { setBusyId(null); }
  };

  const columns: Column<Track>[] = [
    {
      key: 'track', header: 'Track',
      render: t => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-3 border border-border overflow-hidden shrink-0">
            {t.coverImageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={t.coverImageUrl} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text truncate">{t.title}</p>
            <p className="text-[11px] text-text-muted truncate">{t.artist?.stageName ?? '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'genre',    header: 'Genre',    render: t => <span className="text-xs text-text-muted">{t.genre ?? '—'}</span> },
    { key: 'explicit', header: 'Explicit', render: t => t.explicit ? <span className="text-xs text-destructive font-semibold">EXPLICIT</span> : <span className="text-xs text-text-muted">—</span> },
    { key: 'status', header: 'Status', render: t => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(t.status)}`}>{t.status}</span>
    )},
    { key: 'submitted', header: 'Submitted', render: t => <span className="text-xs text-text-muted">{humanRelative(t.createdAt)}</span> },
    {
      key: 'actions', header: 'Actions',
      render: t => (
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="success" loading={busyId === t.id} onClick={(e) => { e.stopPropagation(); approve(t.id); }}>Approve</Button>
          <Button size="sm" variant="destructive" loading={busyId === t.id} onClick={(e) => { e.stopPropagation(); reject(t.id); }}>Reject</Button>
        </div>
      ),
    },
  ];

  return (
    <RequireRole allow={['music_admin','super_admin','admin','content_moderator']} fallback={<div className="p-6 text-sm text-text-muted">You do not have permission to view the moderation queue.</div>}>
      <PageHeader title="Moderation Queue" subtitle="Tracks awaiting review." />
      <DataTable columns={columns} data={items} loading={loading} onRowClick={t => router.push(`/tracks/${t.id}`)} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      <p className="text-[11px] text-text-muted mt-3">Approve transitions the track to <span className="text-success font-semibold">approved</span>; Reject records a rejection reason and closes review. Suspended tracks can be re-appealed by the artist.</p>
    </RequireRole>
  );
}
