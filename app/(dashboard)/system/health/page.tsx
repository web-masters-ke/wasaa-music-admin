'use client';
import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import axios from 'axios';

const SERVICES = [
  { name: 'Music service', path: '/health' },
  { name: 'Live streaming provider', path: '/live-events/_diag/provider' },
];

export default function HealthPage() {
  const [checks, setChecks] = useState<Record<string, 'ok' | 'error' | 'loading'>>({});

  useEffect(() => {
    SERVICES.forEach(async s => {
      setChecks(p => ({ ...p, [s.name]: 'loading' }));
      try {
        await axios.get((process.env.NEXT_PUBLIC_API_URL ?? '') + s.path, { timeout: 5000 });
        setChecks(p => ({ ...p, [s.name]: 'ok' }));
      } catch {
        setChecks(p => ({ ...p, [s.name]: 'error' }));
      }
    });
  }, []);

  return (
    <>
      <PageHeader title="Health" subtitle="Live status of backing services." />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SERVICES.map(s => {
          const state = checks[s.name];
          return (
            <Card key={s.name}>
              <CardHeader
                title={s.name}
                subtitle={<span className="font-mono text-[11px]">{s.path}</span>}
                action={
                  state === 'ok' ? <Badge tone="success">healthy</Badge> :
                  state === 'error' ? <Badge tone="destructive">error</Badge> :
                  <Badge tone="warning">checking…</Badge>
                }
              />
              <CardBody className="text-xs text-text-muted">
                {state === 'error' && 'The service did not respond within 5 seconds. Check gateway routing and container status.'}
                {state === 'ok' && 'HTTP 2xx response received.'}
                {state === 'loading' && 'Probing…'}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </>
  );
}
