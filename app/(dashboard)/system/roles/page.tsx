'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCcw, Search, ShieldOff, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import {
  FormSection, FormGrid, FormRow, TextInput, Select,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, AdminUserRow, RoleCatalogEntry, apiError } from '@/lib/api';
import { fmtDate, humanRelative } from '@/lib/utils';
import toast from 'react-hot-toast';

interface CreateForm { email: string; password: string; firstName: string; lastName: string; role: string }
const EMPTY: CreateForm = { email: '', password: '', firstName: '', lastName: '', role: 'admin' };

export default function RolesPage() {
  const [catalog, setCatalog] = useState<RoleCatalogEntry[]>([]);
  const [admins, setAdmins] = useState<AdminUserRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState<AdminUserRow | null>(null);
  const [assignRole, setAssignRole] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (q) params.q = q;
      if (role) params.role = role;
      if (status) params.status = status;
      const [c, res] = await Promise.all([
        musicAdmin.roleCatalog().catch(() => [] as RoleCatalogEntry[]),
        musicAdmin.listAdminUsers(params).catch(() => ({ items: [] as AdminUserRow[], total: 0, pages: 1, page: 1 })),
      ]);
      setCatalog(c);
      setAdmins(res.items);
      setTotalPages(res.pages);
      setTotal(res.total);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, [page, q, role, status]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const cols: Column<AdminUserRow>[] = useMemo(() => [
    { key: 'name', header: 'Admin', render: r => (
      <div>
        <p className="text-sm font-semibold text-text">{r.firstName ?? '—'} {r.lastName ?? ''}</p>
        <p className="text-[11px] text-text-muted">{r.email}</p>
      </div>
    ) },
    { key: 'role', header: 'Role', render: r => <Badge tone="brick">{r.role}</Badge> },
    { key: 'status', header: 'Status', render: r => (
      <Badge tone={r.status === 'suspended' ? 'destructive' : 'success'}>{r.status ?? 'active'}</Badge>
    ) },
    { key: 'lastLogin', header: 'Last login', render: r => <span className="text-[11px] text-text-muted">{r.lastLoginAt ? humanRelative(r.lastLoginAt) : '—'}</span> },
    { key: 'created', header: 'Created', render: r => <span className="text-[11px] text-text-muted">{fmtDate(r.createdAt)}</span> },
    { key: 'actions', header: '', className: 'text-right', render: r => (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => { setAssigning(r); setAssignRole(r.role); }}
          className="text-xs font-semibold text-brick hover:text-brick-600"
        >
          Change role
        </button>
        <button
          onClick={async () => {
            const next = r.status === 'suspended' ? 'active' : 'suspended';
            if (!confirm(`${next === 'suspended' ? 'Suspend' : 'Reactivate'} ${r.email}?`)) return;
            try {
              await musicAdmin.setAdminStatus(r.id, next);
              toast.success(`Set to ${next}`);
              load();
            } catch (e) { toast.error(apiError(e).message); }
          }}
          className={r.status === 'suspended' ? 'text-success' : 'text-destructive hover:text-destructive/80'}
          aria-label={r.status === 'suspended' ? 'Reactivate' : 'Suspend'}
        >
          {r.status === 'suspended' ? <ShieldCheck size={14} /> : <ShieldOff size={14} />}
        </button>
      </div>
    ) },
  ], [load]);

  const create = async () => {
    if (!form.email || !form.password || !form.firstName || !form.lastName || !form.role) {
      toast.error('All fields are required.');
      return;
    }
    setSaving(true);
    try {
      await musicAdmin.createAdminUser(form);
      toast.success('Admin created');
      setOpen(false); setForm(EMPTY); load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setSaving(false); }
  };

  const doAssign = async () => {
    if (!assigning) return;
    try {
      await musicAdmin.assignRole(assigning.id, assignRole);
      toast.success(`Role set to ${assignRole}`);
      setAssigning(null);
      load();
    } catch (e) { toast.error(apiError(e).message); }
  };

  return (
    <RequireRole allow={['super_admin']} fallback={<p className="p-6 text-sm text-text-muted">Only super_admin can manage roles.</p>}>
      <PageHeader
        title="Roles & Delegation"
        subtitle={`${total} admin${total === 1 ? '' : 's'} · role catalog + assignment`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>
            <Button size="sm" onClick={() => { setForm(EMPTY); setOpen(true); }}><Plus size={13} /> New admin</Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardHeader title="Role catalog" subtitle="Roles recognised by the backend gateway." />
        <CardBody className="!p-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {catalog.map(r => (
              <div key={r.id} className="px-5 py-3 border-b border-border last:border-b-0 md:odd:border-r md:odd:border-r-border">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold text-text">{r.label}</p>
                  {r.superOnly && <Badge tone="brick">super only</Badge>}
                </div>
                <p className="text-[11px] font-mono text-text-muted mb-1">{r.id}</p>
                <p className="text-xs text-text-muted">{r.scope}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input value={q} onChange={e => { setQ(e.target.value); setPage(1); }} placeholder="Search email, name…" className="w-full h-10 pl-9 pr-3 rounded-xl bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-brick/20 focus:border-brick" />
        </div>
        <div className="w-48">
          <Select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All roles' }, ...catalog.map(c => ({ value: c.id, label: c.label }))]} />
        </div>
        <div className="w-40">
          <Select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: '', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }]} />
        </div>
      </div>

      <DataTable columns={cols} data={admins} loading={loading} empty={<div className="py-10 text-center text-sm text-text-muted">No admins.</div>} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create admin user"
        subtitle="Only super_admin can create admins."
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} loading={saving}>Create</Button>
          </>
        }
      >
        <FormSection title="Identity">
          <FormGrid cols={2}>
            <FormRow label="First name" required><TextInput value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} /></FormRow>
            <FormRow label="Last name" required><TextInput value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} /></FormRow>
            <FormRow label="Email" required><TextInput type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></FormRow>
            <FormRow label="Password" required hint="≥ 8 chars"><TextInput type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></FormRow>
            <FormRow label="Role" required>
              <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                options={catalog.map(c => ({ value: c.id, label: c.label }))} />
            </FormRow>
          </FormGrid>
        </FormSection>
      </Modal>

      {assigning && (
        <Modal
          open={!!assigning}
          onClose={() => setAssigning(null)}
          title={`Change role · ${assigning.email}`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => setAssigning(null)}>Cancel</Button>
              <Button onClick={doAssign}>Assign</Button>
            </>
          }
        >
          <FormRow label="New role">
            <Select value={assignRole} onChange={e => setAssignRole(e.target.value)}
              options={catalog.map(c => ({ value: c.id, label: c.label }))} />
          </FormRow>
        </Modal>
      )}
    </RequireRole>
  );
}
