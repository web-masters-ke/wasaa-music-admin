'use client';
import { useEffect, useState, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import { musicAdmin, AuditLog, apiError } from '@/lib/api';
import { fmtDate, humanRelative } from '@/lib/utils';
import { TextInput, Select } from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function AuditLogPage() {
  const [items, setItems] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await musicAdmin.auditLogs({ page, limit: 50, q: q || undefined, action: action || undefined });
      setItems(res.items); setTotalPages(res.pages);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page, q, action]);
  useEffect(() => { load(); }, [load]);

  const cols: Column<AuditLog>[] = [
    { key: 'time', header: 'When', render: l => (
      <div>
        <p className="text-xs">{humanRelative(l.createdAt)}</p>
        <p className="text-[10px] text-text-muted">{fmtDate(l.createdAt, true)}</p>
      </div>
    )},
    { key: 'actor', header: 'Actor', render: l => <span className="text-xs">{l.actorEmail ?? l.actorId ?? '—'}</span> },
    { key: 'action', header: 'Action', render: l => <span className="text-xs font-semibold text-brick">{l.action ?? '—'}</span> },
    { key: 'entity', header: 'Entity', render: l => <span className="text-xs text-text-muted">{l.entityType}:{l.entityId?.slice(0, 8)}…</span> },
    { key: 'ip', header: 'IP', render: l => <span className="text-[11px] text-text-muted font-mono">{l.ip ?? '—'}</span> },
  ];

  return (
    <RequireRole allow={['music_admin','super_admin','admin','compliance_officer']}>
      <PageHeader title="Audit Log" subtitle="All admin actions, immutable." />
      <div className="flex items-center gap-2 mb-4">
        <TextInput value={q} onChange={e => { setPage(1); setQ(e.target.value); }} placeholder="Search actor / entity ID…" />
        <Select value={action} onChange={e => { setPage(1); setAction(e.target.value); }}
          placeholder="All actions"
          options={[
            { value: '', label: 'All actions' },
            { value: 'track.approve', label: 'track.approve' },
            { value: 'track.reject', label: 'track.reject' },
            { value: 'artist.verify', label: 'artist.verify' },
            { value: 'payout.approve', label: 'payout.approve' },
            { value: 'user.ban', label: 'user.ban' },
          ]}
        />
      </div>
      <DataTable columns={cols} data={items} loading={loading} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </RequireRole>
  );
}
