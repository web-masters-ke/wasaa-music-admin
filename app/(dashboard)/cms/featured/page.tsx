'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import { musicAdmin, Playlist, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';

export default function FeaturedPage() {
  const router = useRouter();
  const [items, setItems] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await musicAdmin.listPlaylists({ featured: true, limit: 50 });
        setItems(res.items);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const cols: Column<Playlist>[] = [
    { key: 'title', header: 'Playlist', render: p => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-surface-3 border border-border overflow-hidden">
          {p.coverImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={p.coverImageUrl} alt="" className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold">{p.title}</p>
          <p className="text-[11px] text-text-muted">{p.tracks?.length ?? 0} tracks</p>
        </div>
      </div>
    )},
    { key: 'pin', header: '', render: p => p.pinnedToHome ? <Badge tone="brick">pinned</Badge> : null },
    { key: 'published', header: 'Published', render: p => <span className="text-xs text-text-muted">{fmtDate(p.publishedAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Featured Playlists" subtitle="Playlists boosted on the home surface. Drag-reorder coming next." />
      <DataTable columns={cols} data={items} loading={loading} onRowClick={p => router.push(`/playlists/${p.id}`)} />
    </>
  );
}
