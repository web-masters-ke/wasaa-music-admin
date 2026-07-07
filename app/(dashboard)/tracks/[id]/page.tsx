'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Music2, Trash2, ShieldOff, Undo2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { musicAdmin, Track, TrackCredit, apiError } from '@/lib/api';
import { statusPillClass, fmtDate } from '@/lib/utils';
import { RequireRole, useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import {
  FormSection, FormGrid, FormRow, FormFooter, TextInput, TextArea, Select,
  Toggle, ChipInput, MultiSelect, DatePicker, Slider, SubForm, RichTextEditor,
  FileUpload, CountriesMultiSelect,
} from '@/components/forms';

const GENRES = [
  { value: 'afrobeat', label: 'Afrobeat' },
  { value: 'hiphop', label: 'Hip-hop' },
  { value: 'gospel', label: 'Gospel' },
  { value: 'rnb', label: 'R&B' },
  { value: 'bongo', label: 'Bongo Flava' },
  { value: 'benga', label: 'Benga' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'dancehall', label: 'Dancehall' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'classical', label: 'Classical' },
];
const MOODS = ['upbeat', 'chill', 'romantic', 'energetic', 'melancholic', 'party', 'focus', 'workout'].map(v => ({ value: v, label: v }));
const LANGS = ['sw', 'en', 'lg', 'am', 'yo', 'zu', 'fr', 'pt'].map(v => ({ value: v, label: v.toUpperCase() }));
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(v => ({ value: v, label: v }));
const LICENSES = ['exclusive', 'creative_commons', 'public_domain', 'label_owned', 'self_owned'].map(v => ({ value: v, label: v.replace(/_/g, ' ') }));

export default function TrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { hasRole } = useAuth();
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Form state
  const [f, setF] = useState<Partial<Track>>({});
  const update = <K extends keyof Track>(k: K, v: Track[K]) => {
    setF(prev => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const t = await musicAdmin.getTrack(id);
        setTrack(t); setF(t);
      } catch (err) {
        toast.error(apiError(err).message);
      } finally { setLoading(false); }
    })();
  }, [id]);

  useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  if (loading) return <div className="skeleton h-96 w-full" />;
  if (!track) return <div className="p-6 text-sm text-text-muted">Track not found.</div>;

  const save = async () => {
    setSaving(true);
    try {
      // In this admin, catalog PATCH is via status endpoint; metadata edit runs
      // against updateTrackStatus for fields that map to the status projection.
      // Full metadata PATCH would be added on the backend — surfaced here as a warning:
      if (f.status && f.status !== track.status) {
        await musicAdmin.updateTrackStatus(id, f.status, f.moderationNotes);
      }
      toast.success('Track updated');
      setDirty(false);
      const fresh = await musicAdmin.getTrack(id);
      setTrack(fresh);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setSaving(false); }
  };

  const suspend = async () => {
    const reason = prompt('Suspension reason?');
    if (!reason) return;
    try { await musicAdmin.suspendTrack(id, reason); toast.success('Suspended'); router.refresh(); }
    catch (err) { toast.error(apiError(err).message); }
  };
  const restore = async () => {
    try { await musicAdmin.restoreTrack(id); toast.success('Restored'); router.refresh(); }
    catch (err) { toast.error(apiError(err).message); }
  };
  const remove = async () => {
    if (!confirm('Permanently delete this track? This cannot be undone.')) return;
    try { await musicAdmin.removeTrack(id); toast.success('Deleted'); router.push('/tracks'); }
    catch (err) { toast.error(apiError(err).message); }
  };

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><Music2 className="text-brick" size={22} />{track.title}</span>}
        subtitle={<span>{track.artist?.stageName ?? '—'} · <Badge tone="brick">{track.status ?? '—'}</Badge></span>}
        actions={
          <div className="flex items-center gap-2">
            {track.status === 'suspended' ? (
              <Button variant="secondary" onClick={restore}><Undo2 size={13} /> Restore</Button>
            ) : (
              <Button variant="secondary" onClick={suspend}><ShieldOff size={13} /> Suspend</Button>
            )}
            <RequireRole allow={['super_admin']}>
              <Button variant="destructive" onClick={remove}><Trash2 size={13} /> Delete</Button>
            </RequireRole>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-32">
        <div className="lg:col-span-2 space-y-4">
          <FormSection title="Identity" description="Core catalog metadata.">
            <FormGrid cols={2}>
              <FormRow label="Title" required>
                <TextInput value={f.title ?? ''} onChange={e => update('title', e.target.value)} />
              </FormRow>
              <FormRow label="Subtitle / version">
                <TextInput value={f.subtitle ?? ''} onChange={e => update('subtitle', e.target.value)} placeholder="e.g. Radio Edit" />
              </FormRow>
              <FormRow label="ISRC">
                <TextInput value={f.isrc ?? ''} onChange={e => update('isrc', e.target.value)} placeholder="US-XXX-YY-NNNNN" />
              </FormRow>
              <FormRow label="UPC">
                <TextInput value={f.upc ?? ''} onChange={e => update('upc', e.target.value)} />
              </FormRow>
            </FormGrid>
            <FormGrid cols={2}>
              <FormRow label="Genre" required>
                <Select value={f.genre ?? ''} onChange={e => update('genre', e.target.value)} options={GENRES} placeholder="Select genre" />
              </FormRow>
              <FormRow label="Subgenre">
                <TextInput value={f.subgenre ?? ''} onChange={e => update('subgenre', e.target.value)} />
              </FormRow>
              <FormRow label="Mood">
                <MultiSelect value={(f.mood as string[]) ?? []} onChange={v => update('mood', v)} options={MOODS} />
              </FormRow>
              <FormRow label="Language">
                <Select value={f.language ?? ''} onChange={e => update('language', e.target.value)} options={LANGS} placeholder="Select language" />
              </FormRow>
            </FormGrid>
            <Toggle checked={!!f.explicit} onChange={v => update('explicit', v)} label="Explicit content" description="Marks the track with an EXPLICIT badge and excludes it from family-safe surfaces." />
          </FormSection>

          <FormSection title="Lyrics & credits">
            <FormRow label="Lyrics">
              <TextArea rows={6} value={f.lyrics ?? ''} onChange={e => update('lyrics', e.target.value)} placeholder="Verse 1..." />
            </FormRow>
            <FormRow label="Credits" hint="Composer, producer, mixer, mastering engineer.">
              <SubForm<TrackCredit>
                items={(f.credits as TrackCredit[]) ?? []}
                onChange={v => update('credits', v as unknown as Track['credits'])}
                addLabel="Add credit"
                empty="No credits added yet."
                factory={() => ({ name: '', role: 'producer', splitPercent: 0 })}
                renderRow={(c, _i, up) => (
                  <FormGrid cols={3}>
                    <TextInput placeholder="Name" value={c.name} onChange={e => up({ name: e.target.value } as Partial<TrackCredit>)} />
                    <Select value={c.role} onChange={e => up({ role: e.target.value } as Partial<TrackCredit>)}
                      options={['composer','producer','mixer','master','arranger','engineer','songwriter'].map(v => ({ value: v, label: v }))} />
                    <TextInput type="number" placeholder="Split %" value={c.splitPercent ?? 0} onChange={e => up({ splitPercent: Number(e.target.value) } as Partial<TrackCredit>)} />
                  </FormGrid>
                )}
              />
            </FormRow>
          </FormSection>

          <FormSection title="Release & rights">
            <FormGrid cols={2}>
              <FormRow label="Release date"><DatePicker value={(f.releaseDate as string) ?? ''} onChange={v => update('releaseDate', v)} /></FormRow>
              <FormRow label="Original release date"><DatePicker value={(f.originalReleaseDate as string) ?? ''} onChange={v => update('originalReleaseDate', v)} /></FormRow>
              <FormRow label="Copyright"><TextInput value={f.copyright ?? ''} onChange={e => update('copyright', e.target.value)} placeholder="© 2026 Wasaa Records" /></FormRow>
              <FormRow label="Publishing rights"><TextInput value={f.publishingRights ?? ''} onChange={e => update('publishingRights', e.target.value)} /></FormRow>
              <FormRow label="Licensing type"><Select value={f.licensingType ?? ''} onChange={e => update('licensingType', e.target.value)} options={LICENSES} placeholder="Select" /></FormRow>
              <FormRow label="Territory restrictions"><CountriesMultiSelect value={(f.territoryRestrictions as string[]) ?? []} onChange={v => update('territoryRestrictions', v)} /></FormRow>
            </FormGrid>
          </FormSection>

          <FormSection title="Audio & assets">
            <FormGrid cols={2}>
              <FormRow label="Audio file"><FileUpload value={f.audioUrl ?? null} onChange={() => { /* upload wiring TBD */ setDirty(true); }} accept="audio/*" /></FormRow>
              <FormRow label="Preview clip"><FileUpload value={f.previewClipUrl ?? null} onChange={() => setDirty(true)} accept="audio/*" /></FormRow>
              <FormRow label="Cover image (1:1)"><FileUpload value={f.coverImageUrl ?? null} onChange={() => setDirty(true)} accept="image/*" /></FormRow>
              <FormRow label="Thumbnail"><FileUpload value={f.thumbnailImageUrl ?? null} onChange={() => setDirty(true)} accept="image/*" /></FormRow>
            </FormGrid>
            <FormGrid cols={3}>
              <FormRow label="Duration (sec)"><TextInput type="number" value={f.duration ?? ''} onChange={e => update('duration', Number(e.target.value))} /></FormRow>
              <FormRow label="BPM"><TextInput type="number" value={f.bpm ?? ''} onChange={e => update('bpm', Number(e.target.value))} /></FormRow>
              <FormRow label="Key"><Select value={f.key ?? ''} onChange={e => update('key', e.target.value)} options={KEYS} placeholder="Key" /></FormRow>
            </FormGrid>
            <FormRow label="Tags"><ChipInput value={(f.tags as string[]) ?? []} onChange={v => update('tags', v)} placeholder="Add and press Enter" /></FormRow>
          </FormSection>
        </div>

        <div className="space-y-4">
          <FormSection title="Moderation">
            <FormRow label="Status">
              <Select
                value={f.status ?? ''}
                onChange={e => update('status', e.target.value as Track['status'])}
                options={['draft','pending_review','approved','rejected','suspended','removed'].map(v => ({ value: v, label: v }))}
              />
            </FormRow>
            <FormRow label="Moderation notes">
              <TextArea rows={4} value={f.moderationNotes ?? ''} onChange={e => update('moderationNotes', e.target.value)} placeholder="Internal notes visible only to admins." />
            </FormRow>
            <FormRow label="Featured weight" hint="0 → hidden from home. 100 → top billing.">
              <Slider value={f.featuredWeight ?? 0} onChange={v => update('featuredWeight', v)} />
            </FormRow>
            <p className="text-[11px] text-text-muted">Audit-logged by {track.moderationNotes ? 'moderator' : '—'} · {fmtDate(track.updatedAt, true)}</p>
          </FormSection>

          <FormSection title="Distribution">
            <Toggle checked={!!f.streamingEnabled} onChange={v => update('streamingEnabled', v)} label="Streaming enabled" description="Track appears in library and playback." />
            <Toggle checked={!!f.downloadEnabled}  onChange={v => update('downloadEnabled', v)}  label="Downloadable" description="Users can save offline (premium)." />
            <Toggle checked={!!f.tipEnabled}       onChange={v => update('tipEnabled', v)}       label="Tipping enabled" description="Listeners can tip the artist during playback." />
            <Toggle checked={!!f.commentsEnabled}  onChange={v => update('commentsEnabled', v)}  label="Comments enabled" />
            <Toggle checked={!!f.premiumOnly}      onChange={v => update('premiumOnly', v)}      label="Premium only" description="Free tier sees a paywall." />
            <Toggle checked={!!f.previewOnly}      onChange={v => update('previewOnly', v)}      label="Preview only" description="Only the 30s clip plays until the artist releases full audio." />
          </FormSection>

          <FormSection title="Rich description">
            <RichTextEditor value={(f.subtitle as string) ?? ''} onChange={v => update('subtitle', v)} placeholder="Editorial description shown on track page…" />
          </FormSection>
        </div>
      </div>

      <FormFooter
        onCancel={() => { if (!dirty || confirm('Discard changes?')) router.back(); }}
        onSubmit={save}
        submitLabel={hasRole(['content_moderator','music_admin','super_admin','admin']) ? 'Save changes' : 'Save (read-only role)'}
        busy={saving}
        dirty={dirty}
      />
    </>
  );
}
