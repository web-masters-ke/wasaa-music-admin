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
  FormSection, FormGrid, FormRow, TextInput, TextArea, Select, Toggle,
  DateTimePicker, Slider, MultiSelect,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, Banner, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const POSITIONS = ['home_hero', 'home_secondary', 'discover', 'sidebar', 'library'] as const;
const LOCALES   = ['en', 'sw', 'fr', 'pt', 'ar'];

type BannerForm = {
  title: string;
  imageUrlDesktop: string;
  imageUrlTablet: string;
  imageUrlMobile: string;
  altText: string;
  ctaText: string;
  ctaUrl: string;
  position: string;
  targetSegments: string[];
  startAt: string;
  endAt: string;
  priority: number;
  active: boolean;
  locale: string;
  notes: string;
};

const EMPTY: BannerForm = {
  title: '', imageUrlDesktop: '', imageUrlTablet: '', imageUrlMobile: '',
  altText: '', ctaText: '', ctaUrl: '', position: 'home_hero',
  targetSegments: [], startAt: '', endAt: '',
  priority: 0, active: true, locale: 'en', notes: '',
};

function toDT(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BannersPage() {
  const [items, setItems] = useState<Banner[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [position, setPosition] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (position) params.position = position;
      if (activeFilter !== 'all') params.active = activeFilter;
      const res = await musicAdmin.listBanners(params);
      setItems(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, [page, position, activeFilter]);
  useEffect(() => { load(); }, [load]);

  const cols: Column<Banner>[] = useMemo(() => [
    { key: 'image', header: '', render: b => (
      <div className="w-20 h-12 rounded-lg bg-gradient-to-br from-brick/30 to-brick/10 border border-border overflow-hidden">
        {b.imageUrlDesktop ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={b.imageUrlDesktop} alt={b.altText ?? ''} loading="lazy" className="w-full h-full object-cover" />
        ) : null}
      </div>
    ) },
    { key: 'title', header: 'Banner', render: b => (
      <div>
        <p className="text-sm font-semibold text-text">{b.title}</p>
        <p className="text-[11px] text-text-muted truncate max-w-[260px]">{b.ctaText ?? b.altText ?? '—'}</p>
      </div>
    ) },
    { key: 'position', header: 'Position', render: b => <Badge tone="muted">{b.position ?? '—'}</Badge> },
    { key: 'priority', header: 'Priority', render: b => <span className="font-bold text-text">{b.priority ?? 0}</span> },
    { key: 'schedule', header: 'Schedule', render: b => (
      <div className="text-[11px] text-text-muted">
        <p>{fmtDate(b.startAt)}</p>
        <p>→ {fmtDate(b.endAt)}</p>
      </div>
    ) },
    { key: 'active', header: 'Active', render: b => b.active ? <Badge tone="success">on</Badge> : <Badge tone="muted">off</Badge> },
    { key: 'actions', header: '', className: 'text-right', render: b => (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => {
            setEditing(b.id);
            setForm({
              title: b.title ?? '',
              imageUrlDesktop: b.imageUrlDesktop ?? '',
              imageUrlTablet: b.imageUrlTablet ?? '',
              imageUrlMobile: b.imageUrlMobile ?? '',
              altText: b.altText ?? '',
              ctaText: b.ctaText ?? '',
              ctaUrl: b.ctaUrl ?? '',
              position: b.position ?? 'home_hero',
              targetSegments: (() => { try { return b.targetSegments ? JSON.parse(b.targetSegments as string) : []; } catch { return []; } })(),
              startAt: toDT(b.startAt),
              endAt: toDT(b.endAt),
              priority: b.priority ?? 0,
              active: b.active !== false,
              locale: b.locale ?? 'en',
              notes: b.notes ?? '',
            });
            setOpen(true);
          }}
          className="text-xs font-semibold text-brick hover:text-brick-600"
        >
          Edit
        </button>
        <button
          onClick={async () => {
            if (!confirm('Delete this banner?')) return;
            try { await musicAdmin.deleteBanner(b.id); toast.success('Deleted'); load(); }
            catch (e) { toast.error(apiError(e).message); }
          }}
          className="text-destructive hover:text-destructive/80"
          aria-label="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    ) },
  ], [load]);

  const filtered = q ? items.filter(b => (b.title ?? '').toLowerCase().includes(q.toLowerCase())) : items;

  const submit = async () => {
    if (!form.title || !form.imageUrlDesktop) { toast.error('Title and desktop image URL are required.'); return; }
    setSaving(true);
    try {
      const body: Partial<Banner> = {
        title: form.title,
        imageUrlDesktop: form.imageUrlDesktop,
        imageUrlTablet: form.imageUrlTablet || undefined,
        imageUrlMobile: form.imageUrlMobile || undefined,
        altText: form.altText || undefined,
        ctaText: form.ctaText || undefined,
        ctaUrl: form.ctaUrl || undefined,
        position: form.position as Banner['position'],
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        priority: form.priority,
        active: form.active,
        locale: form.locale,
        targetSegments: form.targetSegments.length ? JSON.stringify(form.targetSegments) : undefined,
        notes: form.notes || undefined,
      };
      if (editing) await musicAdmin.updateBanner(editing, body);
      else await musicAdmin.createBanner(body);
      toast.success(editing ? 'Banner saved' : 'Banner created');
      setOpen(false); setEditing(null); setForm(EMPTY); load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setSaving(false); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin']}>
      <PageHeader
        title="Banners"
        subtitle={`${total} banner${total === 1 ? '' : 's'} · home & category slots with schedule, targeting, and CTA.`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>
            <Button size="sm" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus size={13} /> New banner</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search banners…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
        <div className="w-44">
          <Select value={position} onChange={e => { setPosition(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All positions' }, ...POSITIONS.map(v => ({ value: v, label: v }))]} />
        </div>
        <div className="w-32">
          <Select value={activeFilter} onChange={e => { setActiveFilter(e.target.value as typeof activeFilter); setPage(1); }}
            options={[{ value: 'all', label: 'All' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
        </div>
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        loading={loading}
        empty={
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text mb-1">No banners yet</p>
            <p className="text-xs text-text-muted mb-3">Add banners to control the home & discover hero slots.</p>
            <Button size="sm" onClick={() => { setEditing(null); setForm(EMPTY); setOpen(true); }}><Plus size={13} /> New banner</Button>
          </div>
        }
      />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        title={editing ? 'Edit banner' : 'New banner'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setOpen(false); setEditing(null); }}>Cancel</Button>
            <Button onClick={submit} loading={saving}>{editing ? 'Save' : 'Create'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormSection title="Identity">
            <FormGrid cols={2}>
              <FormRow label="Title" required><TextInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></FormRow>
              <FormRow label="Alt text" hint="Screen-reader label"><TextInput value={form.altText} onChange={e => setForm({ ...form, altText: e.target.value })} /></FormRow>
              <FormRow label="CTA text"><TextInput value={form.ctaText} onChange={e => setForm({ ...form, ctaText: e.target.value })} /></FormRow>
              <FormRow label="CTA URL"><TextInput value={form.ctaUrl} onChange={e => setForm({ ...form, ctaUrl: e.target.value })} placeholder="https://…" /></FormRow>
            </FormGrid>
          </FormSection>

          <FormSection title="Assets" description="Provide desktop URL at minimum. Tablet and mobile fall back to desktop when omitted.">
            <FormRow label="Desktop image URL" required><TextInput value={form.imageUrlDesktop} onChange={e => setForm({ ...form, imageUrlDesktop: e.target.value })} /></FormRow>
            {form.imageUrlDesktop && (
              <div className="w-full max-w-md aspect-[21/9] rounded-xl border border-border overflow-hidden bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imageUrlDesktop} alt="Desktop preview" className="w-full h-full object-cover" />
              </div>
            )}
            <FormGrid cols={2}>
              <FormRow label="Tablet image URL"><TextInput value={form.imageUrlTablet} onChange={e => setForm({ ...form, imageUrlTablet: e.target.value })} /></FormRow>
              <FormRow label="Mobile image URL"><TextInput value={form.imageUrlMobile} onChange={e => setForm({ ...form, imageUrlMobile: e.target.value })} /></FormRow>
            </FormGrid>
          </FormSection>

          <FormSection title="Placement">
            <FormGrid cols={3}>
              <FormRow label="Position"><Select value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} options={POSITIONS.map(v => ({ value: v, label: v }))} /></FormRow>
              <FormRow label="Locale"><Select value={form.locale} onChange={e => setForm({ ...form, locale: e.target.value })} options={LOCALES.map(v => ({ value: v, label: v }))} /></FormRow>
              <FormRow label="Priority" hint="Higher wins tie-break"><Slider value={form.priority} onChange={v => setForm({ ...form, priority: v })} min={0} max={100} /></FormRow>
            </FormGrid>
            <FormRow label="Target segments">
              <MultiSelect value={form.targetSegments} onChange={v => setForm({ ...form, targetSegments: v })}
                options={['new_users','premium_subscribers','artists','listeners_18_24','listeners_25_34','east_africa','west_africa','south_africa'].map(v => ({ value: v, label: v }))} />
            </FormRow>
          </FormSection>

          <FormSection title="Schedule">
            <FormGrid cols={2}>
              <FormRow label="Start at"><DateTimePicker value={form.startAt} onChange={v => setForm({ ...form, startAt: v })} /></FormRow>
              <FormRow label="End at"><DateTimePicker value={form.endAt} onChange={v => setForm({ ...form, endAt: v })} /></FormRow>
            </FormGrid>
            <Toggle label="Active" description="Off means hidden regardless of schedule." checked={form.active} onChange={v => setForm({ ...form, active: v })} />
          </FormSection>

          <FormSection title="Notes"><FormRow label="Internal notes"><TextArea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></FormRow></FormSection>
        </div>
      </Modal>
    </RequireRole>
  );
}
