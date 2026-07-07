'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { musicAdmin, UserRow, StreamEvent, SubscriptionRow, apiError } from '@/lib/api';
import { fmtDate, fmtDuration, humanRelative } from '@/lib/utils';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import { Ban, Undo2 } from 'lucide-react';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserRow | null>(null);
  const [streams, setStreams] = useState<StreamEvent[]>([]);
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [u, s, sub] = await Promise.all([
          musicAdmin.getUserProfile(id),
          musicAdmin.getUserStreamHistory(id, { limit: 20 }).then(r => r.items).catch(() => [] as StreamEvent[]),
          musicAdmin.getUserSubscriptions(id).catch(() => [] as SubscriptionRow[]),
        ]);
        setUser(u); setStreams(s); setSubs(sub);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const ban = async () => {
    const reason = prompt('Ban reason?'); if (!reason) return;
    try { await musicAdmin.banUser(id, reason); toast.success('User banned'); setUser(u => u ? { ...u, banStatus: 'banned' } : u); }
    catch (err) { toast.error(apiError(err).message); }
  };
  const unban = async () => {
    try { await musicAdmin.unbanUser(id); toast.success('User un-banned'); setUser(u => u ? { ...u, banStatus: 'active' } : u); }
    catch (err) { toast.error(apiError(err).message); }
  };

  if (loading) return <div className="skeleton h-96 w-full" />;
  if (!user) return <div className="p-6 text-sm text-text-muted">User not found.</div>;

  return (
    <>
      <PageHeader
        title={user.displayName ?? user.email ?? user.phoneNumber ?? 'User'}
        subtitle={<span>{user.country ?? '—'} · Joined {fmtDate(user.createdAt)}</span>}
        actions={
          <RequireRole allow={['music_admin','super_admin','admin']}>
            {user.banStatus === 'banned' ? (
              <Button variant="success" onClick={unban}><Undo2 size={13} /> Un-ban</Button>
            ) : (
              <Button variant="destructive" onClick={ban}><Ban size={13} /> Ban</Button>
            )}
          </RequireRole>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader title="Profile" />
          <CardBody className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-text-muted">Email</span><span className="text-text">{user.email ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Phone</span><span className="text-text">{user.phoneNumber ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-text-muted">Country</span><span className="text-text">{user.country ?? '—'}</span></div>
            <div className="flex justify-between items-center"><span className="text-text-muted">Tier</span><Badge tone={user.subscriptionTier === 'premium' ? 'brick' : 'muted'}>{user.subscriptionTier ?? 'free'}</Badge></div>
            <div className="flex justify-between"><span className="text-text-muted">Last login</span><span className="text-text">{user.lastLoginAt ? humanRelative(user.lastLoginAt) : '—'}</span></div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Subscriptions" />
          <CardBody>
            {subs.length === 0 ? <p className="text-sm text-text-muted">No subscription history.</p> : (
              <ul className="space-y-2">
                {subs.map(s => (
                  <li key={s.id} className="border border-border rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold">{s.plan?.name ?? '—'}</span>
                      <Badge tone={s.status === 'active' ? 'success' : 'muted'}>{s.status}</Badge>
                    </div>
                    <p className="text-[11px] text-text-muted mt-1">Renews {fmtDate(s.renewsAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Recent streams" />
          <CardBody>
            {streams.length === 0 ? <p className="text-sm text-text-muted">No stream history.</p> : (
              <ul className="space-y-2">
                {streams.slice(0, 8).map(s => (
                  <li key={s.id} className="flex items-center gap-2 text-xs">
                    <span className="text-text-muted flex-1 truncate">{s.track?.title ?? s.trackId}</span>
                    <span className="text-text-muted">{fmtDuration((s.durationMs ?? 0) / 1000)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
