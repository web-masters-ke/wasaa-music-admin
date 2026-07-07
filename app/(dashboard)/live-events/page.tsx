'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { liveEventsApi, LiveEvent, apiError } from '@/lib/api';
import { fmtDate, fmtNumber, fmtCurrency, statusPillClass } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Radio } from 'lucide-react';

const TABS = [
  { id: 'live',      label: 'LIVE' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'ended',     label: 'Ended' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function LiveEventsPage() {
  const router = useRouter();
  const [items, setItems] = useState<LiveEvent[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState('live');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await liveEventsApi.list({ page, limit: 25, status: tab });
      setItems(res.items); setTotalPages(res.pages);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page, tab]);

  useEffect(() => { load(); }, [load]);

  // Poll every 15s while on LIVE tab
  useEffect(() => {
    if (tab !== 'live') return;
    const id = setInterval(() => { load(); }, 15_000);
    return () => clearInterval(id);
  }, [tab, load]);

  const cols: Column<LiveEvent>[] = [
    { key: 'event', header: 'Event', render: e => (
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface-3 border border-border overflow-hidden shrink-0 relative">
          {e.coverImageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={e.coverImageUrl} alt="" className="w-full h-full object-cover" />
          )}
          {e.status === 'live' && (
            <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-text">{e.title}</p>
          <p className="text-[11px] text-text-muted">{e.artist?.stageName ?? '—'}</p>
        </div>
      </div>
    )},
    { key: 'schedule', header: 'Scheduled', render: e => <span className="text-xs text-text-muted">{fmtDate(e.scheduledStart, true)}</span> },
    { key: 'sold', header: 'Tickets sold', render: e => <span className="text-xs">{fmtNumber(e.ticketsSold)}{e.capacity ? ` / ${fmtNumber(e.capacity)}` : ''}</span> },
    { key: 'revenue', header: 'Revenue', render: e => <span className="text-xs">{fmtCurrency(e.totalRevenue ?? 0, e.currency)}</span> },
    { key: 'viewers', header: 'Viewers', render: e => (
      <span className="text-xs">
        {e.status === 'live' ? <span className="text-destructive font-bold">{fmtNumber(e.viewerCount)}</span> : <span className="text-text-muted">—</span>}
      </span>
    )},
    { key: 'status', header: 'Status', render: e => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(e.status)}`}>{e.status}</span> },
  ];

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><Radio size={22} className="text-brick" /> Live Events</span>}
        subtitle="Concerts and broadcasts across all lifecycle states."
      />
      <Tabs tabs={TABS} active={tab} onChange={v => { setTab(v); setPage(1); }} />
      {tab === 'live' && <p className="text-[11px] text-text-muted mb-3">Polling every 15 seconds. Viewer counts update live.</p>}
      <DataTable columns={cols} data={items} loading={loading} onRowClick={e => router.push(`/live-events/${e.id}`)} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}
