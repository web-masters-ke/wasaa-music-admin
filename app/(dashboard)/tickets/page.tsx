'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import ComingSoon from '@/components/ui/ComingSoon';
import { liveEventsApi, ticketsApi, Ticket, apiError } from '@/lib/api';
import { fmtCurrency, fmtDate, statusPillClass } from '@/lib/utils';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function TicketsPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full" />}>
      <TicketsInner />
    </Suspense>
  );
}

function TicketsInner() {
  const sp = useSearchParams();
  const eventId = sp.get('eventId');
  const [items, setItems] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    (async () => {
      try {
        const res = await liveEventsApi.tickets(eventId, { limit: 50 });
        setItems(res.items);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, [eventId]);

  const refund = async (t: Ticket) => {
    setBusy(t.id);
    try { await ticketsApi.refund(t.id); toast.success('Refunded'); setItems(items.map(x => x.id === t.id ? { ...x, status: 'refunded' } : x)); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };

  if (!eventId) {
    return (
      <>
        <PageHeader title="Tickets" subtitle="Ticket ledger per live event." />
        <ComingSoon title="Pick an event" message="Tickets are scoped per live event. Open a live event and click 'Manage →' to see its ticket ledger, or wire a global GET /admin/tickets endpoint for cross-event browsing." />
      </>
    );
  }

  const cols: Column<Ticket>[] = [
    { key: 'user', header: 'User', render: t => <span className="text-xs text-text">{t.userId ?? '—'}</span> },
    { key: 'price', header: 'Price paid', render: t => <span className="text-xs">{fmtCurrency(t.pricePaid, t.currency)}</span> },
    { key: 'status', header: 'Status', render: t => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(t.status)}`}>{t.status}</span>
    )},
    { key: 'purchased', header: 'Purchased', render: t => <span className="text-xs text-text-muted">{fmtDate(t.purchasedAt, true)}</span> },
    { key: 'action', header: '', render: t => (
      <RequireRole allow={['finance_admin','music_admin','super_admin','admin']}>
        {t.status !== 'refunded' && (
          <Button size="sm" variant="destructive" loading={busy === t.id} onClick={() => refund(t)}>Refund</Button>
        )}
      </RequireRole>
    )},
  ];

  return (
    <>
      <PageHeader title="Tickets" subtitle={`Event ${eventId}`} />
      <DataTable columns={cols} data={items} loading={loading} />
    </>
  );
}
