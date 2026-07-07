'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { musicAdmin, Playlist, apiError } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FormSection, FormGrid, FormRow, FormFooter, TextInput, TextArea,
  ChipInput, MultiSelect, DateTimePicker, RichTextEditor, FileUpload,
  Toggle, CountriesMultiSelect,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { ListMusic } from 'lucide-react';

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const [f, setF] = useState<Partial<Playlist>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [dirty, setDirty] = useState(false);
  const upd = <K extends keyof Playlist>(k: K, v: Playlist[K]) => { setF(p => ({ ...p, [k]: v })); setDirty(true); };

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try {
        const p = await musicAdmin.getPlaylist(id);
        setF(p);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, [id, isNew]);

  const save = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const p = await musicAdmin.createPlaylist(f);
        toast.success('Playlist created');
        router.replace(`/playlists/${p.id}`);
      } else {
        await musicAdmin.updatePlaylist(id, f);
        toast.success('Playlist updated');
      }
      setDirty(false);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="skeleton h-96 w-full" />;

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><ListMusic size={22} className="text-brick" /> {isNew ? 'New playlist' : (f.title ?? 'Playlist')}</span>}
        subtitle={isNew ? 'Curate a fresh playlist for the discovery surface.' : 'Edit playlist metadata and track order.'}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-32">
        <div className="lg:col-span-2 space-y-4">
          <FormSection title="Identity">
            <FormRow label="Title" required><TextInput value={f.title ?? ''} onChange={e => upd('title', e.target.value)} /></FormRow>
            <FormRow label="Subtitle"><TextInput value={f.subtitle ?? ''} onChange={e => upd('subtitle', e.target.value)} /></FormRow>
            <FormRow label="Description"><RichTextEditor value={f.description ?? ''} onChange={v => upd('description', v)} /></FormRow>
            <FormRow label="Curator notes" hint="Internal only"><TextArea rows={3} value={f.curatorNotes ?? ''} onChange={e => upd('curatorNotes', e.target.value)} /></FormRow>
          </FormSection>

          <FormSection title="Artwork">
            <FormGrid cols={2}>
              <FormRow label="Cover"><FileUpload value={f.coverImageUrl ?? null} onChange={() => setDirty(true)} /></FormRow>
              <FormRow label="Backdrop"><FileUpload value={f.backdropImageUrl ?? null} onChange={() => setDirty(true)} /></FormRow>
            </FormGrid>
          </FormSection>

          <FormSection title="Tracks">
            <FormRow label="Track IDs" hint="Drag ordering supported via UI in next iteration">
              <ChipInput value={(f.trackIds as string[]) ?? []} onChange={v => upd('trackIds', v)} placeholder="Paste track UUID" />
            </FormRow>
          </FormSection>
        </div>

        <div className="space-y-4">
          <FormSection title="Editorial">
            <Toggle checked={!!f.featured}     onChange={v => upd('featured', v)}     label="Featured on discovery" />
            <Toggle checked={!!f.pinnedToHome} onChange={v => upd('pinnedToHome', v)} label="Pin to home" />
            <FormRow label="Mood"><ChipInput value={(f.mood as string[]) ?? []} onChange={v => upd('mood', v)} /></FormRow>
            <FormRow label="Genre"><TextInput value={f.genre ?? ''} onChange={e => upd('genre', e.target.value)} /></FormRow>
            <FormRow label="Tags"><ChipInput value={(f.tags as string[]) ?? []} onChange={v => upd('tags', v)} /></FormRow>
          </FormSection>
          <FormSection title="Targeting & schedule">
            <FormRow label="Locale"><CountriesMultiSelect value={(f.locale as string[]) ?? []} onChange={v => upd('locale', v)} /></FormRow>
            <FormRow label="Target segments">
              <MultiSelect
                value={(f.targetSegments as string[]) ?? []}
                onChange={v => upd('targetSegments', v)}
                options={['free','premium','new_user','returning','artist','label'].map(v => ({ value: v, label: v }))}
              />
            </FormRow>
            <FormRow label="Publish at"><DateTimePicker value={(f.publishedAt as string) ?? ''} onChange={v => upd('publishedAt', v)} /></FormRow>
            <FormRow label="Expires at"><DateTimePicker value={(f.expiresAt as string) ?? ''} onChange={v => upd('expiresAt', v)} /></FormRow>
          </FormSection>
        </div>
      </div>
      <RequireRole allow={['music_admin','super_admin','admin']}>
        <FormFooter
          onCancel={() => { if (!dirty || confirm('Discard?')) router.back(); }}
          onSubmit={save}
          submitLabel={isNew ? 'Create playlist' : 'Save changes'}
          busy={saving}
          dirty={dirty}
        />
      </RequireRole>
    </>
  );
}
