'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { musicAdmin, Album, TrackCredit, apiError } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  FormSection, FormGrid, FormRow, FormFooter, TextInput, TextArea, Select,
  ChipInput, MultiSelect, DatePicker, SubForm, RichTextEditor, FileUpload,
  MultiFileUpload, CountriesMultiSelect,
} from '@/components/forms';
import Badge from '@/components/ui/Badge';
import { Disc3 } from 'lucide-react';

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [f, setF] = useState<Partial<Album>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const upd = <K extends keyof Album>(k: K, v: Album[K]) => { setF(p => ({ ...p, [k]: v })); setDirty(true); };

  useEffect(() => {
    (async () => {
      try {
        const a = await musicAdmin.getAlbum(id);
        setAlbum(a); setF(a);
      } catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="skeleton h-96 w-full" />;
  if (!album)  return <div className="p-6 text-sm text-text-muted">Album not found.</div>;

  const save = async () => {
    setSaving(true);
    try {
      if (f.status && f.status !== album.status) await musicAdmin.updateAlbumStatus(id, f.status);
      toast.success('Album updated'); setDirty(false);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setSaving(false); }
  };

  return (
    <>
      <PageHeader
        title={<span className="flex items-center gap-2"><Disc3 size={22} className="text-brick" /> {album.title}</span>}
        subtitle={<span>{album.artist?.stageName ?? '—'} · <Badge tone="brick">{album.status ?? '—'}</Badge></span>}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pb-32">
        <div className="lg:col-span-2 space-y-4">
          <FormSection title="Identity">
            <FormGrid cols={2}>
              <FormRow label="Title" required><TextInput value={f.title ?? ''} onChange={e => upd('title', e.target.value)} /></FormRow>
              <FormRow label="Subtitle"><TextInput value={f.subtitle ?? ''} onChange={e => upd('subtitle', e.target.value)} /></FormRow>
              <FormRow label="UPC"><TextInput value={f.upc ?? ''} onChange={e => upd('upc', e.target.value)} /></FormRow>
              <FormRow label="Catalog #"><TextInput value={f.catalogNumber ?? ''} onChange={e => upd('catalogNumber', e.target.value)} /></FormRow>
              <FormRow label="Release type">
                <Select value={f.releaseType ?? ''} onChange={e => upd('releaseType', e.target.value as Album['releaseType'])}
                  options={['single','ep','album','compilation'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Genre"><TextInput value={f.genre ?? ''} onChange={e => upd('genre', e.target.value)} /></FormRow>
              <FormRow label="Subgenre"><TextInput value={f.subgenre ?? ''} onChange={e => upd('subgenre', e.target.value)} /></FormRow>
              <FormRow label="Language"><TextInput value={f.language ?? ''} onChange={e => upd('language', e.target.value)} /></FormRow>
            </FormGrid>
            <FormRow label="Mood"><ChipInput value={(f.mood as string[]) ?? []} onChange={v => upd('mood', v)} /></FormRow>
            <FormRow label="Featured artists"><ChipInput value={(f.featuredArtists as string[]) ?? []} onChange={v => upd('featuredArtists', v)} placeholder="Artist ID or name" /></FormRow>
          </FormSection>

          <FormSection title="Description"><RichTextEditor value={f.description ?? ''} onChange={v => upd('description', v)} /></FormSection>

          <FormSection title="Artwork">
            <FormGrid cols={2}>
              <FormRow label="Cover image"><FileUpload value={f.coverImageUrl ?? null} onChange={() => setDirty(true)} /></FormRow>
              <FormRow label="Back cover"><FileUpload value={f.backCoverImageUrl ?? null} onChange={() => setDirty(true)} /></FormRow>
            </FormGrid>
            <FormRow label="Insert images"><MultiFileUpload value={(f.insertImages as string[]) ?? []} onChange={v => upd('insertImages', v as string[])} /></FormRow>
          </FormSection>

          <FormSection title="Rights & release">
            <FormGrid cols={2}>
              <FormRow label="Release date"><DatePicker value={(f.releaseDate as string) ?? ''} onChange={v => upd('releaseDate', v)} /></FormRow>
              <FormRow label="Original release"><DatePicker value={(f.originalReleaseDate as string) ?? ''} onChange={v => upd('originalReleaseDate', v)} /></FormRow>
              <FormRow label="Copyright"><TextInput value={f.copyright ?? ''} onChange={e => upd('copyright', e.target.value)} /></FormRow>
              <FormRow label="Publishing rights"><TextInput value={f.publishingRights ?? ''} onChange={e => upd('publishingRights', e.target.value)} /></FormRow>
              <FormRow label="Licensing"><TextInput value={f.licensingType ?? ''} onChange={e => upd('licensingType', e.target.value)} /></FormRow>
              <FormRow label="Territory restrictions"><CountriesMultiSelect value={(f.territoryRestrictions as string[]) ?? []} onChange={v => upd('territoryRestrictions', v)} /></FormRow>
            </FormGrid>
          </FormSection>

          <FormSection title="Credits">
            <SubForm<TrackCredit>
              items={(f.credits as TrackCredit[]) ?? []}
              onChange={v => upd('credits', v as unknown as Album['credits'])}
              addLabel="Add credit"
              factory={() => ({ name: '', role: 'producer' })}
              renderRow={(c, _i, up) => (
                <FormGrid cols={3}>
                  <TextInput placeholder="Name" value={c.name} onChange={e => up({ name: e.target.value } as Partial<TrackCredit>)} />
                  <TextInput placeholder="Role" value={c.role} onChange={e => up({ role: e.target.value } as Partial<TrackCredit>)} />
                  <TextInput type="number" placeholder="Split %" value={c.splitPercent ?? 0} onChange={e => up({ splitPercent: Number(e.target.value) } as Partial<TrackCredit>)} />
                </FormGrid>
              )}
            />
          </FormSection>
        </div>

        <div className="space-y-4">
          <FormSection title="Status">
            <FormRow label="Status">
              <Select value={f.status ?? ''} onChange={e => upd('status', e.target.value)}
                options={['draft','pending_review','approved','rejected','suspended','removed'].map(v => ({ value: v, label: v }))} />
            </FormRow>
            <FormRow label="Internal notes">
              <TextArea rows={4} value={f.notes ?? ''} onChange={e => upd('notes', e.target.value)} />
            </FormRow>
          </FormSection>
          <FormSection title="Tracks in album">
            <MultiSelect
              value={(f.tracks ?? []).map(t => t.id)}
              onChange={v => upd('tracks', v.map(id => ({ id, title: id } as never)))}
              options={(album.tracks ?? []).map(t => ({ value: t.id, label: t.title }))}
              placeholder="Reorder & add tracks…"
            />
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
