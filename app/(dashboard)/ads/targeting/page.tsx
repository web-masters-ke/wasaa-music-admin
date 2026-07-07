'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Trash2, Search } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  FormSection, FormGrid, FormRow, TextInput, Select,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, AdTargetingRule, AdCampaign, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const DIMENSIONS = ['region', 'demographic', 'device', 'context', 'listening_history'] as const;
const OPERATORS  = ['in', 'not_in', 'eq', 'neq'] as const;

interface RuleForm { campaignId: string; dimension: string; operator: string; value: string }
const EMPTY: RuleForm = { campaignId: '', dimension: 'region', operator: 'in', value: '' };

export default function TargetingPage() {
  const [items, setItems] = useState<AdTargetingRule[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [campaignFilter, setCampaignFilter] = useState('');
  const [dimensionFilter, setDimensionFilter] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (campaignFilter) params.campaignId = campaignFilter;
      if (dimensionFilter) params.dimension = dimensionFilter;
      const [rows, cs] = await Promise.all([
        musicAdmin.listAdTargeting(params),
        musicAdmin.listAdCampaigns({ limit: 100 }).then(r => r.items).catch(() => []),
      ]);
      setItems(rows);
      setCampaigns(cs);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, [campaignFilter, dimensionFilter]);
  useEffect(() => { load(); }, [load]);

  const nameByCampaign = useMemo(() => new Map(campaigns.map(c => [c.id, c.name])), [campaigns]);

  const cols: Column<AdTargetingRule>[] = useMemo(() => [
    { key: 'campaign', header: 'Campaign', render: r => (
      <div>
        <p className="text-sm font-semibold text-text">{nameByCampaign.get(r.campaignId ?? '') ?? r.campaignId?.slice(0, 8) ?? '—'}</p>
        <p className="text-[11px] text-text-muted">{r.campaignId ?? ''}</p>
      </div>
    ) },
    { key: 'dimension', header: 'Dimension', render: r => <Badge tone="brick">{r.dimension ?? '—'}</Badge> },
    { key: 'operator', header: 'Operator', render: r => <Badge tone="muted">{r.operator ?? 'in'}</Badge> },
    { key: 'value', header: 'Value', render: r => <span className="font-mono text-[11px] text-text">{r.value}</span> },
    { key: 'created', header: 'Created', render: r => <span className="text-[11px] text-text-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right', render: r => (
      <button
        onClick={async () => {
          if (!confirm('Delete this targeting rule?')) return;
          try { await musicAdmin.deleteAdTargeting(r.id); toast.success('Deleted'); load(); }
          catch (e) { toast.error(apiError(e).message); }
        }}
        className="text-destructive hover:text-destructive/80"
        aria-label="Delete"
      >
        <Trash2 size={14} />
      </button>
    ) },
  ], [nameByCampaign, load]);

  const filtered = q ? items.filter(r =>
    (r.value ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (nameByCampaign.get(r.campaignId ?? '') ?? '').toLowerCase().includes(q.toLowerCase())
  ) : items;

  const submit = async () => {
    if (!form.campaignId || !form.dimension || !form.value) {
      toast.error('Campaign, dimension, and value are required.');
      return;
    }
    setSaving(true);
    try {
      await musicAdmin.createAdTargeting(form as unknown as Partial<AdTargetingRule>);
      toast.success('Rule created');
      setOpen(false); setForm(EMPTY); load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setSaving(false); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin']}>
      <PageHeader
        title="Targeting rules"
        subtitle="Per-campaign dimension rules — region, demographic, device, context, listening history."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>
            <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} /> New rule</Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search rules…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
        <div className="w-48">
          <Select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)} options={[{ value: '', label: 'All campaigns' }, ...campaigns.map(c => ({ value: c.id, label: c.name }))]} />
        </div>
        <div className="w-40">
          <Select value={dimensionFilter} onChange={e => setDimensionFilter(e.target.value)} options={[{ value: '', label: 'All dimensions' }, ...DIMENSIONS.map(v => ({ value: v, label: v }))]} />
        </div>
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        loading={loading}
        empty={
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text mb-1">No targeting rules</p>
            <p className="text-xs text-text-muted mb-3">Attach targeting rules to campaigns to narrow their audience.</p>
            <Button size="sm" onClick={() => setOpen(true)}><Plus size={13} /> New rule</Button>
          </div>
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New targeting rule"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={saving}>Create</Button>
          </>
        }
      >
        <FormSection title="Rule">
          <FormGrid cols={2}>
            <FormRow label="Campaign" required>
              <Select
                value={form.campaignId}
                onChange={e => setForm({ ...form, campaignId: e.target.value })}
                placeholder="Select campaign…"
                options={campaigns.map(c => ({ value: c.id, label: c.name }))}
              />
            </FormRow>
            <FormRow label="Dimension" required>
              <Select value={form.dimension} onChange={e => setForm({ ...form, dimension: e.target.value })} options={DIMENSIONS.map(v => ({ value: v, label: v }))} />
            </FormRow>
            <FormRow label="Operator">
              <Select value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })} options={OPERATORS.map(v => ({ value: v, label: v }))} />
            </FormRow>
            <FormRow label="Value" required hint="e.g. KE,UG or 18-24">
              <TextInput value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
            </FormRow>
          </FormGrid>
        </FormSection>
      </Modal>
    </RequireRole>
  );
}
