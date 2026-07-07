import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const IDENTITY = process.env.NEXT_PUBLIC_IDENTITY_URL ?? BASE;

/* --------------------------------------------------------------------------
 * Axios instance
 * -------------------------------------------------------------------------- */

function createClient(): AxiosInstance {
  const client = axios.create({ baseURL: BASE, timeout: 30_000 });
  client.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('wasaa_music_admin_token');
      if (t) config.headers.Authorization = `Bearer ${t}`;
    }
    return config;
  });
  client.interceptors.response.use(
    (res) => res,
    (err: AxiosError) => {
      const url = (err.config?.url ?? '') as string;
      const isAuthEndpoint = url.includes('/auth/');
      if (err.response?.status === 401 && typeof window !== 'undefined' && !isAuthEndpoint) {
        localStorage.removeItem('wasaa_music_admin_token');
        localStorage.removeItem('wasaa_music_admin_user');
        document.cookie = 'wasaa_music_admin_role=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
      return Promise.reject(err);
    },
  );
  return client;
}

export const api = createClient();

/* --------------------------------------------------------------------------
 * Envelope handling: BED v2 §5.3 canonical shape
 *   Success: { success: true,  data: <T>,       meta?: { requestId } }
 *   Error:   { success: false, error: { code, message, details }, meta: { requestId } }
 * The music-service admin endpoints in production often return single-key
 * variants like { success, event: {...} } or { success, artist: {...} } —
 * unwrap handles both.
 * -------------------------------------------------------------------------- */

const SINGLE_KEYS = [
  'token', 'user', 'event', 'ticket', 'artist', 'track', 'album', 'playlist',
  'tip', 'message', 'dashboard', 'oversight', 'queue', 'strikes', 'campaign',
  'creative', 'banner', 'setting', 'report', 'appeal', 'payout', 'royalty',
  'plan', 'subscription', 'label', 'promotion', 'genre', 'takedown', 'config',
  'targeting', 'frequency', 'trending', 'legal', 'adminUser',
  'analytics', 'ad', 'rule', 'cap',
] as const;

/**
 * Extract a numeric time-series from whatever shape an analytics endpoint
 * returns. Recognises common backend variants: `series`, `daily`, `byDay`,
 * `timeSeries`, `data`, etc. Row keys are similarly flexible.
 */
export function pickTimeSeries(o: unknown, keys?: string[]): Array<{ date: string; count: number }> {
  if (!o || typeof o !== 'object') return [];
  const r = o as Record<string, unknown>;
  const search = keys ?? ['series', 'daily', 'byDay', 'timeSeries', 'streamsDaily', 'data'];
  for (const k of search) {
    const v = r[k];
    if (Array.isArray(v)) {
      return v.map((row: Record<string, unknown>) => ({
        date: String(row.date ?? row.label ?? row.day ?? row.hour ?? row.bucket ?? ''),
        count: Number(row.count ?? row.value ?? row.total ?? row.streams ?? row.n ?? 0),
      })).filter(x => x.date);
    }
  }
  return [];
}

/**
 * Backend track rows use `playCount`, `coverUrl`, `explicitContent` — the
 * admin UI expects `streamCount`, `coverImageUrl`, `explicit`. Normalise so
 * downstream code stays field-stable.
 */
function normalizeTrack<T>(t: T): T {
  if (!t || typeof t !== 'object') return t;
  const tt = t as unknown as Record<string, unknown>;
  if (tt.streamCount == null && tt.playCount != null) tt.streamCount = tt.playCount;
  if (tt.coverImageUrl == null && tt.coverUrl != null) tt.coverImageUrl = tt.coverUrl;
  if (tt.explicit == null && tt.explicitContent != null) tt.explicit = tt.explicitContent;
  if (tt.thumbnailImageUrl == null && tt.coverUrlThumbnail != null) tt.thumbnailImageUrl = tt.coverUrlThumbnail;
  return t;
}
function normalizeTracks<T>(input: T): T {
  if (Array.isArray(input)) { input.forEach(x => normalizeTrack(x)); return input; }
  if (input && typeof input === 'object' && Array.isArray((input as unknown as { items?: unknown[] }).items)) {
    (input as unknown as { items: unknown[] }).items.forEach(x => normalizeTrack(x));
  }
  return input;
}

/**
 * Backend playlist rows return `coverUrl` (S3 direct), UI reads `coverImageUrl`.
 */
function normalizePlaylist<T>(p: T): T {
  if (!p || typeof p !== 'object') return p;
  const pp = p as unknown as Record<string, unknown>;
  if (pp.coverImageUrl == null && pp.coverUrl != null) pp.coverImageUrl = pp.coverUrl;
  return p;
}
function normalizePlaylists<T>(input: T): T {
  if (Array.isArray(input)) { input.forEach(x => normalizePlaylist(x)); return input; }
  if (input && typeof input === 'object' && Array.isArray((input as unknown as { items?: unknown[] }).items)) {
    (input as unknown as { items: unknown[] }).items.forEach(x => normalizePlaylist(x));
  }
  return input;
}

/**
 * Backend live-event rows return `coverUrl` (S3 direct), UI reads `coverImageUrl`.
 */
function normalizeLiveEvent<T>(e: T): T {
  if (!e || typeof e !== 'object') return e;
  const ee = e as unknown as Record<string, unknown>;
  if (ee.coverImageUrl == null && ee.coverUrl != null) ee.coverImageUrl = ee.coverUrl;
  if (ee.scheduledStart == null && ee.scheduledAt != null) ee.scheduledStart = ee.scheduledAt;
  if (ee.viewerCount == null && ee.currentViewers != null) ee.viewerCount = ee.currentViewers;
  return e;
}
function normalizeLiveEvents<T>(input: T): T {
  if (Array.isArray(input)) { input.forEach(x => normalizeLiveEvent(x)); return input; }
  if (input && typeof input === 'object' && Array.isArray((input as unknown as { items?: unknown[] }).items)) {
    (input as unknown as { items: unknown[] }).items.forEach(x => normalizeLiveEvent(x));
  }
  return input;
}

