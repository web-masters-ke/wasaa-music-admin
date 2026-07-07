import clsx, { ClassValue } from 'clsx';

export const cn = (...inputs: ClassValue[]) => clsx(...inputs);

export function initials(first?: string, last?: string): string {
  const a = first?.trim()?.[0] ?? '';
  const b = last?.trim()?.[0] ?? '';
  return (a + b).toUpperCase();
}

export function fmtDate(v?: string | Date | null, withTime = false): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '—';
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' };
  return d.toLocaleDateString('en-GB', opts);
}

export function fmtCurrency(amount: number | string | null | undefined, currency = 'KES'): string {
  const n = Number(amount ?? 0);
  if (Number.isNaN(n)) return `${currency} 0.00`;
  try {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency, maximumFractionDigits: 2 })
      .format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function fmtNumber(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (Number.isNaN(v)) return '0';
  return new Intl.NumberFormat('en-US').format(v);
}

export function fmtDuration(seconds: number | null | undefined): string {
  const s = Number(seconds ?? 0);
  if (!s || Number.isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}

export function humanRelative(v?: string | Date | null): string {
  if (!v) return '—';
  const d = typeof v === 'string' ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60)     return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60)     return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)      return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30)     return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12)      return `${mo}mo ago`;
  const yr = Math.floor(mo / 12);
  return `${yr}y ago`;
}

/** Set a lightweight cookie readable by middleware (non-httpOnly by necessity). */
export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const exp = new Date();
  exp.setDate(exp.getDate() + days);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp.toUTCString()}; path=/; SameSite=Lax`;
}
export function delCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/** Base64URL decode (JWT payload). Returns null on failure. */
export function decodeJwt<T = Record<string, unknown>>(token: string | null): T | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const p = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = p.length % 4 === 0 ? p : p + '='.repeat(4 - (p.length % 4));
    const decoded = typeof atob === 'function' ? atob(pad) : Buffer.from(pad, 'base64').toString();
    return JSON.parse(decoded) as T;
  } catch {
    return null;
  }
}

export function statusPillClass(status: string | undefined | null): string {
  const s = (status ?? '').toLowerCase();
  if (['approved', 'active', 'verified', 'live', 'paid', 'completed', 'success'].includes(s))
    return 'bg-success/10 text-success border-success/20';
  if (['pending', 'pending_approval', 'pending_review', 'reserved', 'scheduled', 'processing'].includes(s))
    return 'bg-warning/10 text-warning border-warning/20';
  if (['rejected', 'suspended', 'banned', 'cancelled', 'failed', 'refunded', 'removed'].includes(s))
    return 'bg-destructive/10 text-destructive border-destructive/20';
  if (['draft', 'archived', 'paused', 'ended', 'used'].includes(s))
    return 'bg-text-muted/10 text-text-muted border-text-muted/20';
  return 'bg-brick/10 text-brick border-brick/20';
}
