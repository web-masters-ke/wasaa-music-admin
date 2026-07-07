'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { musicAdmin, VerificationRequest, apiError } from '@/lib/api';
import { fmtDate, humanRelative } from '@/lib/utils';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';
import EmptyState from '@/components/ui/EmptyState';
import { ShieldCheck } from 'lucide-react';

export default function VerificationQueuePage() {
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try { const list = await musicAdmin.pendingVerifications(); setItems(list); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const approve = async (r: VerificationRequest) => {
    if (!r.artistId && !r.artist?.id) return;
    setBusy(r.id);
    try {
      await musicAdmin.verifyArtist(r.artistId ?? r.artist?.id ?? '', r.notes);
      toast.success('Artist verified');
      setItems(items.filter(x => x.id !== r.id));
    } catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };
  const reject = async (r: VerificationRequest) => {
    const reason = prompt('Rejection reason?');
    if (!reason) return;
    setBusy(r.id);
    try {
      await musicAdmin.rejectVerification(r.artistId ?? r.artist?.id ?? '', reason);
      toast.success('Rejected');
      setItems(items.filter(x => x.id !== r.id));
    } catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(null); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin']} fallback={<div className="p-6 text-sm text-text-muted">You do not have permission to review verifications.</div>}>
      <PageHeader title="Verification Queue" subtitle="Pending verification requests." />
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-32 w-full" />)}</div>
      ) : items.length === 0 ? (
        <Card><CardBody><EmptyState icon={ShieldCheck} title="Queue clear" message="No verification requests are awaiting review." /></CardBody></Card>
      ) : (
        <div className="space-y-3">
          {items.map(r => (
            <Card key={r.id}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2">
                    {r.artist?.stageName ?? '—'} <Badge tone="warning">pending</Badge>
                  </span>
                }
                subtitle={`${r.artist?.country ?? '—'} · Submitted ${humanRelative(r.submittedAt)} (${fmtDate(r.submittedAt)})`}
                action={
                  <div className="flex gap-2">
                    <Button variant="success" size="sm" loading={busy === r.id} onClick={() => approve(r)}>Approve</Button>
                    <Button variant="destructive" size="sm" loading={busy === r.id} onClick={() => reject(r)}>Reject</Button>
                  </div>
                }
              />
              <CardBody>
                <p className="text-sm text-text-muted mb-3">{r.artist?.bio ?? 'No bio provided.'}</p>
                <div className="grid grid-cols-2 gap-3">
                  <p className="text-xs"><span className="text-text-muted">Legal name: </span>{r.artist?.legalName ?? '—'}</p>
                  <p className="text-xs"><span className="text-text-muted">Primary genre: </span>{r.artist?.primaryGenre ?? '—'}</p>
                </div>
                {r.documents && r.documents.length > 0 && (
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Documents</p>
                    <ul className="text-xs text-brick space-y-0.5">
                      {r.documents.map((d, i) => <li key={i}><a href={d} target="_blank" rel="noopener noreferrer" className="hover:underline">{d}</a></li>)}
                    </ul>
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </RequireRole>
  );
}