/**
 * Pull an array out of any of the common list-envelope shapes:
 *   [...], { data: [...] }, { items: [...] }, { rows: [...] }, { events: [...] }, etc.
 */
export function pickList<T>(body: unknown, extraKeys: string[] = []): T[] {
  if (!body) return [];
  if (Array.isArray(body)) return body as T[];
  if (typeof body !== 'object') return [];
  const b = body as Record<string, unknown>;
  const d = 'data' in b ? b.data : b;
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === 'object') {
    const dd = d as Record<string, unknown>;
    for (const k of ['data', 'items', 'rows', 'results', ...extraKeys, ...SINGLE_KEYS.map(s => s + 's')]) {
      if (Array.isArray(dd[k])) return dd[k] as T[];
    }
  }
  return [];
}

export function unwrap<T>(res: AxiosResponse): T {
  const body = res.data;
  if (!body || typeof body !== 'object') return body as T;
  if ('data' in body) return (body as { data: T }).data;
  for (const k of SINGLE_KEYS) {
    if (k in body) return (body as Record<string, unknown>)[k] as T;
  }
  return body as T;
}

export function unwrapList<T>(res: AxiosResponse): T[] {
  const body = res.data;
  if (!body || typeof body !== 'object') return [];
  const d = 'data' in body ? (body as { data: unknown }).data : body;
  if (Array.isArray(d)) return d as T[];
  if (d && typeof d === 'object') {
    if (Array.isArray((d as { data?: unknown }).data)) return (d as { data: T[] }).data;
    if (Array.isArray((d as { items?: unknown }).items)) return (d as { items: T[] }).items;
    if (Array.isArray((d as { rows?: unknown }).rows)) return (d as { rows: T[] }).rows;
    if (Array.isArray((d as { results?: unknown }).results)) return (d as { results: T[] }).results;
    for (const k of SINGLE_KEYS.map(s => s + 's')) {
      if (Array.isArray((d as Record<string, unknown>)[k])) return (d as Record<string, T[]>)[k];
    }
  }
  return [];
}

export function unwrapPaginated<T>(res: AxiosResponse): { items: T[]; total: number; pages: number; page: number } {
  const body = res.data;
  const d = body && typeof body === 'object' && 'data' in body
    ? (body as { data: unknown }).data
    : body;
  let items: T[] = [];
  if (Array.isArray(d)) items = d as T[];
  else if (d && typeof d === 'object') {
    if (Array.isArray((d as { data?: unknown }).data)) items = (d as { data: T[] }).data;
    else if (Array.isArray((d as { items?: unknown }).items)) items = (d as { items: T[] }).items;
    else if (Array.isArray((d as { rows?: unknown }).rows)) items = (d as { rows: T[] }).rows;
    else if (Array.isArray((d as { results?: unknown }).results)) items = (d as { results: T[] }).results;
    else {
      for (const k of SINGLE_KEYS.map(s => s + 's')) {
        if (Array.isArray((d as Record<string, unknown>)[k])) {
          items = (d as Record<string, T[]>)[k];
          break;
        }
      }
    }
  }
  const meta = (d as Record<string, unknown>)?.meta ?? (d as Record<string, unknown>)?.pagination ?? d ?? {};
  const total = Number((meta as Record<string, unknown>).total ?? items.length);
  const pages = Number(
    (meta as Record<string, unknown>).totalPages ??
    (meta as Record<string, unknown>).pages ?? 1,
  );
  const page  = Number((meta as Record<string, unknown>).page ?? 1);
  return { items, total, pages, page };
}

/**
 * Normalise BED error responses.
 * Reads error.code / error.message / meta.requestId — never invents fields.
 */
export function apiError(err: unknown): { code: string; message: string; status: number; requestId?: string } {
  const e = err as AxiosError<{ error?: { code?: string; message?: string; details?: unknown }; message?: string; meta?: { requestId?: string } }>;
  const status = e?.response?.status ?? 0;
  const body = e?.response?.data;
  const code = body?.error?.code ?? (status ? String(status) : 'UNKNOWN');
  const message =
    body?.error?.message ??
    body?.message ??
    e?.message ??
    'Request failed';
  const requestId = body?.meta?.requestId;
  return { code, message, status, requestId };
}

/* --------------------------------------------------------------------------
 * Identity — login goes to wasaa-lifestyle identity endpoint
 * -------------------------------------------------------------------------- */

// Music-service self-contained admin auth. Routes live at
// {BASE}/music/admin/auth/{login,me,change-password} — the identity service
// is NOT involved. See wasaa-music-service/src/routes/admin-auth.routes.ts.
export const identityApi = {
  login: async (identifier: string, password: string): Promise<{ accessToken: string; refreshToken?: string; user: AdminUserPayload }> => {
    const url = `${BASE}/admin/auth/login`;
    const body = { [identifier.includes('@') ? 'email' : 'phoneNumber']: identifier, password };
    const res = await axios.post(url, body, { timeout: 30_000 });
    const d = res.data?.data ?? res.data;
    return {
      accessToken: d?.accessToken ?? d?.token,
      refreshToken: d?.refreshToken,
      user: d?.user ?? d,
    };
  },
  me: () => api.get('/admin/auth/me').then(unwrap<AdminUserPayload>).catch(() => null),

  /**
   * Password-reset request. Falls back to the wasaachat identity service
   * (which admins share) — music-service itself doesn't own reset today.
   *   POST {IDENTITY}/auth/password/reset/request  { email? | phone? }
   *   → { success, data: { verification_id } }
   */
  passwordResetRequest: async (identifier: string): Promise<{ verificationId: string }> => {
    const url = `${IDENTITY}/auth/password/reset/request`;
    const body = identifier.includes('@') ? { email: identifier } : { phone: identifier };
    const res = await axios.post(url, body, { timeout: 30_000 });
    const d = res.data?.data ?? res.data;
    const verificationId = d?.verification_id ?? d?.verificationId ?? d?.id;
    if (!verificationId) throw new Error('No verification id returned');
    return { verificationId };
  },

  /**
   * Confirm password reset with OTP + new password (identity service).
   */
  passwordResetConfirm: async (verificationId: string, otpCode: string, newPassword: string): Promise<void> => {
    const url = `${IDENTITY}/auth/password/reset/confirm`;
    await axios.post(
      url,
      { verification_id: verificationId, otp_code: otpCode, new_password: newPassword },
      { timeout: 30_000 },
    );
  },
};

