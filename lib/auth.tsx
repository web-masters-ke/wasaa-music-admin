'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { identityApi, AdminUserPayload, apiError } from './api';
import { setCookie, delCookie, decodeJwt } from './utils';

const TOKEN_KEY   = 'wasaa_music_admin_token';
const USER_KEY    = 'wasaa_music_admin_user';
const ROLE_COOKIE = 'wasaa_music_admin_role';

export type AdminRole =
  | 'super_admin'
  | 'music_admin'
  | 'admin'
  | 'finance_admin'
  | 'content_moderator'
  | 'support_agent'
  | 'artist_manager'
  | 'label_manager'
  | 'compliance_officer'
  | 'analytics_admin';

export const ADMIN_ROLES: AdminRole[] = [
  'super_admin', 'music_admin', 'admin', 'finance_admin', 'content_moderator',
  'support_agent', 'artist_manager', 'label_manager', 'compliance_officer', 'analytics_admin',
];

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin:        'Super Admin',
  music_admin:        'Music Admin',
  admin:              'Admin',
  finance_admin:      'Finance Admin',
  content_moderator:  'Content Moderator',
  support_agent:      'Support Agent',
  artist_manager:     'Artist Manager',
  label_manager:      'Label Manager',
  compliance_officer: 'Compliance Officer',
  analytics_admin:    'Analytics Admin',
};

export interface AdminUser extends AdminUserPayload {
  roles: AdminRole[];
}

interface AuthCtx {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<string | null>;
  /** Dev-only shortcut: mint a synthetic session for a chosen role. Never
   *  emitted in production builds — the login page hides the UI too. */
  loginAsRole: (role: AdminRole) => void;
  logout: () => void;
  hasRole: (r: AdminRole | AdminRole[]) => boolean;
  roleLabel: (r?: string) => string;
}

const Ctx = createContext<AuthCtx | null>(null);

function normaliseRoles(u: AdminUserPayload | null, token: string | null): AdminRole[] {
  if (!u) return [];
  const raw = [
    ...(Array.isArray(u.roles) ? u.roles : []),
    ...(u.role ? [u.role] : []),
  ];
  const claims = decodeJwt<{ roles?: string[]; role?: string; permissions?: string[] }>(token);
  if (claims?.roles && Array.isArray(claims.roles)) raw.push(...claims.roles);
  if (claims?.role) raw.push(claims.role);
  const norm = new Set<AdminRole>();
  for (const r of raw) {
    const lc = String(r).toLowerCase().replace(/-/g, '_');
    if (ADMIN_ROLES.includes(lc as AdminRole)) norm.add(lc as AdminRole);
    // Common aliases
    if (lc === 'superadmin') norm.add('super_admin');
    if (lc === 'moderator')  norm.add('content_moderator');
    if (lc === 'finance')    norm.add('finance_admin');
    if (lc === 'support')    norm.add('support_agent');
  }
  // Fallback for accounts that only carry a generic ADMIN role
  if (norm.size === 0 && raw.some(r => String(r).toUpperCase().includes('ADMIN'))) {
    norm.add('admin');
  }
  return Array.from(norm);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(USER_KEY) : null;
    if (t && raw) {
      try {
        const parsed = JSON.parse(raw) as AdminUserPayload;
        const roles = normaliseRoles(parsed, t);
        setUser({ ...parsed, roles });
        setToken(t);
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<string | null> => {
    try {
      const { accessToken, user: u } = await identityApi.login(identifier, password);
      if (!accessToken) return 'No access token returned by identity service.';
      const roles = normaliseRoles(u, accessToken);
      if (roles.length === 0) return 'Access denied — this account has no admin role.';
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      setCookie(ROLE_COOKIE, roles.join(','), 7);
      setToken(accessToken);
      setUser({ ...u, roles });
      return null;
    } catch (err) {
      const e = apiError(err);
      if (e.status === 401) return 'Wrong email or password';
      return e.message || 'Login failed';
    }
  }, []);

  const loginAsRole = useCallback((role: AdminRole) => {
    // Dev-only bypass. Fabricates a session for the picked role. Backend
    // calls will still 401 because the token is not real — but the UI
    // gating, sidebar, and route guards can be exercised end-to-end.
    if (process.env.NODE_ENV === 'production') return;
    const fake: AdminUserPayload = {
      id: `dev-${role}`,
      email: `${role}@wasaa.dev`,
      firstName: 'Dev',
      lastName: ROLE_LABELS[role],
      roles: [role],
    } as AdminUserPayload;
    // Header.payload.signature — signature is a placeholder, payload has role.
    const payload = { sub: fake.id, roles: [role], role, exp: Math.floor(Date.now() / 1000) + 3600 };
    const b64 = (o: unknown) =>
      typeof window === 'undefined'
        ? Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
        : btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const devToken = `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.dev`;
    localStorage.setItem(TOKEN_KEY, devToken);
    localStorage.setItem(USER_KEY, JSON.stringify(fake));
    setCookie(ROLE_COOKIE, role, 7);
    setToken(devToken);
    setUser({ ...fake, roles: [role] });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    delCookie(ROLE_COOKIE);
    setUser(null);
    setToken(null);
    if (typeof window !== 'undefined') window.location.href = '/login';
  }, []);

  const hasRole = useCallback((r: AdminRole | AdminRole[]): boolean => {
    if (!user) return false;
    if (user.roles.includes('super_admin')) return true;
    const wanted = Array.isArray(r) ? r : [r];
    return wanted.some(x => user.roles.includes(x));
  }, [user]);

  const roleLabel = useCallback((r?: string) => {
    if (!r) return '';
    return ROLE_LABELS[r as AdminRole] ?? r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }, []);

  return (
    <Ctx.Provider value={{ user, token, loading, login, loginAsRole, logout, hasRole, roleLabel }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export function RequireRole(
  { allow, children, fallback = null }:
  { allow: AdminRole[]; children: ReactNode; fallback?: ReactNode }
) {
  const { hasRole, loading } = useAuth();
  if (loading) return null;
  if (!hasRole(allow)) return <>{fallback}</>;
  return <>{children}</>;
}
