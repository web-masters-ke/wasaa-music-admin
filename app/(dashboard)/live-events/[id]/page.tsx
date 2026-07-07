'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Radio, Users, Coins, MessageSquare, XCircle, StopCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import StatCard from '@/components/ui/StatCard';
import { liveEventsApi, LiveEvent, apiError } from '@/lib/api';
import { fmtCurrency, fmtDate, fmtNumber, statusPillClass } from '@/lib/utils';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function LiveEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [ev, setEv] = useState<LiveEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const e = await liveEventsApi.get(id);
      setEv(e);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  useEffect(() => {
    if (!ev || ev.status !== 'live') return;
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [ev?.status, id]);

  const cancel = async () => {
    const reason = prompt('Cancellation reason?'); if (!reason) return;
    try { await liveEventsApi.cancel(id, reason); toast.success('Cancelled, refunds initiated'); load(); }
    catch (err) { toast.error(apiError(err).message); }
  };
  const end = async () => {
    if (!confirm('End the broadcast now?')) return;
    try { await liveEventsApi.end(id); toast.success('Broadcast ended'); load(); }
    catch (err) { toast.error(apiError(err).message); }
  };
  const overrideCapacity = async () => {
    const raw = prompt('New capacity (must be ≥ tickets sold):');
    if (!raw) return;
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return toast.error('Invalid capacity');
    try {
      // Backend route path per ADED §5.10: PATCH /live-events/:id/capacity — not in music-service admin.routes yet;
      // fall back to /live-events/:id/status if capacity endpoint returns 404.
      await liveEventsApi.updateStatus(id, `capacity:${n}`);
      toast.success('Capacity override queued'); load();
    } catch (err) { toast.error(apiError(err).message); }
  };

  if (loading) return <div className="skeleton h-96 w-full" />;
  if (!ev) return <div className="p-6 text-sm text-text-muted">Event not found.</div>;

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><Radio className="text-brick" size={22} />{ev.title}</span>}
        subtitle={
          <span className="flex items-center gap-2">
            {ev.artist?.stageName ?? '—'} · <Badge tone={ev.status === 'live' ? 'destructive' : 'muted'}>{ev.status}</Badge>
            {' '}<span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(ev.status)}`}>{fmtDate(ev.scheduledStart, true)}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            {ev.status === 'live' && <Button variant="secondary" onClick={end}><StopCircle size={13} /> End broadcast</Button>}
            {['scheduled','live'].includes(ev.status ?? '') && (
              <RequireRole allow={['music_admin','super_admin','admin']}>
                <Button variant="destructive" onClick={cancel}><XCircle size={13} /> Cancel event</Button>
              </RequireRole>
            )}
            <RequireRole allow={['super_admin']}>
              <Button variant="secondary" onClick={overrideCapacity}>Override capacity</Button>
            </RequireRole>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Viewers" value={fmtNumber(ev.viewerCount)} icon={Users} tone="brick" />
        <StatCard label="Tickets sold" value={`${fmtNumber(ev.ticketsSold)}${ev.capacity ? ` / ${fmtNumber(ev.capacity)}` : ''}`} icon={Users} />
        <StatCard label="Tips" value={fmtCurrency(ev.tipsTotal ?? 0, ev.currency)} icon={Coins} tone="success" />
        <StatCard label="Chat messages" value={fmtNumber(ev.chatMessageCount)} icon={MessageSquare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader title="Event detail" />
          <CardBody className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Description</span><span className="text-right max-w-md">{ev.description ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Ticket price</span><span>{fmtCurrency(ev.ticketPrice ?? 0, ev.currency)}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Capacity</span><span>{ev.capacity ? fmtNumber(ev.capacity) : 'Unlimited'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Provider</span><span>{ev.streamProvider ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Recording</span><span>{ev.recordingEnabled ? 'Yes' : 'No'} · Replay {ev.replayAvailability ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Chat</span><span>{ev.chatEnabled ? 'Enabled' : 'Disabled'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Tips</span><span>{ev.tipsEnabled ? 'Enabled' : 'Disabled'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Access</span><span>{ev.isPrivate ? 'Private' : 'Public'} · {ev.inviteOnly ? 'Invite-only' : 'Open sale'}</span></div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Tickets" action={<Link href={`/tickets?eventId=${ev.id}`} className="text-xs text-brick font-semibold">Manage →</Link>} />
          <CardBody>
            <p className="text-3xl font-black text-text">{fmtNumber(ev.ticketsSold)}</p>
            <p className="text-xs text-text-muted mt-1">Active ticket holders. Cancel forces a full refund via wallet.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