/* --------------------------------------------------------------------------
 * Admin API surface — wired 1:1 to wasaa-music-service/src/routes/admin.routes.ts
 * -------------------------------------------------------------------------- */

type Params = Record<string, unknown> | undefined;
const g = <T>(url: string, params?: Params) => api.get(url, { params }).then(unwrap<T>);
const gL = <T>(url: string, params?: Params) => api.get(url, { params }).then(unwrapList<T>);
const gP = <T>(url: string, params?: Params) => api.get(url, { params }).then(unwrapPaginated<T>);
const p = <T>(url: string, body?: unknown) => api.post(url, body).then(unwrap<T>);
const pt = <T>(url: string, body?: unknown) => api.patch(url, body).then(unwrap<T>);
const pu = <T>(url: string, body?: unknown) => api.put(url, body).then(unwrap<T>);
const dl = <T>(url: string) => api.delete(url).then(unwrap<T>);

export const musicAdmin = {
  // Dashboard
  dashboard: () => g<DashboardStats>('/admin/dashboard'),
  musicOversight: () => g<Record<string, unknown>>('/admin/music-oversight'),

  // Artists
  listArtists: (params?: Params) => gP<Artist>('/admin/artists', params),
  pendingVerifications: () => gL<VerificationRequest>('/admin/artists/verification-requests'),
  tippedArtists: () => gL<Artist>('/admin/artists/tipped'),
  getArtist: (id: string) => g<Artist>(`/admin/artists/${id}`),
  updateArtistStatus: (id: string, status: string, reason?: string) =>
    pt<Artist>(`/admin/artists/${id}/status`, { status, reason }),
  verifyArtist: (id: string, notes?: string) => p<Artist>(`/admin/artists/${id}/verify`, { notes }),
  rejectVerification: (id: string, reason: string) =>
    p<Artist>(`/admin/artists/${id}/reject-verification`, { reason }),
  artistStrikes: (id: string) => gL<Strike>(`/admin/artists/${id}/strikes`),
  issueStrike: (id: string, body: { reason: string; severity?: string; expiresAt?: string }) =>
    p<Strike>(`/admin/artists/${id}/strikes`, body),
  revokeStrike: (artistId: string, strikeId: string) =>
    dl<{ id: string }>(`/admin/artists/${artistId}/strikes/${strikeId}`),

  // Tracks
  listTracks: (params?: Params) => gP<Track>('/admin/tracks', params).then(normalizeTracks),
  tippedTracks: () => gL<Track>('/admin/tracks/tipped').then(normalizeTracks),
  getTrack: (id: string) => g<Track>(`/admin/tracks/${id}`).then(normalizeTrack),
  updateTrackStatus: (id: string, status: string, reason?: string) =>
    pt<Track>(`/admin/tracks/${id}/status`, { status, reason }),
  restoreTrack: (id: string) => p<Track>(`/admin/tracks/${id}/restore`),
  moderationQueue: (params?: Params) =>
    api.get('/admin/moderation/queue', { params }).then((res) => {
      // Backend returns { data: { pendingTracks:[], suspendedTracks:[], statuses:[] }, meta:{page,limit,total} }.
      // Unify into the standard { items, total, pages, page } contract the frontend list pages consume.
      const body = res.data as { data?: Record<string, unknown>; meta?: Record<string, unknown> };
      const d = body?.data ?? {};
      const pending = Array.isArray((d as Record<string, unknown>).pendingTracks)
        ? (d as { pendingTracks: Track[] }).pendingTracks : [];
      const suspended = Array.isArray((d as Record<string, unknown>).suspendedTracks)
        ? (d as { suspendedTracks: Track[] }).suspendedTracks : [];
      const items: Track[] = [...pending, ...suspended];
      items.forEach(t => normalizeTrack(t as unknown as Record<string, unknown>));
      const meta = body?.meta ?? {};
      const total = Number((meta as Record<string, unknown>).total ?? items.length);
      const pages = Number((meta as Record<string, unknown>).pages ?? (meta as Record<string, unknown>).totalPages ?? 1);
      const page = Number((meta as Record<string, unknown>).page ?? 1);
      return { items, total, pages, page };
    }),
  suspendTrack: (id: string, reason: string) => p<Track>(`/admin/tracks/${id}/suspend`, { reason }),
  unsuspendTrack: (id: string) => p<Track>(`/admin/tracks/${id}/unsuspend`),
  approveTrack: (id: string, notes?: string) => p<Track>(`/admin/tracks/${id}/approve`, { notes }),
  rejectTrack: (id: string, reason: string) => p<Track>(`/admin/tracks/${id}/reject`, { reason }),
  removeTrack: (id: string) => dl<{ id: string }>(`/admin/tracks/${id}`),

  // Albums
  listAlbums: (params?: Params) => gP<Album>('/admin/albums', params),
  getAlbum: (id: string) => g<Album>(`/admin/catalog/albums/${id}`),
  updateAlbumStatus: (id: string, status: string, reason?: string) =>
    pt<Album>(`/admin/catalog/albums/${id}/status`, { status, reason }),

  // Playlists (admin-curated)
  listPlaylists: (params?: Params) => gP<Playlist>('/admin/playlists', params).then(normalizePlaylists),
  getPlaylist: (id: string) => g<Playlist>(`/admin/playlists/${id}`).then(normalizePlaylist),
  createPlaylist: (body: Partial<Playlist>) => p<Playlist>('/admin/playlists', body),
  updatePlaylist: (id: string, body: Partial<Playlist>) => pu<Playlist>(`/admin/playlists/${id}`, body),
  deletePlaylist: (id: string) => dl<{ id: string }>(`/admin/playlists/${id}`),

  // Users
  listUsers: (params?: Params) => gP<UserRow>('/admin/users', params),
  listBannedUsers: () => gL<UserRow>('/admin/users/banned'),
  getUserProfile: (id: string) => g<UserRow>(`/admin/users/${id}/profile`),
  getUserStreamHistory: (id: string, params?: Params) => gP<StreamEvent>(`/admin/users/${id}/stream-history`, params),
  getUserSubscriptions: (id: string) => gL<SubscriptionRow>(`/admin/users/${id}/subscriptions`),
  banUser: (id: string, reason: string) => p<UserRow>(`/admin/users/${id}/ban`, { reason }),
  unbanUser: (id: string) => p<UserRow>(`/admin/users/${id}/unban`),

  // Subscriptions
  subscriptionStats: () => g<SubscriptionStats>('/admin/subscriptions/stats'),
  subscriptionPlans: () => gL<PlanRow>('/admin/subscriptions/plans'),
  subscriptionConversions: (params?: Params) => g<Record<string, unknown>>('/admin/subscriptions/conversions', params),
  subscriptionConversionsSummary: () => g<Record<string, unknown>>('/admin/subscriptions/conversions/summary'),
  subscriptionsByGeography: () =>
    gL<{ country: string; count: number; total?: number }>('/admin/subscriptions/by-geography')
      .then(rows => rows.map(r => ({ ...r, count: Number(r.count ?? r.total ?? 0) }))),
  subscriptionTopCountries: () =>
    // Backend returns [{ country, countryName, total, paid, free, ... }]. Normalise total → count.
    gL<{ country: string; count: number; total?: number; countryName?: string }>('/admin/subscriptions/top-countries')
      .then(rows => rows.map(r => ({ ...r, count: Number(r.count ?? r.total ?? 0) }))),
  listSubscriptions: (params?: Params) => gP<SubscriptionRow>('/admin/subscriptions', params),
  cancelSubscription: (id: string, reason?: string) => p<SubscriptionRow>(`/admin/subscriptions/${id}/cancel`, { reason }),
  changeSubscriptionPlan: (id: string, planId: string) => pt<SubscriptionRow>(`/admin/subscriptions/${id}`, { planId }),
  createPlan: (body: Partial<PlanRow>) => p<PlanRow>('/admin/subscription-plans', body),
  planSubscribers: (id: string, params?: Params) => gP<SubscriptionRow>(`/admin/subscription-plans/${id}/subscribers`, params),
  updatePlan: (id: string, body: Partial<PlanRow>) => pu<PlanRow>(`/admin/subscription-plans/${id}`, body),
  activatePlan: (id: string) => pt<PlanRow>(`/admin/subscription-plans/${id}/activate`, {}),
  deactivatePlan: (id: string) => pt<PlanRow>(`/admin/subscription-plans/${id}/deactivate`, {}),
  deletePlan: (id: string) => dl<{ id: string }>(`/admin/subscription-plans/${id}`),

  // Royalties
  royaltyLedger: (params?: Params) => gP<Royalty>('/admin/royalties', params),
  pendingPayouts: () => gL<Payout>('/admin/royalties/pending-payouts'),
  listPayouts: (params?: Params) => gP<Payout>('/admin/royalties/payouts', params),
  getPayout: (id: string) => g<Payout>(`/admin/royalties/payouts/${id}`),
  approvePayout: (id: string, notes?: string) => p<Payout>(`/admin/royalties/payouts/${id}/approve`, { notes }),
  rejectPayout: (id: string, reason: string) => p<Payout>(`/admin/royalties/payouts/${id}/reject`, { reason }),
  royaltiesByArtist: (id: string, params?: Params) => gP<Royalty>(`/admin/royalties/artist/${id}`, params),
  adjustRoyalty: (id: string, amount: number, reason: string) =>
    p<Royalty>(`/admin/royalties/${id}/adjust`, { amount, reason }),

  // Reports & takedowns
  listReports: (params?: Params) => gP<Report>('/admin/reports', params),
  getReport: (id: string) => g<Report>(`/admin/reports/${id}`),
  resolveReport: (id: string, resolution: string) => p<Report>(`/admin/reports/${id}/resolve`, { resolution }),
  dismissReport: (id: string, reason: string) => p<Report>(`/admin/reports/${id}/dismiss`, { reason }),
  listTakedowns: (params?: Params) => gP<Takedown>('/admin/takedowns', params),
  createTakedown: (body: Partial<Takedown>) => p<Takedown>('/admin/takedowns', body),
  executeTakedown: (id: string) => p<Takedown>(`/admin/takedowns/${id}/execute`),
  rejectTakedown: (id: string, reason: string) => p<Takedown>(`/admin/takedowns/${id}/reject`, { reason }),

  // Fraud
  listFraudFlags: (params?: Params) => gP<FraudFlag>('/admin/fraud/flags', params),
  suspiciousStreams: () => gL<StreamEvent>('/admin/fraud/suspicious-streams'),
  confirmFraud: (id: string, notes?: string) => p<FraudFlag>(`/admin/fraud/flags/${id}/confirm`, { notes }),
  dismissFraud: (id: string, reason: string) => p<FraudFlag>(`/admin/fraud/flags/${id}/dismiss`, { reason }),

  // Config — backend returns { data: { key1: { value, description, updatedAt }, key2: {...} } }
  // (a key-map, not an array). We normalise to ConfigEntry[] so the UI can just map().
  getConfig: () =>
    api.get('/admin/config').then((res) => {
      const body = res.data as { data?: unknown } | undefined;
      const d = body?.data ?? body;
      if (Array.isArray(d)) return d as ConfigEntry[];
      if (!d || typeof d !== 'object') return [];
      return Object.entries(d as Record<string, unknown>).map(([key, v]): ConfigEntry => {
        if (v && typeof v === 'object') {
          const vv = v as Record<string, unknown>;
          return {
            key,
            value: (vv.value ?? '') as ConfigEntry['value'],
            description: typeof vv.description === 'string' ? vv.description : undefined,
            updatedAt: typeof vv.updatedAt === 'string' ? vv.updatedAt : undefined,
          };
        }
        return { key, value: v as ConfigEntry['value'] };
      });
    }),
  updateConfig: (body: Record<string, unknown>) => pu<ConfigEntry[]>('/admin/config', body),
  listGenres: () => gL<Genre>('/admin/config/genres'),
  createGenre: (body: Partial<Genre>) => p<Genre>('/admin/config/genres', body),

  // Settings
  revenueSplits: () => g<RevenueSplit>('/admin/settings/revenue-splits'),
  updateRevenueSplits: (body: Partial<RevenueSplit>) => pu<RevenueSplit>('/admin/settings/revenue-splits', body),
  previewRevenueSplit: (body: { amount: number; splits: Partial<RevenueSplit> }) =>
    p<Record<string, number>>('/admin/settings/revenue-splits/preview', body),
  monetizationSettings: () => g<MonetizationSettings>('/admin/settings/monetization'),
  updateMonetizationSettings: (body: Partial<MonetizationSettings>) =>
    pu<MonetizationSettings>('/admin/settings/monetization', body),

  // Legal holds
  listLegalHolds: () => gL<LegalHold>('/admin/legal-holds'),
  createLegalHold: (body: Partial<LegalHold>) => p<LegalHold>('/admin/legal-holds', body),
  releaseLegalHold: (id: string) => dl<{ id: string }>(`/admin/legal-holds/${id}`),

  // Analytics
  analyticsDashboard: () => g<Record<string, unknown>>('/admin/analytics'),
  analyticsOverview: () => g<Record<string, unknown>>('/admin/analytics/overview'),
  topTracks: (params?: Params) => gL<Track>('/admin/analytics/top-tracks', params).then(normalizeTracks),
  topCharts: (params?: Params) => gL<Record<string, unknown>>('/admin/analytics/top-charts', params),
  streamDistribution: () => gL<{ label: string; count: number }>('/admin/analytics/stream-distribution'),
  streamsAnalytics: (params?: Params) => g<Record<string, unknown>>('/admin/analytics/streams', params),
  streamsByGenre: () =>
    // Backend returns [{genre, totalStreams, trackCount}], normalize to {genre, count}.
    gL<{ genre: string; count: number; totalStreams?: number; trackCount?: number }>('/admin/analytics/streams/by-genre').then(rows =>
      rows.map(r => ({ ...r, count: Number(r.count ?? r.totalStreams ?? 0) })),
    ),
  revenueReport: (params?: Params) => g<Record<string, unknown>>('/admin/analytics/revenue', params),

  // Revenue
  revenueOverview: () => g<Record<string, unknown>>('/admin/revenue/overview'),
  revenueEarnings: (params?: Params) => gL<Record<string, unknown>>('/admin/revenue/earnings', params),
  totalRevenue: () => g<{ total: number; currency: string }>('/admin/revenue/total'),
  reportsRevenue: (params?: Params) => g<Record<string, unknown>>('/admin/reports/revenue', params),
  topEarningArtists: (params?: Params) => gL<Artist>('/admin/reports/revenue/top-artists', params),
  subscriptionRevenueReport: () => g<Record<string, unknown>>('/admin/reports/revenue/subscriptions'),

  // Labels
  listLabels: (params?: Params) => gP<Label>('/admin/labels', params),
  createLabel: (body: Partial<Label>) => p<Label>('/admin/labels', body),
  getLabel: (id: string) => g<Label>(`/admin/labels/${id}`),
  updateLabel: (id: string, body: Partial<Label>) => pt<Label>(`/admin/labels/${id}`, body),
  deleteLabel: (id: string) => dl<{ id: string }>(`/admin/labels/${id}`),
  labelArtists: (id: string) => gL<Artist>(`/admin/labels/${id}/artists`),
  labelRevenue: (id: string) => g<Record<string, unknown>>(`/admin/labels/${id}/revenue`),
  labelPayouts: (id: string) => gL<Payout>(`/admin/labels/${id}/payouts`),

  // Promotions
  listPromotions: (params?: Params) => gP<Promotion>('/admin/promotions', params),
  createPromotion: (body: Partial<Promotion>) => p<Promotion>('/admin/promotions', body),
  updatePromotion: (id: string, body: Partial<Promotion>) => pt<Promotion>(`/admin/promotions/${id}`, body),

  // Exports
  createExport: (body: { entity: string; format: 'csv' | 'xlsx'; filters?: Record<string, unknown> }) =>
    p<ExportJob>('/admin/exports', body),
  getExport: (id: string) => g<ExportJob>(`/admin/exports/${id}`),

  // Copyright
  listCopyrightDisputes: (params?: Params) => gP<CopyrightDispute>('/admin/copyright-disputes', params),
  resolveCopyright: (id: string, resolution: string) =>
    p<CopyrightDispute>(`/admin/copyright-disputes/${id}/resolve`, { resolution }),

  // Audit
  auditLogs: (params?: Params) => gP<AuditLog>('/admin/audit-logs', params),

  // ---------------------------------------------------------------------------
  // APPEALS  (ADED §5.4) + STRIKES ledger (aggregate)
  // ---------------------------------------------------------------------------
  listAppeals: (params?: Params) => gP<Appeal>('/admin/appeals', params),
  getAppeal: (id: string) => g<Appeal>(`/admin/appeals/${id}`),
  createAppeal: (body: Partial<Appeal>) => p<Appeal>('/admin/appeals', body),
  decideAppeal: (id: string, decision: 'approved' | 'denied', reason?: string) =>
    p<Appeal>(`/admin/appeals/${id}/decide`, { decision, reason }),
  reviewAppeal: (id: string, decision: 'approved' | 'denied', reason?: string) =>
    p<Appeal>(`/admin/appeals/${id}/review`, { decision, reason }),
  listStrikesLedger: (params?: Params) =>
    api.get('/admin/strikes', { params }).then(unwrapPaginated<StrikeLedgerRow>),

  // ---------------------------------------------------------------------------
  // ADS  (BED v2 §4.17)
  // ---------------------------------------------------------------------------
  listAdCampaigns: (params?: Params) => gP<AdCampaign>('/admin/ads/campaigns', params),
  getAdCampaign: (id: string) => g<AdCampaign>(`/admin/ads/campaigns/${id}`),
  createAdCampaign: (body: Partial<AdCampaign>) => p<AdCampaign>('/admin/ads/campaigns', body),
  updateAdCampaign: (id: string, body: Partial<AdCampaign>) => pt<AdCampaign>(`/admin/ads/campaigns/${id}`, body),
  listAdCreatives: (params?: Params) => gP<AdCreative>('/admin/ads/creatives', params),
  createAdCreative: (body: Partial<AdCreative>) => p<AdCreative>('/admin/ads/creatives', body),
  updateAdCreative: (id: string, body: Partial<AdCreative>) => pt<AdCreative>(`/admin/ads/creatives/${id}`, body),
  deleteAdCreative: (id: string) => dl<{ id: string }>(`/admin/ads/creatives/${id}`),
  listAdTargeting: (params?: Params) => gL<AdTargetingRule>('/admin/ads/targeting', params),
  createAdTargeting: (body: Partial<AdTargetingRule>) => p<AdTargetingRule>('/admin/ads/targeting', body),
  deleteAdTargeting: (id: string) => dl<{ id: string }>(`/admin/ads/targeting/${id}`),
  listAdFrequency: (params?: Params) => gL<AdFrequencyCap>('/admin/ads/frequency', params),
  upsertAdFrequency: (body: Partial<AdFrequencyCap>) =>
    p<AdFrequencyCap>('/admin/ads/frequency', body),
  adsAnalytics: (params?: Params) => g<AdsAnalytics>('/admin/ads/analytics', params),

  // ---------------------------------------------------------------------------
  // CMS  (Banners · Trending · Legal · Genres write-path)
  // ---------------------------------------------------------------------------
  listBanners: (params?: Params) => gP<Banner>('/admin/cms/banners', params),
  getBanner: (id: string) => g<Banner>(`/admin/cms/banners/${id}`),
  createBanner: (body: Partial<Banner>) => p<Banner>('/admin/cms/banners', body),
  updateBanner: (id: string, body: Partial<Banner>) => pt<Banner>(`/admin/cms/banners/${id}`, body),
  deleteBanner: (id: string) => dl<{ id: string }>(`/admin/cms/banners/${id}`),
  listTrending: () => gL<TrendingOverride>('/admin/cms/trending'),
  upsertTrending: (body: Partial<TrendingOverride>) => p<TrendingOverride>('/admin/cms/trending', body),
  deleteTrending: (trackId: string) => dl<{ trackId: string }>(`/admin/cms/trending/${trackId}`),
  listLegal: (params?: Params) => gL<LegalDocument>('/admin/cms/legal', params),
  getLegal: (slug: string, params?: Params) => g<LegalDocument>(`/admin/cms/legal/${slug}`, params),
  publishLegal: (slug: string, body: Partial<LegalDocument>) => pu<LegalDocument>(`/admin/cms/legal/${slug}`, body),
  updateGenre: (id: string, body: Partial<Genre>) => pt<Genre>(`/admin/config/genres/${id}`, body),
  deleteGenre: (id: string) => dl<{ id: string }>(`/admin/config/genres/${id}`),

  // ---------------------------------------------------------------------------
  // ROLES & DELEGATION
  // ---------------------------------------------------------------------------
  roleCatalog: () => gL<RoleCatalogEntry>('/admin/roles/catalog'),
  listAdminUsers: (params?: Params) => gP<AdminUserRow>('/admin/roles', params),
  createAdminUser: (body: { email: string; password: string; firstName: string; lastName: string; role: string }) =>
    p<AdminUserRow>('/admin/roles', body),
  assignRole: (adminId: string, role: string) => p<AdminUserRow>('/admin/roles/assign', { adminId, role }),
  setAdminStatus: (adminId: string, status: 'active' | 'suspended') =>
    pt<AdminUserRow>(`/admin/roles/${adminId}/status`, { status }),
};

