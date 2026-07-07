'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import { musicAdmin, Album, apiError } from '@/lib/api';
import { fmtDate, statusPillClass } from '@/lib/utils';
import { TextInput } from '@/components/forms';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AlbumsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Album[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicAdmin.listAlbums({ page, limit: 25, q: q || undefined });
      setItems(res.items); setTotalPages(res.pages);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, [page, q]);

  useEffect(() => { load(); }, [load]);

  const cols: Column<Album>[] = [
    { key: 'album', header: 'Album', render: a => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border overflow-hidden shrink-0">
          {a.coverImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={a.coverImageUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text truncate">{a.title}</p>
          <p className="text-[11px] text-text-muted truncate">{a.artist?.stageName ?? '—'}</p>
        </div>
      </div>
    )},
    { key: 'type',    header: 'Type',    render: a => <span className="text-xs text-text-muted">{a.releaseType ?? '—'}</span> },
    { key: 'genre',   header: 'Genre',   render: a => <span className="text-xs text-text-muted">{a.genre ?? '—'}</span> },
    { key: 'release', header: 'Release', render: a => <span className="text-xs text-text-muted">{fmtDate(a.releaseDate)}</span> },
    { key: 'status',  header: 'Status',  render: a => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(a.status)}`}>{a.status ?? '—'}</span> },
  ];

  return (
    <>
      <PageHeader title="Albums" subtitle="Catalog of releases across the platform." />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <TextInput placeholder="Search album, artist, UPC…" value={q} onChange={e => { setPage(1); setQ(e.target.value); }} className="pl-9" />
        </div>
      </div>
      <DataTable columns={cols} data={items} loading={loading} onRowClick={a => router.push(`/albums/${a.id}`)} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}
