'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import {
  FormSection, FormGrid, FormRow, TextArea, SearchableDropdown, DateTimePicker, Slider,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, TrendingOverride, Track, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface OverrideForm { trackId: string; priority: number; expiresAt: string; notes: string }
const EMPTY: OverrideForm = { trackId: '', priority: 100, expiresAt: '', notes: '' };

export default function TrendingPage() {
  const [items, setItems] = useState<TrendingOverride[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<OverrideForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, t] = await Promise.all([
        musicAdmin.listTrending(),
        musicAdmin.listTracks({ limit: 200 }).then(r => r.items).catch(() => []),
      ]);
      setItems(rows);
      setTracks(t);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const trackById = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);

  const cols: Column<TrendingOverride>[] = useMemo(() => [
    { key: 'track', header: 'Track', render: r => {
      const t = r.track ?? trackById.get(r.trackId);
      return (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brick/30 to-brick/10 border border-border overflow-hidden">
            {(() => {
              const cover = (t as unknown as Record<string, string> | undefined)?.coverImageUrl ?? (t as unknown as Record<string, string> | undefined)?.coverUrl;
              return cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
              ) : null;
            })()}
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{t?.title ?? r.trackId.slice(0, 8)}</p>
            <p className="text-[11px] text-text-muted">{t?.artist?.stageName ?? '—'}</p>
          </div>
        </div>
      );
    } },
    { key: 'priority', header: 'Priority', render: r => <span className="font-bold text-text">{r.priority ?? 0}</span> },
    { key: 'expires', header: 'Expires', render: r => r.expiresAt ? <span className="text-[11px] text-text-muted">{fmtDate(r.expiresAt)}</span> : <span className="text-[11px] text-text-muted">Never</span> },
    { key: 'created', header: 'Created', render: r => <span className="text-[11px] text-text-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right', render: r => (
      <button
        onClick={async () => {
          if (!confirm('Remove this trending override?')) return;
          try { await musicAdmin.deleteTrending(r.trackId); toast.success('Removed'); load(); }
          catch (e) { toast.error(apiError(e).message); }
        }}
        className="text-destructive hover:text-destructive/80"
        aria-label="Delete"
      >
        <Trash2 size={14} />
      </button>
    ) },
  ], [trackById, load]);

  const filtered = q ? items.filter(r => {
    const t = trackById.get(r.trackId);
    return (t?.title ?? '').toLowerCase().includes(q.toLowerCase()) || r.trackId.includes(q);
  }) : items;

  const submit = async () => {
    if (!form.trackId) { toast.error('Pick a track.'); return; }
    setSaving(true);
    try {
      await musicAdmin.upsertTrending({
        trackId: form.trackId,
        priority: form.priority,
        expiresAt: form.expiresAt || null,
      });
      toast.success('Trending override saved');
      setOpen(false); setForm(EMPTY); load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setSaving(false); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin']}>
      <PageHeader
        title="Trending Overrides"
        subtitle="Hand-pick tracks that outrank the algorithmic trending list."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>
            <Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={13} /> New override</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by track title, id…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        loading={loading}
        empty={
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text mb-1">No overrides</p>
            <p className="text-xs text-text-muted mb-3">Trending is driven by the algorithm today. Add an override to pin a track.</p>
            <Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={13} /> New override</Button>
          </div>
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New trending override"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={saving}>Save</Button>
          </>
        }
      >
        <FormSection title="Override">
          <FormRow label="Track" required>
            <SearchableDropdown
              value={form.trackId}
              onChange={v => setForm({ ...form, trackId: v })}
              options={tracks.map(t => ({ value: t.id, label: t.title ?? '—', subLabel: t.artist?.stageName }))}
              placeholder="Search for a track…"
            />
          </FormRow>
          <FormGrid cols={2}>
            <FormRow label="Priority" hint="Higher wins tie-break"><Slider value={form.priority} onChange={v => setForm({ ...form, priority: v })} min={0} max={1000} step={10} /></FormRow>
            <FormRow label="Expires at" hint="Leave empty for permanent"><DateTimePicker value={form.expiresAt} onChange={v => setForm({ ...form, expiresAt: v })} /></FormRow>
          </FormGrid>
          <FormRow label="Notes (internal)"><TextArea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormRow>
        </FormSection>
      </Modal>
    </RequireRole>
  );
}