/* --------------------------------------------------------------------------
 * Live events + tickets — non-admin routes, but the admin dashboard consumes
 * them for oversight. Backend enforces role at gateway.
 * -------------------------------------------------------------------------- */

export const liveEventsApi = {
  list: (params?: Params) => gP<LiveEvent>('/live-events', params).then(normalizeLiveEvents),
  get: (id: string) => g<LiveEvent>(`/live-events/${id}`).then(normalizeLiveEvent),
  cancel: (id: string, reason?: string) => p<LiveEvent>(`/live-events/${id}/cancel`, { reason }),
  updateStatus: (id: string, status: string) => pt<LiveEvent>(`/live-events/${id}/status`, { status }),
  tickets: (eventId: string, params?: Params) => gP<Ticket>(`/live-events/${eventId}/tickets`, params),
  state: (id: string) => g<Record<string, unknown>>(`/live-events/${id}/state`),
  end: (id: string) => p<LiveEvent>(`/live-events/${id}/end`),
};

export const ticketsApi = {
  refund: (id: string) => p<Ticket>(`/tickets/${id}/refund`),
};

/* --------------------------------------------------------------------------
 * Types
 * -------------------------------------------------------------------------- */

export interface AdminUserPayload {
  id: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  roles?: string[];
  profile?: { firstName?: string; lastName?: string; avatarUrl?: string };
  firstName?: string;
  lastName?: string;
}

