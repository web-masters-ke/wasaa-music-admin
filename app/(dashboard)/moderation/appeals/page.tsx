'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  FormSection, FormGrid, FormRow, TextArea, Select, ChipInput, Toggle,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, Appeal, apiError } from '@/lib/api';
import { fmtDate, humanRelative, statusPillClass } from '@/lib/utils';
import toast from 'react-hot-toast';

type Tab = 'pending' | 'approved' | 'denied' | 'all';
const TABS: Tab[] = ['pending', 'approved', 'denied', 'all'];

interface Decision {
  outcome: 'approved' | 'denied';
  reason: string;
  evidenceUrls: string[];
  notifyUser: boolean;
}
const EMPTY_DECISION: Decision = { outcome: 'approved', reason: '', evidenceUrls: [], notifyUser: true };

export default function AppealsPage() {
  const [tab, setTab] = useState<Tab>('pending');
  const [items, setItems] = useState<Appeal[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Appeal | null>(null);
  const [dec, setDec] = useState<Decision>(EMPTY_DECISION);
  const [deciding, setDeciding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (tab !== 'all') params.status = tab;
      const res = await musicAdmin.listAppeals(params);
      setItems(res.items);
      setTotalPages(res.pages);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, [tab, page]);
  useEffect(() => { load(); }, [load]);

  const cols: Column<Appeal>[] = useMemo(() => [
    { key: 'subject', header: 'Subject', render: r => (
      <div>
        <p className="text-sm font-semibold text-text">{r.subjectType ?? '—'}</p>
        <p className="text-[11px] text-text-muted font-mono">{r.subjectId?.slice(0, 12) ?? '—'}</p>
      </div>
    ) },
    { key: 'submittedBy', header: 'Submitted by', render: r => <span className="text-[11px] font-mono text-text-muted">{r.submittedBy?.slice(0, 10) ?? '—'}</span> },
    { key: 'reason', header: 'Reason', render: r => <span className="text-sm text-text truncate">{(r.reason ?? '').slice(0, 60) || '—'}</span> },
    { key: 'status', header: 'Status', render: r => (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(r.status)}`}>
        {r.status ?? '—'}
      </span>
    ) },
    { key: 'created', header: 'Submitted', render: r => <span className="text-[11px] text-text-muted">{humanRelative(r.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right', render: r => (
      <button
        onClick={() => { setSelected(r); setDec(EMPTY_DECISION); }}
        className="text-xs font-semibold text-brick hover:text-brick-600"
      >
        {r.status === 'pending' ? 'Review →' : 'View →'}
      </button>
    ) },
  ], []);

  const filtered = q ? items.filter(a =>
    (a.reason ?? '').toLowerCase().includes(q.toLowerCase()) ||
    (a.subjectId ?? '').toLowerCase().includes(q.toLowerCase())
  ) : items;

  const decide = async () => {
    if (!selected) return;
    if (!dec.reason.trim()) { toast.error('A decision reason is required.'); return; }
    setDeciding(true);
    try {
      await musicAdmin.decideAppeal(selected.id, dec.outcome, dec.reason);
      toast.success(`Appeal ${dec.outcome}`);
      setSelected(null); setDec(EMPTY_DECISION); load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setDeciding(false); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin','content_moderator']} fallback={<p className="p-6 text-sm text-text-muted">Access denied.</p>}>
      <PageHeader
        title="Appeal Review"
        subtitle="ADED §5.4 — approve or deny artist/label appeals of moderation decisions."
        actions={<Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>}
      />

      <Tabs
        tabs={TABS.map(t => ({ id: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
        active={tab}
        onChange={id => { setTab(id as Tab); setPage(1); }}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search reason, subject id…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
      </div>

      <DataTable
        columns={cols}
        data={filtered}
        loading={loading}
        empty={
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-text mb-1">Nothing to review</p>
            <p className="text-xs text-text-muted">All caught up — no appeals in this tab.</p>
          </div>
        }
      />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={`Appeal · ${selected.subjectType ?? 'subject'}`}
          subtitle={`Submitted ${humanRelative(selected.createdAt)}`}
          size="lg"
          footer={
            selected.status === 'pending' ? (
              <>
                <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
                <Button variant="destructive" onClick={() => { setDec({ ...dec, outcome: 'denied' }); }} disabled={deciding}>
                  <ShieldOff size={13} /> Deny
                </Button>
                <Button variant="success" onClick={() => { setDec({ ...dec, outcome: 'approved' }); }} disabled={deciding}>
                  <ShieldCheck size={13} /> Approve
                </Button>
                <Button onClick={decide} loading={deciding}>Submit decision · {dec.outcome}</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
            )
          }
        >
          <div className="space-y-4">
            <FormSection title="Appeal detail">
              <FormGrid cols={2}>
                <FormRow label="Subject type"><p className="text-sm text-text">{selected.subjectType ?? '—'}</p></FormRow>
                <FormRow label="Subject id"><p className="text-sm text-text font-mono">{selected.subjectId ?? '—'}</p></FormRow>
                <FormRow label="Submitted by"><p className="text-sm text-text font-mono">{selected.submittedBy ?? '—'}</p></FormRow>
                <FormRow label="Status"><Badge tone={selected.status === 'pending' ? 'warning' : selected.status === 'approved' ? 'success' : 'destructive'}>{selected.status ?? '—'}</Badge></FormRow>
              </FormGrid>
              <FormRow label="Reason"><div className="text-sm text-text whitespace-pre-line rounded-xl bg-surface-2 border border-border p-3">{selected.reason ?? '—'}</div></FormRow>
              {selected.evidence && (
                <FormRow label="Evidence"><pre className="text-[11px] text-text-muted whitespace-pre-wrap rounded-xl bg-surface-2 border border-border p-3">{selected.evidence}</pre></FormRow>
              )}
              {selected.decisionReason && (
                <FormRow label="Decision reason"><div className="text-sm text-text rounded-xl bg-surface-2 border border-border p-3">{selected.decisionReason}</div></FormRow>
              )}
              {selected.decidedBy && (
                <FormGrid cols={2}>
                  <FormRow label="Decided by"><p className="text-sm text-text font-mono">{selected.decidedBy}</p></FormRow>
                  <FormRow label="Decided at"><p className="text-sm text-text">{fmtDate(selected.decidedAt, true)}</p></FormRow>
                </FormGrid>
              )}
            </FormSection>

            {selected.status === 'pending' && (
              <FormSection title="Decision" description="Reason + optional evidence URLs. The artist is notified when notify is on.">
                <FormGrid cols={2}>
                  <FormRow label="Outcome">
                    <Select value={dec.outcome} onChange={e => setDec({ ...dec, outcome: e.target.value as 'approved' | 'denied' })}
                      options={[{ value: 'approved', label: 'Approve appeal' }, { value: 'denied', label: 'Deny appeal' }]} />
                  </FormRow>
                  <FormRow label="Notify user">
                    <Toggle checked={dec.notifyUser} onChange={v => setDec({ ...dec, notifyUser: v })} label="Send in-app + email" />
                  </FormRow>
                </FormGrid>
                <FormRow label="Reason" required hint="Shown to the artist"><TextArea rows={4} value={dec.reason} onChange={e => setDec({ ...dec, reason: e.target.value })} /></FormRow>
                <FormRow label="Evidence URLs"><ChipInput value={dec.evidenceUrls} onChange={v => setDec({ ...dec, evidenceUrls: v })} placeholder="Paste supporting URL…" /></FormRow>
              </FormSection>
            )}
          </div>
        </Modal>
      )}
    </RequireRole>
  );
}
