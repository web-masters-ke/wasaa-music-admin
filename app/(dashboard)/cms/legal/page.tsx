'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, RefreshCcw, ShieldCheck } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Tabs from '@/components/ui/Tabs';
import {
  FormSection, FormGrid, FormRow, TextInput, Select, RichTextEditor, DatePicker,
} from '@/components/forms';
import { RequireRole } from '@/lib/auth';
import { musicAdmin, LegalDocument, apiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { fmtDate, cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const SLUGS = ['tos', 'community-guidelines', 'artist-agreement', 'privacy-policy', 'support-faq', 'copyright-policy'] as const;
const LOCALES = ['en', 'sw', 'fr', 'pt', 'ar'];

interface LegalForm {
  slug: string;
  title: string;
  contentMarkdown: string;
  locale: string;
  effectiveDate: string;
  notes: string;
}
const EMPTY: LegalForm = { slug: SLUGS[0], title: '', contentMarkdown: '', locale: 'en', effectiveDate: '', notes: '' };

export default function LegalPage() {
  const { hasRole } = useAuth();
  const canPublish = hasRole(['super_admin']);
  const [rows, setRows] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>(SLUGS[0]);
  const [form, setForm] = useState<LegalForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [locale, setLocale] = useState('en');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await musicAdmin.listLegal();
      setRows(data);
    } catch (err) {
      toast.error(apiError(err).message);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const versions = useMemo(
    () => rows.filter(r => r.slug === tab).sort((a, b) => (b.version ?? 0) - (a.version ?? 0)),
    [rows, tab],
  );
  const current = versions.find(v => v.locale === locale && v.isCurrent) ?? versions.find(v => v.locale === locale) ?? versions[0];

  useEffect(() => {
    if (current) {
      setForm({
        slug: tab,
        title: current.title ?? '',
        contentMarkdown: current.contentMarkdown ?? '',
        locale: current.locale ?? 'en',
        effectiveDate: current.effectiveDate ? current.effectiveDate.slice(0, 10) : '',
        notes: '',
      });
    } else {
      setForm({ ...EMPTY, slug: tab, locale });
    }
    // Deliberately not depending on `form` so we don't overwrite while user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, locale, current?.id]);

  const publish = async () => {
    if (!canPublish) { toast.error('Only super_admin can publish new versions.'); return; }
    if (!form.title || !form.contentMarkdown) { toast.error('Title and content are required.'); return; }
    setSaving(true);
    try {
      await musicAdmin.publishLegal(form.slug, {
        title: form.title,
        contentMarkdown: form.contentMarkdown,
        locale: form.locale,
      });
      toast.success(`${form.slug} v${(current?.version ?? 0) + 1} published`);
      load();
    } catch (e) { toast.error(apiError(e).message); }
    finally { setSaving(false); }
  };

  return (
    <RequireRole allow={['music_admin','super_admin','admin','compliance_officer']}>
      <PageHeader
        title="Copy & Legal"
        subtitle="Versioned legal documents — TOS, community guidelines, artist agreement, FAQ."
        actions={<Button variant="secondary" size="sm" onClick={() => load()}><RefreshCcw size={13} /> Refresh</Button>}
      />

      <Tabs
        tabs={SLUGS.map(s => ({ id: s, label: s }))}
        active={tab}
        onChange={setTab}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader
            title={`${tab} · v${(current?.version ?? 0) || '—'}`}
            subtitle={current ? (
              <span className="flex items-center gap-2">
                <Badge tone={current.isCurrent ? 'success' : 'muted'}>{current.isCurrent ? 'current' : 'draft'}</Badge>
                <span>Published {fmtDate(current.publishedAt)}</span>
                {current.publishedBy && <span>· by <span className="font-mono">{current.publishedBy.slice(0, 8)}</span></span>}
              </span>
            ) : 'No versions published yet in this locale.'}
            action={
              <div className="flex items-center gap-1 bg-surface-2 border border-border rounded-lg p-1">
                {LOCALES.map(l => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={cn(
                      'h-7 px-2 rounded-md text-[11px] font-semibold',
                      locale === l ? 'bg-brick text-white' : 'text-text-muted hover:text-text',
                    )}
                  >{l}</button>
                ))}
              </div>
            }
          />
          <CardBody>
            {loading ? <div className="skeleton h-96 w-full" /> : (
              <FormSection title="Content">
                <FormGrid cols={2}>
                  <FormRow label="Slug (fixed)"><TextInput value={form.slug} disabled /></FormRow>
                  <FormRow label="Locale"><Select value={form.locale} onChange={e => setForm({ ...form, locale: e.target.value })} options={LOCALES.map(v => ({ value: v, label: v }))} /></FormRow>
                  <FormRow label="Document title" required><TextInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></FormRow>
                  <FormRow label="Effective date"><DatePicker value={form.effectiveDate} onChange={v => setForm({ ...form, effectiveDate: v })} /></FormRow>
                </FormGrid>
                <FormRow label="Markdown content" required hint="Rich text supported">
                  <RichTextEditor
                    value={form.contentMarkdown}
                    onChange={v => setForm({ ...form, contentMarkdown: v })}
                    placeholder="Enter the legal document body…"
                  />
                </FormRow>
                <FormRow label="Publisher (readonly)"><TextInput value={current?.publishedBy ?? '—'} disabled /></FormRow>
                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button variant="secondary" onClick={() => setForm({ ...EMPTY, slug: tab, locale })}>Reset</Button>
                  <Button onClick={publish} loading={saving} disabled={!canPublish}>
                    <ShieldCheck size={13} /> Publish new version{canPublish ? '' : ' (super_admin only)'}
                  </Button>
                </div>
              </FormSection>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Version history" subtitle={`Locale: ${locale}`} />
          <CardBody className="!p-0">
            {versions.filter(v => v.locale === locale).length === 0 ? (
              <p className="p-5 text-xs text-text-muted">No versions in this locale yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {versions.filter(v => v.locale === locale).map(v => (
                  <li key={v.id} className={cn('px-5 py-3 flex items-center gap-3', v.id === current?.id && 'bg-brick/5')}>
                    <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center">
                      {v.isCurrent ? <ShieldCheck size={13} className="text-success" /> : <History size={13} className="text-text-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text">v{v.version}</p>
                      <p className="text-[11px] text-text-muted">{fmtDate(v.publishedAt, true)}</p>
                    </div>
                    {v.isCurrent && <Badge tone="success">current</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </RequireRole>
  );
}