export interface DashboardStats {
  dailyActiveUsers?: number;
  tracksPublishedToday?: number;
  tipsVolume?: number;
  tipsCurrency?: string;
  activeLiveBroadcasts?: number;
  moderationQueueDepth?: number;
  verificationQueueDepth?: number;
  activeSupportTickets?: number;
  totalTracks?: number;
  totalArtists?: number;
  totalListeners?: number;
  totalRevenue?: number;
  currency?: string;
  [k: string]: unknown;
}

export interface Artist {
  id: string;
  stageName?: string;
  legalName?: string;
  bio?: string;
  country?: string;
  city?: string;
  primaryGenre?: string;
  secondaryGenres?: string[];
  languages?: string[];
  profileImageUrl?: string;
  coverImageUrl?: string;
  gallery?: string[];
  socialLinks?: Record<string, string>;
  payoutMethod?: string;
  taxId?: string;
  kycStatus?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNotes?: string;
  strikeCount?: number;
  banStatus?: 'active' | 'banned';
  status?: string;
  labelId?: string;
  createdAt?: string;
  updatedAt?: string;
  totalTips?: number;
  totalStreams?: number;
  followerCount?: number;
  [k: string]: unknown;
}

export interface VerificationRequest {
  id: string;
  artistId?: string;
  artist?: Artist;
  submittedAt?: string;
  documents?: string[];
  status?: string;
  notes?: string;
}

