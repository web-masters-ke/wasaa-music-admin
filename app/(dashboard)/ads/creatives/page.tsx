'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  FormSection, FormGrid, FormRow, TextInput, TextArea, Select,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, AdCreative, AdCampaign, apiError } from '@/lib/api';
import { fmtDate, statusPillClass } from '@/lib/utils';
import toast from 'react-hot-toast';

const ASSET_TYPES = ['banner', 'audio', 'video', 'native'] as const;
const STATUSES    = ['', 'draft', 'pending_approval', 'approved', 'active', 'paused', 'rejected'];

interface CreativeForm {
  campaignId: string;
  assetType: string;
  objectKey: string;
  fileUrl: string;
  altText: string;
  ctaText: string;
  ctaUrl: string;
  brandName: string;
  brandLogo: string;
  previewImage: string;
  durationSeconds: number;
  width: number;
  height: number;
  aspectRatio: string;
  status: string;
  targetSegments: string;
  notes: string;
}

const EMPTY_FORM: CreativeForm = {
  campaignId: '', assetType: 'banner', objectKey: '', fileUrl: '', altText: '',
  ctaText: '', ctaUrl: '', brandName: '', brandLogo: '', previewImage: '',
  durationSeconds: 0, width: 0, height: 0, aspectRatio: '16:9', status: 'draft',
  targetSegments: '', notes: '',
};

