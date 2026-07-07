'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Star, Pin } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import { musicAdmin, Playlist, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function PlaylistsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Playlist[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicAdmin.listPlaylists({ page, limit: 25 });
      setItems(res.items); setTotalPages(res.pages);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const cols: Column<Playlist>[] = [
    { key: 'title', header: 'Playlist', render: p => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border overflow-hidden shrink-0">
          {p.coverImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={p.coverImageUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">{p.title}</p>
          <p className="text-[11px] text-text-muted truncate">{p.subtitle}</p>
        </div>
      </div>
    )},
    { key: 'tracks', header: 'Tracks',   render: p => <span className="text-xs text-text">{p.tracks?.length ?? p.trackIds?.length ?? 0}</span> },
    { key: 'featured', header: '', render: p => (
      <div className="flex items-center gap-1">
        {p.featured && <Star size={13} className="text-brick" />}
        {p.pinnedToHome && <Pin size={13} className="text-brick" />}
      </div>
    )},
    { key: 'published', header: 'Published', render: p => <span className="text-xs text-text-muted">{fmtDate(p.publishedAt)}</span> },
  ];

  return (
    <>
      <PageHeader
        title="Playlists"
        subtitle="Admin-curated playlists shown across the client apps."
        actions={<Button onClick={() => router.push('/playlists/new')}><Plus size={13} /> New playlist</Button>}
      />
      <DataTable columns={cols} data={items} loading={loading} onRowClick={p => router.push(`/playlists/${p.id}`)} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}