export interface Strike {
  id: string;
  artistId: string;
  reason: string;
  severity?: string;
  issuedBy?: string;
  issuedAt: string;
  expiresAt?: string;
  revokedAt?: string;
  revokedBy?: string;
}

export interface Track {
  id: string;
  title: string;
  subtitle?: string;
  isrc?: string;
  upc?: string;
  artistId?: string;
  artist?: Artist;
  featuredArtists?: string[];
  albumId?: string;
  album?: Album;
  genre?: string;
  subgenre?: string;
  mood?: string[];
  language?: string;
  explicit?: boolean;
  lyrics?: string;
  credits?: TrackCredit[];
  releaseDate?: string;
  originalReleaseDate?: string;
  copyright?: string;
  publishingRights?: string;
  licensingType?: string;
  territoryRestrictions?: string[];
  audioUrl?: string;
  coverImageUrl?: string;
  thumbnailImageUrl?: string;
  previewClipUrl?: string;
  waveformData?: unknown;
  duration?: number;
  bpm?: number;
  key?: string;
  tags?: string[];
  status?: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'removed';
  moderationNotes?: string;
  featuredWeight?: number;
  tipEnabled?: boolean;
  streamingEnabled?: boolean;
  downloadEnabled?: boolean;
  commentsEnabled?: boolean;
  premiumOnly?: boolean;
  previewOnly?: boolean;
  streamCount?: number;
  tipsTotal?: number;
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}

