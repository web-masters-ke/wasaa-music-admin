'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { musicAdmin, Artist, apiError } from '@/lib/api';
import { fmtNumber, statusPillClass } from '@/lib/utils';
import { TextInput } from '@/components/forms';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'all',       label: 'All' },
  { id: 'verified',  label: 'Verified' },
  { id: 'pending',   label: 'Pending verification' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'tipped',    label: 'Tipped' },
];

export default function ArtistsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Artist[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'tipped') {
        const list = await musicAdmin.tippedArtists();
        setItems(list); setTotalPages(1);
      } else {
        const params: Record<string, unknown> = { page, limit: 25, q: q || undefined };
        if (tab === 'verified')  params.verificationStatus = 'verified';
        if (tab === 'pending')   params.verificationStatus = 'pending';
        if (tab === 'suspended') params.status = 'suspended';
        const res = await musicAdmin.listArtists(params);
        setItems(res.items); setTotalPages(res.pages);
      }
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page, q, tab]);

  useEffect(() => { load(); }, [load]);

  const cols: Column<Artist>[] = [
    { key: 'artist', header: 'Artist', render: a => (
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-brick/20 border border-brick/40 flex items-center justify-center text-[11px] font-bold text-brick overflow-hidden">
          {a.profileImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={a.profileImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (a.stageName ?? '?').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-text flex items-center gap-1.5">
            {a.stageName ?? '—'}
            {a.verificationStatus === 'verified' && <Badge tone="brick">verified</Badge>}
          </p>
          <p className="text-[11px] text-text-muted">{a.legalName ?? '—'} · {a.country ?? '—'}</p>
        </div>
      </div>
    )},
    { key: 'genre',     header: 'Primary genre', render: a => <span className="text-xs text-text-muted">{a.primaryGenre ?? '—'}</span> },
    { key: 'followers', header: 'Followers', render: a => <span className="text-xs">{fmtNumber(a.followerCount)}</span> },
    { key: 'streams',   header: 'Streams',   render: a => <span className="text-xs">{fmtNumber(a.totalStreams)}</span> },
    { key: 'strikes',   header: 'Strikes',   render: a => <span className="text-xs">{a.strikeCount ?? 0}</span> },
    { key: 'status',    header: 'Status',    render: a => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(a.status ?? a.banStatus)}`}>{a.status ?? a.banStatus ?? '—'}</span> },
  ];

  return (
    <>
      <PageHeader title="Artists" subtitle="Verified artists, pending applicants, and suspended accounts." />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <TextInput placeholder="Search stage name, legal name…" value={q} onChange={e => { setPage(1); setQ(e.target.value); }} className="pl-9" />
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={v => { setTab(v); setPage(1); }} />
      <DataTable columns={cols} data={items} loading={loading} onRowClick={a => router.push(`/artists/${a.id}`)} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}
