'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { musicAdmin, Genre, apiError } from '@/lib/api';
import { RequireRole } from '@/lib/auth';
import { TextInput } from '@/components/forms';
import toast from 'react-hot-toast';
import Badge from '@/components/ui/Badge';

export default function GenresPage() {
  const [items, setItems] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { const g = await musicAdmin.listGenres(); setItems(g); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try { await musicAdmin.createGenre({ name, slug: name.toLowerCase().replace(/\s+/g,'-') }); setName(''); toast.success('Genre created'); load(); }
    catch (err) { toast.error(apiError(err).message); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Genre Curation" subtitle="Genres appearing across catalog filters and discovery." />
      <RequireRole allow={['super_admin','music_admin','admin']}>
        <Card className="mb-4">
          <CardHeader title="New genre" />
          <CardBody className="flex gap-2">
            <TextInput value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Amapiano" />
            <Button loading={busy} onClick={create}>Create</Button>
          </CardBody>
        </Card>
      </RequireRole>
      <Card>
        <CardHeader title={`Genres (${items.length})`} />
        <CardBody className="!p-0">
          {loading ? (
            <div className="p-5 space-y-2">{Array.from({length:5}).map((_,i) => <div key={i} className="skeleton h-8 w-full" />)}</div>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-text-muted">No genres yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(g => (
                <li key={g.id} className="px-5 py-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">{g.name}</span>
                  <div className="flex items-center gap-2">
                    {!g.active && <Badge tone="muted">inactive</Badge>}
                    <span className="text-[11px] text-text-muted">{g.slug ?? '—'}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