export interface TrackCredit {
  name: string;
  role: string;
  splitPercent?: number;
}

export interface Album {
  id: string;
  title: string;
  subtitle?: string;
  artistId?: string;
  artist?: Artist;
  featuredArtists?: string[];
  upc?: string;
  catalogNumber?: string;
  coverImageUrl?: string;
  backCoverImageUrl?: string;
  insertImages?: string[];
  releaseDate?: string;
  originalReleaseDate?: string;
  releaseType?: 'single' | 'ep' | 'album' | 'compilation';
  genre?: string;
  subgenre?: string;
  mood?: string[];
  language?: string;
  description?: string;
  tracks?: Track[];
  totalDuration?: number;
  credits?: TrackCredit[];
  copyright?: string;
  publishingRights?: string;
  licensingType?: string;
  territoryRestrictions?: string[];
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Playlist {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  coverImageUrl?: string;
  backdropImageUrl?: string;
  curatorNotes?: string;
  mood?: string[];
  genre?: string;
  tags?: string[];
  tracks?: Track[];
  trackIds?: string[];
  featured?: boolean;
  pinnedToHome?: boolean;
  locale?: string[];
  targetSegments?: string[];
  publishedAt?: string;
  expiresAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserRow {
  id: string;
  email?: string;
  phoneNumber?: string;
  role?: string;
  status?: string;
  banStatus?: string;
  isActive?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  country?: string;
  totalStreams?: number;
  subscriptionTier?: string;
  [k: string]: unknown;
}

export interface StreamEvent {
  id: string;
  userId?: string;
  trackId?: string;
  track?: Track;
  playedAt?: string;
  durationMs?: number;
  completionPct?: number;
  deviceType?: string;
  country?: string;
  isFraudulent?: boolean;
}

export interface SubscriptionRow {
  id: string;
  userId?: string;
  planId?: string;
  plan?: PlanRow;
  status?: string;
  startsAt?: string;
  endsAt?: string;
  renewsAt?: string;
  cancelledAt?: string;
  paymentMethod?: string;
  amount?: number;
  currency?: string;
  createdAt?: string;
}

export interface SubscriptionStats {
  active?: number;
  cancelled?: number;
  trialing?: number;
  churnRate?: number;
  mrr?: number;
  arpu?: number;
  currency?: string;
  [k: string]: unknown;
}

export interface PlanRow {
  id: string;
  name: string;
  price: number;
  currency?: string;
  billingCycle?: 'monthly' | 'quarterly' | 'annual';
  features?: string[];
  maxDevices?: number;
  isActive?: boolean;
  isTrial?: boolean;
  trialDays?: number;
  createdAt?: string;
}

export interface Royalty {
  id: string;
  artistId?: string;
  artist?: Artist;
  trackId?: string;
  track?: Track;
  period?: string;
  amount: number | string;
  currency?: string;
  status?: string;
  createdAt?: string;
}

export interface Payout {
  id: string;
  artistId?: string;
  artist?: Artist;
  amount: number | string;
  currency?: string;
  status?: string;
  method?: string;
  reference?: string;
  createdAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface Report {
  id: string;
  reporterId?: string;
  targetType?: string;
  targetId?: string;
  reason?: string;
  description?: string;
  status?: string;
  createdAt?: string;
  resolvedAt?: string;
}

export interface Takedown {
  id: string;
  trackId?: string;
  track?: Track;
  reason?: string;
  requestedBy?: string;
  requestedAt?: string;
  status?: string;
  executedAt?: string;
  createdAt?: string;
}

export interface FraudFlag {
  id: string;
  entityType?: string;
  entityId?: string;
  score?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
}

export interface ConfigEntry {
  id?: string;
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  description?: string;
  updatedAt?: string;
}

export interface Genre {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  active?: boolean;
}

export interface RevenueSplit {
  artistSharePercent?: number;
  platformSharePercent?: number;
  labelSharePercent?: number;
  processorFeePercent?: number;
  [k: string]: unknown;
}

export interface MonetizationSettings {
  minPayoutAmount?: number;
  minPayoutCurrency?: string;
  royaltyRatePerStream?: number;
  tipMinAmount?: number;
  tipPlatformFeePercent?: number;
  adRateCpm?: number;
  [k: string]: unknown;
}

export interface LegalHold {
  id: string;
  entityType?: string;
  entityId?: string;
  reason?: string;
  createdBy?: string;
  createdAt?: string;
  releasedAt?: string;
}

export interface Label {
  id: string;
  name: string;
  slug?: string;
  country?: string;
  contactEmail?: string;
  logoUrl?: string;
  createdAt?: string;
}

export interface Promotion {
  id: string;
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  currency?: string;
  startsAt?: string;
  endsAt?: string;
  usageLimit?: number;
  usageCount?: number;
  active?: boolean;
}

export interface ExportJob {
  id: string;
  entity: string;
  format: string;
  status: string;
  downloadUrl?: string;
  createdAt?: string;
}

export interface CopyrightDispute {
  id: string;
  trackId?: string;
  claimantId?: string;
  claim?: string;
  status?: string;
  resolution?: string;
  createdAt?: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  action?: string;
  actorId?: string;
  actorEmail?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt?: string;
}

export interface LiveEvent {
  id: string;
  title: string;
  artistId?: string;
  artist?: Artist;
  coverImageUrl?: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  startedAt?: string;
  endedAt?: string;
  status?: 'scheduled' | 'live' | 'ended' | 'cancelled';
  capacity?: number;
  capacityRemaining?: number;
  ticketPrice?: number;
  currency?: string;
  streamProvider?: string;
  streamKey?: string;
  recordingEnabled?: boolean;
  replayAvailability?: string;
  chatEnabled?: boolean;
  tipsEnabled?: boolean;
  moderatorIds?: string[];
  tags?: string[];
  isPrivate?: boolean;
  inviteOnly?: boolean;
  viewerCount?: number;
  tipsTotal?: number;
  chatMessageCount?: number;
  ticketsSold?: number;
  totalRevenue?: number;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// APPEALS + STRIKES ledger
// ---------------------------------------------------------------------------
export interface Appeal {
  id: string;
  subjectType?: string;
  subjectId?: string;
  submittedBy?: string;
  reason?: string;
  evidence?: string;
  status?: 'pending' | 'approved' | 'denied';
  decidedBy?: string;
  decidedAt?: string;
  decisionReason?: string;
  createdAt?: string;
}
export interface StrikeLedgerRow extends Strike {
  active?: boolean;
  artist?: { id: string; stageName?: string; verified?: boolean; status?: string };
}

// ---------------------------------------------------------------------------
// ADS
// ---------------------------------------------------------------------------
export interface AdCampaign {
  id: string;
  name: string;
  advertiserName?: string;
  campaignType?: 'display' | 'audio' | 'video' | 'native';
  status?: 'draft' | 'pending_approval' | 'approved' | 'active' | 'paused' | 'rejected' | 'completed' | 'archived';
  budgetTotal?: number;
  budgetDaily?: number;
  currency?: string;
  bidStrategy?: 'CPM' | 'CPC' | 'CPA' | 'flat_rate';
  bidAmount?: number;
  priority?: number;
  startDate?: string;
  endDate?: string;
  landingUrl?: string;
  trackingPixels?: string;
  utmParams?: string;
  a11yText?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  creatives?: AdCreative[];
  targeting?: AdTargetingRule[];
  createdAt?: string;
  updatedAt?: string;
  [k: string]: unknown;
}
export interface AdCreative {
  id: string;
  campaignId?: string;
  assetType?: 'banner' | 'audio' | 'video' | 'native';
  objectKey?: string;
  fileUrl?: string;
  altText?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  status?: string;
  createdAt?: string;
}
export interface AdTargetingRule {
  id: string;
  campaignId?: string;
  dimension?: 'region' | 'demographic' | 'device' | 'context' | 'listening_history';
  operator?: 'in' | 'not_in' | 'eq' | 'neq';
  value?: string;
  createdAt?: string;
}
export interface AdFrequencyCap {
  id: string;
  campaignId?: string;
  impressionsPerUser?: number;
  resetWindow?: string;
  createdAt?: string;
}
export interface AdsAnalytics {
  totals?: { impressions: number; clicks: number; ctr: number };
  perCampaign?: Array<{ campaignId: string; impressions: number; clicks: number; ctr: number }>;
  period?: { from: string; to: string };
  [k: string]: unknown;
}

// ---------------------------------------------------------------------------
// CMS
// ---------------------------------------------------------------------------
export interface Banner {
  id: string;
  title: string;
  imageUrlDesktop?: string;
  imageUrlTablet?: string;
  imageUrlMobile?: string;
  altText?: string;
  ctaText?: string;
  ctaUrl?: string;
  position?: 'home_hero' | 'home_secondary' | 'discover' | 'sidebar' | 'library';
  startAt?: string;
  endAt?: string;
  priority?: number;
  active?: boolean;
  locale?: string;
  targetSegments?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface TrendingOverride {
  id: string;
  trackId: string;
  priority?: number;
  expiresAt?: string | null;
  createdBy?: string;
  createdAt?: string;
  track?: { id: string; title: string; artistId?: string; coverUrl?: string; artist?: { stageName?: string } };
}
export interface LegalDocument {
  id: string;
  slug: string;
  title: string;
  contentMarkdown: string;
  version: number;
  locale?: string;
  publishedAt?: string;
  publishedBy?: string;
  isCurrent?: boolean;
  effectiveDate?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// ROLES
// ---------------------------------------------------------------------------
export interface RoleCatalogEntry {
  id: string;
  label: string;
  scope?: string;
  superOnly?: boolean;
}
export interface AdminUserRow {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status?: 'active' | 'suspended';
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ticket {
  id: string;
  eventId?: string;
  userId?: string;
  pricePaid?: number | string;
  currency?: string;
  status?: 'reserved' | 'active' | 'used' | 'refunded' | 'cancelled';
  purchasedAt?: string;
  usedAt?: string;
  refundedAt?: string;
  walletTransactionRef?: string;
}
