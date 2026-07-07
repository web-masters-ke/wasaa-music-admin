'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { musicAdmin, Artist, Strike, apiError } from '@/lib/api';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  FormSection, FormGrid, FormRow, FormFooter, TextInput, TextArea, Select,
  ChipInput, MultiSelect, RichTextEditor, FileUpload, MultiFileUpload,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { UserCheck, ShieldOff, Plus, Trash2 } from 'lucide-react';
import { fmtDate } from '@/lib/utils';

const SOCIAL_NETWORKS = ['instagram','tiktok','spotify','apple_music','youtube','twitter','facebook','soundcloud'];

export default function ArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [strikes, setStrikes] = useState<Strike[]>([]);
  const [f, setF] = useState<Partial<Artist>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const upd = <K extends keyof Artist>(k: K, v: Artist[K]) => { setF(p => ({ ...p, [k]: v })); setDirty(true); };

  useEffect(() => {
    (async () => {
      try {
        const [a, s] = await Promise.all([
          musicAdmin.getArtist(id),
          musicAdmin.artistStrikes(id).catch(() => [] as Strike[]),
        ]);
        setArtist(a); setF(a); setStrikes(s);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      if (f.status && f.status !== artist?.status) {
        await musicAdmin.updateArtistStatus(id, f.status);
      }
      toast.success('Artist updated'); setDirty(false);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setSaving(false); }
  };

  const verify = async () => { try { await musicAdmin.verifyArtist(id); toast.success('Verified'); router.refresh(); } catch (err) { toast.error(apiError(err).message); } };
  const suspend = async () => {
    const reason = prompt('Suspension reason?'); if (!reason) return;
    try { await musicAdmin.updateArtistStatus(id, 'suspended', reason); toast.success('Suspended'); router.refresh(); }
    catch (err) { toast.error(apiError(err).message); }
  };
  const addStrike = async () => {
    const reason = prompt('Strike reason?'); if (!reason) return;
    try {
      const s = await musicAdmin.issueStrike(id, { reason, severity: 'medium' });
      setStrikes([s, ...strikes]);
      toast.success('Strike issued');
    } catch (err) { toast.error(apiError(err).message); }
  };
  const revokeStrike = async (strikeId: string) => {
    try { await musicAdmin.revokeStrike(id, strikeId); setStrikes(strikes.filter(s => s.id !== strikeId)); toast.success('Revoked'); }
    catch (err) { toast.error(apiError(err).message); }
  };

  if (loading) return <div className="skeleton h-96 w-full" />;
  if (!artist) return <div className="p-6 text-sm text-text-muted">Artist not found.</div>;

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            {artist.stageName ?? '—'}
            {artist.verificationStatus === 'verified' && <Badge tone="brick">verified</Badge>}
            {artist.banStatus === 'banned' && <Badge tone="destructive">banned</Badge>}
          </span>
        }
        subtitle={`${artist.legalName ?? '—'} · ${artist.country ?? '—'}`}
        actions={
          <div className="flex gap-2">
            {artist.verificationStatus !== 'verified' && (
              <Button variant="success" onClick={verify}><UserCheck size={13} /> Verify</Button>
            )}
            <Button variant="destructive" onClick={suspend}><ShieldOff size={13} /> Suspend</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-32">
        <div className="lg:col-span-2 space-y-4">
          <FormSection title="Identity">
            <FormGrid cols={2}>
              <FormRow label="Stage name" required><TextInput value={f.stageName ?? ''} onChange={e => upd('stageName', e.target.value)} /></FormRow>
              <FormRow label="Legal name"><TextInput value={f.legalName ?? ''} onChange={e => upd('legalName', e.target.value)} /></FormRow>
              <FormRow label="Country"><TextInput value={f.country ?? ''} onChange={e => upd('country', e.target.value)} /></FormRow>
              <FormRow label="City"><TextInput value={f.city ?? ''} onChange={e => upd('city', e.target.value)} /></FormRow>
              <FormRow label="Primary genre"><TextInput value={f.primaryGenre ?? ''} onChange={e => upd('primaryGenre', e.target.value)} /></FormRow>
              <FormRow label="Secondary genres"><ChipInput value={(f.secondaryGenres as string[]) ?? []} onChange={v => upd('secondaryGenres', v)} /></FormRow>
              <FormRow label="Languages"><ChipInput value={(f.languages as string[]) ?? []} onChange={v => upd('languages', v)} /></FormRow>
              <FormRow label="Label ID"><TextInput value={f.labelId ?? ''} onChange={e => upd('labelId', e.target.value)} /></FormRow>
            </FormGrid>
            <FormRow label="Bio"><RichTextEditor value={f.bio ?? ''} onChange={v => upd('bio', v)} /></FormRow>
          </FormSection>

          <FormSection title="Media">
            <FormGrid cols={2}>
              <FormRow label="Profile image"><FileUpload value={f.profileImageUrl ?? null} onChange={() => setDirty(true)} /></FormRow>
              <FormRow label="Cover image"><FileUpload value={f.coverImageUrl ?? null} onChange={() => setDirty(true)} /></FormRow>
            </FormGrid>
            <FormRow label="Gallery">
              <MultiFileUpload value={(f.gallery as string[]) ?? []} onChange={v => upd('gallery', v as string[])} />
            </FormRow>
          </FormSection>

          <FormSection title="Social & links">
            {SOCIAL_NETWORKS.map(net => (
              <FormRow key={net} label={net.replace(/_/g, ' ')}>
                <TextInput
                  value={(f.socialLinks as Record<string, string> | undefined)?.[net] ?? ''}
                  onChange={e => upd('socialLinks', {
                    ...(f.socialLinks as Record<string, string> ?? {}),
                    [net]: e.target.value,
                  })}
                  placeholder={`https://${net.replace(/_/g,'.')}.com/...`}
                />
              </FormRow>
            ))}
          </FormSection>

          <FormSection title="Payout & tax">
            <FormGrid cols={2}>
              <FormRow label="Payout method">
                <Select value={f.payoutMethod ?? ''} onChange={e => upd('payoutMethod', e.target.value)}
                  options={['mpesa','bank_transfer','paypal','stripe','manual'].map(v => ({ value: v, label: v }))} placeholder="Select" />
              </FormRow>
              <FormRow label="Tax ID"><TextInput value={f.taxId ?? ''} onChange={e => upd('taxId', e.target.value)} /></FormRow>
              <FormRow label="KYC status">
                <Select value={f.kycStatus ?? ''} onChange={e => upd('kycStatus', e.target.value)}
                  options={['unverified','pending','verified','rejected'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Verification status">
                <Select value={f.verificationStatus ?? ''} onChange={e => upd('verificationStatus', e.target.value as Artist['verificationStatus'])}
                  options={['unverified','pending','verified','rejected'].map(v => ({ value: v, label: v }))} />
              </FormRow>
            </FormGrid>
            <FormRow label="Verification notes"><TextArea value={f.verificationNotes ?? ''} onChange={e => upd('verificationNotes', e.target.value)} /></FormRow>
          </FormSection>
        </div>

        <div className="space-y-4">
          <FormSection title="Status">
            <FormRow label="Status">
              <Select value={f.status ?? ''} onChange={e => upd('status', e.target.value)}
                options={['active','pending','suspended','banned'].map(v => ({ value: v, label: v }))} />
            </FormRow>
            <FormRow label="Internal notes"><TextArea rows={4} value={(f as { notes?: string }).notes ?? ''} onChange={e => setF(p => ({ ...p, notes: e.target.value } as never))} /></FormRow>
          </FormSection>

          <FormSection title={`Strikes (${strikes.length})`}>
            <RequireRole allow={['music_admin','super_admin','admin','compliance_officer']}>
              <Button size="sm" variant="secondary" onClick={addStrike}><Plus size={12} /> Issue strike</Button>
            </RequireRole>
            <div className="space-y-2 mt-3">
              {strikes.length === 0 && <p className="text-xs text-text-muted">No strikes on record.</p>}
              {strikes.map(s => (
                <div key={s.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-text">{s.reason}</p>
                    <RequireRole allow={['super_admin']}>
                      <button onClick={() => revokeStrike(s.id)} className="text-destructive" aria-label="Revoke strike">
                        <Trash2 size={12} />
                      </button>
                    </RequireRole>
                  </div>
                  <p className="text-[10px] text-text-muted mt-1">Issued {fmtDate(s.issuedAt, true)} · Severity {s.severity ?? 'medium'}</p>
                </div>
              ))}
            </div>
          </FormSection>
        </div>
      </div>

      <FormFooter
        onCancel={() => { if (!dirty || confirm('Discard changes?')) router.back(); }}
        onSubmit={save}
        submitLabel="Save changes"
        busy={saving}
        dirty={dirty}
      />
    </>
  );
}
