'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  FormSection, FormGrid, FormRow, FormFooter, TextInput, TextArea, Select,
  ChipInput, DateTimePicker, MultiSelect, CountriesMultiSelect, SubForm, Slider, Toggle,
} from '@/components/forms';
import { musicAdmin, AdCampaign, AdCreative, apiError } from '@/lib/api';
import { RequireRole } from '@/lib/auth';
import toast from 'react-hot-toast';

interface UtmParam { key: string; value: string }
interface Targeting { dimension: string; value: string }

type FormShape = {
  name: string; advertiserName: string; campaignType: string;
  creativeIds: string[]; budgetTotal: number; budgetDaily: number;
  bidStrategy: string; bidAmount: number; currency: string;
  startDate: string; endDate: string;
  frequencyImpressionsPerUser: number; frequencyResetWindow: string;
  status: string; priority: number; landingUrl: string; trackingPixels: string[];
  utmParams: UtmParam[]; a11yText: string; notes: string;
  targeting: Targeting[]; countries: string[]; demographics: string[]; genreAffinity: string[];
  deviceType: string[]; timeOfDay: string[]; dayOfWeek: string[]; languages: string[];
  autoOptimize: boolean;
};

const EMPTY: FormShape = {
  name: '', advertiserName: '', campaignType: 'audio',
  creativeIds: [], budgetTotal: 0, budgetDaily: 0,
  bidStrategy: 'CPM', bidAmount: 0, currency: 'KES',
  startDate: '', endDate: '',
  frequencyImpressionsPerUser: 3, frequencyResetWindow: '24h',
  status: 'draft', priority: 5, landingUrl: '', trackingPixels: [],
  utmParams: [], a11yText: '', notes: '',
  targeting: [], countries: [], demographics: [], genreAffinity: [],
  deviceType: [], timeOfDay: [], dayOfWeek: [], languages: [], autoOptimize: false,
};