export default function CreativesPage() {
  const [items, setItems] = useState<AdCreative[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreativeForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (status) params.status = status;
      const [res, cs] = await Promise.all([
        musicAdmin.listAdCreatives(params),
        musicAdmin.listAdCampaigns({ limit: 100 }).then(r => r.items).catch(() => []),
      ]);
      setItems(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
      setCampaigns(cs);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setLoading(false);
    }
  }, [page, status]);
  useEffect(() => { load(); }, [load]);

  const cols: Column<AdCreative>[] = useMemo(() => [
    { key: 'preview', header: 'Preview', render: c => (
      <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-brick/30 to-brick/10 border border-border overflow-hidden">
        {c.fileUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={c.fileUrl} alt={c.altText ?? ''} loading="lazy" className="w-full h-full object-cover" />
        ) : null}
      </div>
    ) },
    { key: 'name', header: 'Creative', render: c => (
      <div>
        <p className="text-sm font-semibold text-text">{c.altText ?? c.objectKey ?? c.id.slice(0, 8)}</p>
        <p className="text-[11px] text-text-muted">{c.objectKey ?? '—'}</p>
      </div>
    ) },
    { key: 'type', header: 'Type', render: c => <Badge tone="muted">{c.assetType ?? '—'}</Badge> },
    { key: 'dim', header: 'Dims', render: c => c.width && c.height ? `${c.width}×${c.height}` : '—' },
    { key: 'duration', header: 'Dur.', render: c => c.durationSeconds ? `${c.durationSeconds}s` : '—' },
    { key: 'status', header: 'Status', render: c => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(c.status)}`}>
        {c.status ?? '—'}
      </span>
    ) },
    { key: 'created', header: 'Created', render: c => <span className="text-[11px] text-text-muted">{fmtDate(c.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right', render: c => (
      <button
        onClick={async () => {
          if (!confirm('Delete this creative?')) return;
          try { await musicAdmin.deleteAdCreative(c.id); toast.success('Deleted'); load(); }
          catch (e) { toast.error(apiError(e).message); }
        }}
        className="text-destructive hover:text-destructive/80"
        aria-label="Delete"
      >
        <Trash2 size={14} />
      </button>
    ) },
  ], [load]);

  const filtered = q ? items.filter(i => (i.altText ?? '').toLowerCase().includes(q.toLowerCase()) || (i.objectKey ?? '').toLowerCase().includes(q.toLowerCase())) : items;

  const submit = async () => {
    if (!form.campaignId || !form.assetType || !form.objectKey) {
      toast.error('Campaign, asset type, and object key are required.');
      return;
    }
    setSaving(true);
    try {
      await musicAdmin.createAdCreative(form as unknown as Partial<AdCreative>);
      toast.success('Creative created');
      setOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setSaving(false); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin']}>
      <PageHeader
        title="Ad Creatives"
        subtitle={`${total} creative${total === 1 ? '' : 's'} · reusable across campaigns.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} /> New creative</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search creatives…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
        <div className="w-40">
          <Select value={status} onChange={e => setStatus(e.target.value)} options={STATUSES.map(s => ({ value: s, label: s || 'All statuses' }))} />
        </div>
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        loading={loading}
        empty={
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text mb-1">No creatives yet</p>
            <p className="text-xs text-text-muted mb-3">Add banner, audio, video, or native creatives to attach to campaigns.</p>
            <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} /> New creative</Button>
          </div>
        }
      />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New ad creative"
        subtitle="Upload creative asset metadata — the object goes to the media service, this record stores the pointer."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={saving}>Create</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormSection title="Identity">
            <FormGrid cols={2}>
              <FormRow label="Campaign" required>
                <Select
                  value={form.campaignId}
                  onChange={e => setForm({ ...form, campaignId: e.target.value })}
                  placeholder="Select campaign…"
                  options={campaigns.map(c => ({ value: c.id, label: c.name }))}
                />
              </FormRow>
              <FormRow label="Asset type" required>
                <Select value={form.assetType} onChange={e => setForm({ ...form, assetType: e.target.value })} options={ASSET_TYPES.map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Object key" required hint="S3 / media-service pointer">
                <TextInput value={form.objectKey} onChange={e => setForm({ ...form, objectKey: e.target.value })} />
              </FormRow>
              <FormRow label="File URL" hint="Public URL for the preview">
                <TextInput value={form.fileUrl} onChange={e => setForm({ ...form, fileUrl: e.target.value })} />
              </FormRow>
            </FormGrid>
          </FormSection>
          <FormSection title="Presentation">
            <FormGrid cols={3}>
              <FormRow label="Alt text"><TextInput value={form.altText} onChange={e => setForm({ ...form, altText: e.target.value })} /></FormRow>
              <FormRow label="CTA text"><TextInput value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} /></FormRow>
              <FormRow label="CTA URL"><TextInput value={form.ctaUrl} onChange={e => setForm({ ...form, ctaUrl: e.target.value })} /></FormRow>
              <FormRow label="Brand name"><TextInput value={form.brandName} onChange={e => setForm({ ...form, brandName: e.target.value })} /></FormRow>
              <FormRow label="Brand logo URL"><TextInput value={form.brandLogo} onChange={e => setForm({ ...form, brandLogo: e.target.value })} /></FormRow>
              <FormRow label="Preview image"><TextInput value={form.previewImage} onChange={e => setForm({ ...form, previewImage: e.target.value })} /></FormRow>
            </FormGrid>
          </FormSection>
          <FormSection title="Dimensions & duration">
            <FormGrid cols={4}>
              <FormRow label="Width (px)"><TextInput type="number" value={form.width} onChange={e => setForm({ ...form, width: Number(e.target.value) })} /></FormRow>
              <FormRow label="Height (px)"><TextInput type="number" value={form.height} onChange={e => setForm({ ...form, height: Number(e.target.value) })} /></FormRow>
              <FormRow label="Aspect ratio">
                <Select value={form.aspectRatio} onChange={e => setForm({ ...form, aspectRatio: e.target.value })} options={['16:9','9:16','1:1','4:5','2:3'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Duration (seconds)"><TextInput type="number" value={form.durationSeconds} onChange={e => setForm({ ...form, durationSeconds: Number(e.target.value) })} /></FormRow>
            </FormGrid>
          </FormSection>
          <FormSection title="Targeting & status">
            <FormGrid cols={2}>
              <FormRow label="Target segments (JSON)"><TextInput value={form.targetSegments} onChange={e => setForm({ ...form, targetSegments: e.target.value })} placeholder='["adults_18_24"]' /></FormRow>
              <FormRow label="Status">
                <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} options={['draft','pending_approval','approved','active','paused','rejected'].map(v => ({ value: v, label: v }))} />
              </FormRow>
            </FormGrid>
            <FormRow label="Notes"><TextArea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormRow>
          </FormSection>
        </div>
      </Modal>
    </RequireRole>
  );
}
