'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import { liveEventsApi, LiveEvent, apiError } from '@/lib/api';
import { fmtDate, fmtNumber } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Tv2 } from 'lucide-react';

export default function ScheduledEventsPage() {
  const router = useRouter();
  const [items, setItems] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await liveEventsApi.list({ status: 'scheduled', limit: 50 });
        setItems(res.items);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const cols: Column<LiveEvent>[] = [
    { key: 'title', header: 'Event', render: e => (
      <div>
        <p className="text-sm font-semibold text-text">{e.title}</p>
        <p className="text-[11px] text-text-muted">{e.artist?.stageName ?? '—'}</p>
      </div>
    )},
    { key: 'start', header: 'Start', render: e => <span className="text-xs">{fmtDate(e.scheduledStart, true)}</span> },
    { key: 'sold', header: 'Sold', render: e => <span className="text-xs">{fmtNumber(e.ticketsSold)} / {e.capacity ?? '∞'}</span> },
    { key: 'private', header: 'Type', render: e => <span className="text-xs text-text-muted">{e.isPrivate ? 'Private' : 'Public'}</span> },
  ];

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><Tv2 size={22} className="text-brick" /> Scheduled Events</span>}
        subtitle="Upcoming live broadcasts."
      />
      <DataTable columns={cols} data={items} loading={loading} onRowClick={e => router.push(`/live-events/${e.id}`)} />
    </>
  );
}
