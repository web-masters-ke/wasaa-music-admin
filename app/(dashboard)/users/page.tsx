'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { DataTable, Column } from '@/components/ui/Table';
import Pagination from '@/components/ui/Pagination';
import Tabs from '@/components/ui/Tabs';
import Badge from '@/components/ui/Badge';
import { musicAdmin, UserRow, apiError } from '@/lib/api';
import { fmtDate, statusPillClass, humanRelative } from '@/lib/utils';
import { TextInput } from '@/components/forms';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const router = useRouter();
  const [items, setItems] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'banned') {
        const list = await musicAdmin.listBannedUsers();
        setItems(list); setTotalPages(1);
      } else {
        const res = await musicAdmin.listUsers({ page, limit: 25, q: q || undefined });
        setItems(res.items); setTotalPages(res.pages);
      }
    } catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  }, [page, q, tab]);

  useEffect(() => { load(); }, [load]);

  const cols: Column<UserRow>[] = [
    { key: 'user', header: 'User', render: u => (
      <div>
        <p className="text-sm font-semibold text-text">{u.displayName ?? u.email ?? u.phoneNumber ?? '—'}</p>
        <p className="text-[11px] text-text-muted">{u.email ?? u.phoneNumber ?? '—'}</p>
      </div>
    )},
    { key: 'country', header: 'Country', render: u => <span className="text-xs text-text-muted">{u.country ?? '—'}</span> },
    { key: 'tier', header: 'Tier', render: u => <Badge tone={u.subscriptionTier === 'premium' ? 'brick' : 'muted'}>{u.subscriptionTier ?? 'free'}</Badge> },
    { key: 'status', header: 'Status', render: u => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusPillClass(u.banStatus ?? u.status)}`}>
        {u.banStatus ?? u.status ?? 'active'}
      </span>
    )},
    { key: 'last', header: 'Last login', render: u => <span className="text-xs text-text-muted">{u.lastLoginAt ? humanRelative(u.lastLoginAt) : '—'}</span> },
    { key: 'created', header: 'Joined', render: u => <span className="text-xs text-text-muted">{fmtDate(u.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader title="Users" subtitle="End-user listener accounts scoped to the music product." />
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <TextInput placeholder="Search email, phone, name…" value={q} onChange={e => { setPage(1); setQ(e.target.value); }} className="pl-9" />
        </div>
      </div>
      <Tabs tabs={[
        { id: 'all',    label: 'All' },
        { id: 'banned', label: 'Banned' },
      ]} active={tab} onChange={setTab} />
      <DataTable columns={cols} data={items} loading={loading} onRowClick={u => router.push(`/users/${u.id}`)} />
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </>
  );
}