function toDateTimeLocal(iso?: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

export default function AdCampaignFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = !params?.id || params.id === 'new';
  const [f, setF] = useState<FormShape>(EMPTY);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const upd = <K extends keyof FormShape>(k: K, v: FormShape[K]) => { setF(p => ({ ...p, [k]: v })); setDirty(true); };

  // Load existing campaign + creatives for the creative-ids picker
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [c] = await Promise.all([
          musicAdmin.listAdCreatives({ limit: 200 }).then(r => r.items).catch(() => []),
        ]);
        if (!cancelled) setCreatives(c);
      } catch { /* silent */ }
      if (isNew) return;
      try {
        const cmp = await musicAdmin.getAdCampaign(params.id);
        if (cancelled) return;
        setCampaign(cmp);
        // Warm the form
        setF({
          ...EMPTY,
          name: cmp.name ?? '',
          advertiserName: cmp.advertiserName ?? '',
          campaignType: cmp.campaignType ?? 'audio',
          creativeIds: (cmp.creatives ?? []).map(cr => cr.id),
          budgetTotal: Number(cmp.budgetTotal ?? 0),
          budgetDaily: Number(cmp.budgetDaily ?? 0),
          bidStrategy: cmp.bidStrategy ?? 'CPM',
          bidAmount: Number(cmp.bidAmount ?? 0),
          currency: cmp.currency ?? 'KES',
          startDate: toDateTimeLocal(cmp.startDate),
          endDate: toDateTimeLocal(cmp.endDate),
          status: cmp.status ?? 'draft',
          priority: Number(cmp.priority ?? 5),
          landingUrl: cmp.landingUrl ?? '',
          a11yText: cmp.a11yText ?? '',
          notes: cmp.notes ?? '',
        });
      } catch (err) {
        toast.error(apiError(err).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params?.id]);

  const submit = async () => {
    if (!f.name) { toast.error('Campaign name is required.'); return; }
    setSaving(true);
    try {
      const body: Partial<AdCampaign> & Record<string, unknown> = {
        name: f.name,
        advertiserName: f.advertiserName || undefined,
        campaignType: f.campaignType as AdCampaign['campaignType'],
        status: f.status as AdCampaign['status'],
        budgetTotal: f.budgetTotal,
        budgetDaily: f.budgetDaily,
        currency: f.currency,
        bidStrategy: f.bidStrategy as AdCampaign['bidStrategy'],
        bidAmount: f.bidAmount,
        priority: f.priority,
        startDate: f.startDate || undefined,
        endDate: f.endDate || undefined,
        landingUrl: f.landingUrl || undefined,
        trackingPixels: f.trackingPixels.length ? JSON.stringify(f.trackingPixels) : undefined,
        utmParams: f.utmParams.length ? JSON.stringify(Object.fromEntries(f.utmParams.map(u => [u.key, u.value]))) : undefined,
        a11yText: f.a11yText || undefined,
        notes: f.notes || undefined,
      };
      if (isNew) {
        const created = await musicAdmin.createAdCampaign(body);
        toast.success('Campaign created');
        // Persist any inline targeting rules the user added
        for (const t of f.targeting) {
          if (t.dimension && t.value) {
            await musicAdmin.createAdTargeting({ campaignId: created.id, dimension: t.dimension as never, value: t.value, operator: 'in' }).catch(() => null);
          }
        }
        // Frequency cap
        if (f.frequencyImpressionsPerUser > 0) {
          await musicAdmin.upsertAdFrequency({
            campaignId: created.id,
            impressionsPerUser: f.frequencyImpressionsPerUser,
            resetWindow: f.frequencyResetWindow,
          }).catch(() => null);
        }
        router.push(`/ads/campaigns/${created.id}`);
      } else {
        await musicAdmin.updateAdCampaign(params.id, body);
        toast.success('Campaign saved');
        setDirty(false);
      }
    } catch (err) {
      toast.error(apiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const creativeOptions = useMemo(
    () => creatives.map(c => ({ value: c.id, label: c.altText ?? c.objectKey ?? c.id.slice(0, 8) })),
    [creatives],
  );

  return (
    <RequireRole allow={['music_admin','super_admin','admin']}>
      <PageHeader
        title={isNew ? 'New ad campaign' : (campaign?.name ?? 'Ad campaign')}
        subtitle={
          isNew
            ? 'Configure identity, budget, schedule, targeting, tracking, and go-live status.'
            : <span className="flex items-center gap-2">
                {campaign?.status && <Badge tone={campaign.status === 'active' ? 'success' : campaign.status === 'rejected' ? 'destructive' : 'muted'}>{campaign.status}</Badge>}
                {campaign?.advertiserName && <span>· {campaign.advertiserName}</span>}
              </span>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-32 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4 pb-32">
          <FormSection title="Campaign identity" description="Human-visible name + which advertiser owns this booking.">
            <FormGrid cols={2}>
              <FormRow label="Campaign name" required><TextInput value={f.name} onChange={e => upd('name', e.target.value)} /></FormRow>
              <FormRow label="Advertiser name"><TextInput value={f.advertiserName} onChange={e => upd('advertiserName', e.target.value)} /></FormRow>
              <FormRow label="Type" required>
                <Select value={f.campaignType} onChange={e => upd('campaignType', e.target.value)}
                  options={['display','audio','video','native'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Landing URL"><TextInput value={f.landingUrl} onChange={e => upd('landingUrl', e.target.value)} placeholder="https://…" /></FormRow>
            </FormGrid>
            <FormRow label="Creatives">
              <MultiSelect value={f.creativeIds} onChange={v => upd('creativeIds', v)} options={creativeOptions} placeholder="Attach creatives…" />
            </FormRow>
          </FormSection>

          <FormSection title="Budget & bidding">
            <FormGrid cols={4}>
              <FormRow label="Total budget"><TextInput type="number" value={f.budgetTotal} onChange={e => upd('budgetTotal', Number(e.target.value))} /></FormRow>
              <FormRow label="Daily budget"><TextInput type="number" value={f.budgetDaily} onChange={e => upd('budgetDaily', Number(e.target.value))} /></FormRow>
              <FormRow label="Bid strategy">
                <Select value={f.bidStrategy} onChange={e => upd('bidStrategy', e.target.value)}
                  options={['CPM','CPC','CPA','flat_rate'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Bid amount"><TextInput type="number" value={f.bidAmount} onChange={e => upd('bidAmount', Number(e.target.value))} /></FormRow>
            </FormGrid>
            <FormGrid cols={2}>
              <FormRow label="Currency"><TextInput value={f.currency} onChange={e => upd('currency', e.target.value)} /></FormRow>
              <FormRow label="Priority (higher = wins tie-break)"><Slider value={f.priority} onChange={v => upd('priority', v)} min={1} max={10} /></FormRow>
            </FormGrid>
            <Toggle label="Auto-optimize bid" description="Adjust bid amount hourly toward CPA/CTR target." checked={f.autoOptimize} onChange={v => upd('autoOptimize', v)} />
          </FormSection>

          <FormSection title="Schedule">
            <FormGrid cols={2}>
              <FormRow label="Start"><DateTimePicker value={f.startDate} onChange={v => upd('startDate', v)} /></FormRow>
              <FormRow label="End"><DateTimePicker value={f.endDate} onChange={v => upd('endDate', v)} /></FormRow>
            </FormGrid>
          </FormSection>

          <FormSection title="Targeting">
            <FormRow label="Countries"><CountriesMultiSelect value={f.countries} onChange={v => upd('countries', v)} /></FormRow>
            <FormGrid cols={2}>
              <FormRow label="Age bands">
                <MultiSelect value={f.demographics} onChange={v => upd('demographics', v)}
                  options={['13-17','18-24','25-34','35-44','45-54','55+'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Genre affinity">
                <MultiSelect value={f.genreAffinity} onChange={v => upd('genreAffinity', v)}
                  options={['afrobeat','hiphop','gospel','rnb','bongo','reggae','dancehall','pop','rock','electronic'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Device type">
                <MultiSelect value={f.deviceType} onChange={v => upd('deviceType', v)}
                  options={['mobile','tablet','desktop','tv','wearable'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Languages">
                <MultiSelect value={f.languages} onChange={v => upd('languages', v)}
                  options={['en','sw','fr','pt','ar','yo','zu'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Time of day">
                <MultiSelect value={f.timeOfDay} onChange={v => upd('timeOfDay', v)}
                  options={['morning','afternoon','evening','night'].map(v => ({ value: v, label: v }))} />
              </FormRow>
              <FormRow label="Day of week">
                <MultiSelect value={f.dayOfWeek} onChange={v => upd('dayOfWeek', v)}
                  options={['mon','tue','wed','thu','fri','sat','sun'].map(v => ({ value: v, label: v }))} />
              </FormRow>
            </FormGrid>
            <FormRow label="Custom targeting rules">
              <SubForm<Targeting>
                items={f.targeting}
                onChange={v => upd('targeting', v)}
                addLabel="Add rule"
                factory={() => ({ dimension: 'context', value: '' })}
                renderRow={(t, _i, up) => (
                  <FormGrid cols={2}>
                    <Select value={t.dimension} onChange={e => up({ dimension: e.target.value } as Partial<Targeting>)}
                      options={['region','demographic','device','context','listening_history'].map(v => ({ value: v, label: v }))} />
                    <TextInput placeholder="e.g. genre:afrobeat" value={t.value} onChange={e => up({ value: e.target.value } as Partial<Targeting>)} />
                  </FormGrid>
                )}
              />
            </FormRow>
          </FormSection>

          <FormSection title="Frequency cap">
            <FormGrid cols={2}>
              <FormRow label="Impressions per user">
                <TextInput type="number" value={f.frequencyImpressionsPerUser} onChange={e => upd('frequencyImpressionsPerUser', Number(e.target.value))} />
              </FormRow>
              <FormRow label="Reset window">
                <Select value={f.frequencyResetWindow} onChange={e => upd('frequencyResetWindow', e.target.value)}
                  options={['1h','6h','24h','7d','30d'].map(v => ({ value: v, label: v }))} />
              </FormRow>
            </FormGrid>
          </FormSection>

          <FormSection title="Tracking & compliance">
            <FormRow label="Tracking pixels"><ChipInput value={f.trackingPixels} onChange={v => upd('trackingPixels', v)} placeholder="Paste URL and press Enter" /></FormRow>
            <FormRow label="UTM parameters">
              <SubForm<UtmParam>
                items={f.utmParams}
                onChange={v => upd('utmParams', v)}
                addLabel="Add UTM"
                factory={() => ({ key: '', value: '' })}
                renderRow={(u, _i, up) => (
                  <FormGrid cols={2}>
                    <TextInput placeholder="utm_source" value={u.key} onChange={e => up({ key: e.target.value } as Partial<UtmParam>)} />
                    <TextInput placeholder="wasaa_music" value={u.value} onChange={e => up({ value: e.target.value } as Partial<UtmParam>)} />
                  </FormGrid>
                )}
              />
            </FormRow>
            <FormRow label="Accessibility fallback text"><TextArea rows={2} value={f.a11yText} onChange={e => upd('a11yText', e.target.value)} /></FormRow>
            <FormRow label="Internal notes"><TextArea rows={2} value={f.notes} onChange={e => upd('notes', e.target.value)} /></FormRow>
          </FormSection>

          <FormSection title="Publish">
            <FormRow label="Status">
              <Select value={f.status} onChange={e => upd('status', e.target.value)}
                options={['draft','pending_approval','approved','active','paused','rejected','completed','archived'].map(v => ({ value: v, label: v }))} />
            </FormRow>
          </FormSection>

          {!isNew && (
            <FormSection title="Danger zone" description="Actions that cannot be undone.">
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-destructive">Archive campaign</p>
                  <p className="text-[11px] text-text-muted">Sets status to `archived`. Existing impressions are preserved.</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Archive this campaign?')) return;
                    await musicAdmin.updateAdCampaign(params.id, { status: 'archived' });
                    toast.success('Archived');
                    router.push('/ads/campaigns');
                  }}
                >
                  Archive
                </Button>
              </div>
            </FormSection>
          )}
        </div>
      )}
      <FormFooter
        onCancel={() => router.back()}
        onSubmit={submit}
        submitLabel={isNew ? 'Create campaign' : 'Save changes'}
        busy={saving}
        dirty={dirty}
      />
    </RequireRole>
  );
}
