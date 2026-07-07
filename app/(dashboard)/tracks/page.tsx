'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Tabs from '@/components/ui/Tabs';
import { musicAdmin, Track, apiError } from '@/lib/api';
import { fmtDate, fmtDuration, fmtNumber, statusPillClass } from '@/lib/utils';
import { TextInput, Select } from '@/components/forms';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'all',            label: 'All' },
  { id: 'pending_review', label: 'Pending' },
  { id: 'approved',       label: 'Approved' },
  { id: 'rejected',       label: 'Rejected' },
  { id: 'suspended',      label: 'Suspended' },
  { id: 'tipped',         label: 'Tipped' },
];

export default function TracksPage() {
  const router = useRouter();
  const [items, setItems] = useState<Track[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [tab, setTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'tipped') {
        const list = await musicAdmin.tippedTracks();
        setItems(list); setTotalPages(1);
      } else {
        const params: Record<string, unknown> = { page, limit: 25, q: q || undefined, genre: genre || undefined };
        if (tab !== 'all') params.status = tab;
        const res = await musicAdmin.listTracks(params);
        setItems(res.items); setTotalPages(res.pages);
      }
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, q, genre, tab]);

  useEffect(() => { load(); }, [load]);

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
    { key: 'duration', header: 'Duration', render: t => <span className="text-xs text-text-muted">{fmtDuration(t.duration)}</span> },
    { key: 'streams',  header: 'Streams',  render: t => <span className="text-xs font-semibold text-text">{fmtNumber(t.streamCount)}</span> },
    {
      key: 'status', header: 'Status',
      render: t => (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(t.status)}`}>
          {t.status ?? '—'}
        </span>
      ),
    },
    { key: 'created', header: 'Added', render: t => <span className="text-xs text-text-muted">{fmtDate(t.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Tracks" subtitle="Browse, moderate, and manage the entire catalog." />
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <TextInput
            placeholder="Search title, ISRC, artist…"
            value={q}
            onChange={e => { setPage(1); setQ(e.target.value); }}
            className="pl-9"
          />
        </div>
        <div className="w-44">
          <Select
            value={genre}
            onChange={e => { setPage(1); setGenre(e.target.value); }}
            placeholder="All genres"
            options={[
              { value: '', label: 'All genres' },
              { value: 'afrobeat', label: 'Afrobeat' },
              { value: 'hiphop', label: 'Hip-hop' },
              { value: 'gospel', label: 'Gospel' },
              { value: 'rnb', label: 'R&B' },
              { value: 'bongo', label: 'Bongo Flava' },
              { value: 'benga', label: 'Benga' },
            ]}
          />
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={v => { setTab(v); setPage(1); }} />
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        onRowClick={t => router.push(`/tracks/${t.id}`)}
      />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}
