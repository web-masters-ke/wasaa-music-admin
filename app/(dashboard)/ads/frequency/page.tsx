'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  FormSection, FormGrid, FormRow, TextInput, Select,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, AdFrequencyCap, AdCampaign, apiError } from '@/lib/api';
import { fmtDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const WINDOWS = ['1h', '6h', '24h', '7d', '30d'] as const;
interface CapForm { campaignId: string; impressionsPerUser: number; resetWindow: string }
const EMPTY: CapForm = { campaignId: '', impressionsPerUser: 3, resetWindow: '24h' };

export default function FrequencyPage() {
  const [items, setItems] = useState<AdFrequencyCap[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CapForm>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, cs] = await Promise.all([
        musicAdmin.listAdFrequency(),
        musicAdmin.listAdCampaigns({ limit: 100 }).then(r => r.items).catch(() => []),
      ]);
      setItems(rows);
      setCampaigns(cs);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const nameByCampaign = useMemo(() => new Map(campaigns.map(c => [c.id, c.name])), [campaigns]);

  const cols: Column<AdFrequencyCap>[] = useMemo(() => [
    { key: 'campaign', header: 'Campaign', render: r => (
      <div>
        <p className="text-sm font-semibold text-text">{nameByCampaign.get(r.campaignId ?? '') ?? r.campaignId?.slice(0, 8) ?? '—'}</p>
      </div>
    ) },
    { key: 'perUser', header: 'Impressions / user', render: r => <span className="font-bold text-text">{r.impressionsPerUser ?? '—'}</span> },
    { key: 'window', header: 'Reset window', render: r => <Badge tone="brick">{r.resetWindow ?? '24h'}</Badge> },
    { key: 'created', header: 'Created', render: r => <span className="text-[11px] text-text-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right', render: r => (
      <button
        onClick={() => {
          setForm({
            campaignId: r.campaignId ?? '',
            impressionsPerUser: r.impressionsPerUser ?? 3,
            resetWindow: r.resetWindow ?? '24h',
          });
          setOpen(true);
        }}
        className="text-xs font-semibold text-brick hover:text-brick-600"
      >
        Edit
      </button>
    ) },
  ], [nameByCampaign]);

  const submit = async () => {
    if (!form.campaignId) { toast.error('Campaign is required.'); return; }
    setSaving(true);
    try {
      await musicAdmin.upsertAdFrequency(form);
      toast.success('Frequency cap saved');
      setOpen(false); setForm(EMPTY); load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setSaving(false); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin']}>
      <PageHeader
        title="Frequency caps"
        subtitle="Per-campaign impressions-per-user throttling. Redis is the runtime store; this is the durable ledger."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>
            <Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={13} /> New cap</Button>
          </div>
        }
      />

      <DataTable
        columns={cols}
        data={items}
        loading={loading}
        empty={
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text mb-1">No frequency caps yet</p>
            <p className="text-xs text-text-muted mb-3">Add a cap to prevent over-serving impressions to the same user.</p>
            <Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={13} /> New cap</Button>
          </div>
        }
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.campaignId && items.some(i => i.campaignId === form.campaignId) ? 'Update frequency cap' : 'New frequency cap'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} loading={saving}>Save</Button>
          </>
        }
      >
        <FormSection title="Cap">
          <FormGrid cols={1}>
            <FormRow label="Campaign" required>
              <Select
                value={form.campaignId}
                onChange={e => setForm({ ...form, campaignId: e.target.value })}
                placeholder="Select campaign…"
                options={campaigns.map(c => ({ value: c.id, label: c.name }))}
              />
            </FormRow>
            <FormRow label="Impressions per user" required>
              <TextInput type="number" value={form.impressionsPerUser} onChange={e => setForm({ ...form, impressionsPerUser: Number(e.target.value) })} />
            </FormRow>
            <FormRow label="Reset window">
              <Select value={form.resetWindow} onChange={e => setForm({ ...form, resetWindow: e.target.value })} options={WINDOWS.map(v => ({ value: v, label: v }))} />
            </FormRow>
          </FormGrid>
        </FormSection>
      </Modal>
    </RequireRole>
  );
}
