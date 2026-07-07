'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TextInput } from '@/components/forms';
import { musicAdmin, ConfigEntry, apiError } from '@/lib/api';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function ConfigPage() {
  const [items, setItems] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try { const c = await musicAdmin.getConfig(); setItems(c); }
      catch (err) { toast.error(apiError(err).message); }
      finally { setLoading(false); }
    })();
  }, []);

  const save = async () => {
    if (Object.keys(edits).length === 0) return;
    setSaving(true);
    try {
      await musicAdmin.updateConfig(edits);
      toast.success('Config saved');
      setEdits({});
      const fresh = await musicAdmin.getConfig();
      setItems(fresh);
    } catch (err) { toast.error(apiError(err).message); }
    finally { setSaving(false); }
  };

  return (
    <RequireRole allow={['super_admin','music_admin']}>
      <PageHeader
        title="Config"
        subtitle="Platform configuration values."
        actions={
          <RequireRole allow={['super_admin']}>
            <Button loading={saving} onClick={save} disabled={Object.keys(edits).length === 0}>
              Save {Object.keys(edits).length > 0 ? `(${Object.keys(edits).length})` : ''}
            </Button>
          </RequireRole>
        }
      />
      <Card>
        <CardHeader title={`${items.length} config entries`} />
        <CardBody className="!p-0">
          {loading ? (
            <div className="p-5 space-y-2">{Array.from({length:6}).map((_,i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map(c => (
                <li key={c.key} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-mono font-semibold text-text">{c.key}</p>
                    {c.description && <p className="text-[11px] text-text-muted">{c.description}</p>}
                  </div>
                  <div className="w-64">
                    <TextInput
                      defaultValue={typeof c.value === 'object' ? JSON.stringify(c.value) : String(c.value ?? '')}
                      onChange={e => setEdits(prev => ({ ...prev, [c.key]: e.target.value }))}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </RequireRole>
  );
}
