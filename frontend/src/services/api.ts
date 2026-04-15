import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// ---------------------------------------------------------------------------
// Client-side cache
// ---------------------------------------------------------------------------
interface CacheEntry {
  data: unknown;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 30_000; // 30 seconds

function cacheKey(url: string, params?: Record<string, string>): string {
  const p = params ? "?" + new URLSearchParams(params).toString() : "";
  return url + p;
}

function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

/** Invalidate cache entries whose key starts with the given prefix. */
export function invalidateCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

async function cachedGet<T = any>(
  url: string,
  params?: Record<string, string>,
  ttl = DEFAULT_TTL,
): Promise<{ data: T }> {
  const key = cacheKey(url, params);
  const hit = getCached<T>(key, ttl);
  if (hit !== null) return { data: hit };

  const res = await api.get(url, { params });
  setCache(key, res.data);
  return res;
}

// ---------------------------------------------------------------------------
// Issuers
// ---------------------------------------------------------------------------
export const getIssuers = () => cachedGet("/issuers");
export const getIssuer = (id: string) => cachedGet(`/issuers/${id}`);
export const createIssuer = async (data: Record<string, unknown>) => {
  const res = await api.post("/issuers", data);
  invalidateCache("/issuers");
  return res;
};
export const updateIssuer = async (id: string, data: Record<string, unknown>) => {
  const res = await api.put(`/issuers/${id}`, data);
  invalidateCache("/issuers");
  return res;
};
export const deleteIssuer = async (id: string) => {
  const res = await api.delete(`/issuers/${id}`);
  invalidateCache("/issuers");
  invalidateCache("/badge-classes");
  return res;
};

// ---------------------------------------------------------------------------
// Badge Classes
// ---------------------------------------------------------------------------
export const getBadgeClasses = (issuerId?: string) =>
  cachedGet("/badge-classes", issuerId ? { issuerId } : undefined);
export const getBadgeClass = (id: string) => cachedGet(`/badge-classes/${id}`);
export const createBadgeClass = async (data: Record<string, unknown>) => {
  const res = await api.post("/badge-classes", data);
  invalidateCache("/badge-classes");
  invalidateCache("/issuers");
  return res;
};
export const updateBadgeClass = async (id: string, data: Record<string, unknown>) => {
  const res = await api.put(`/badge-classes/${id}`, data);
  invalidateCache("/badge-classes");
  return res;
};
export const deleteBadgeClass = async (id: string) => {
  const res = await api.delete(`/badge-classes/${id}`);
  invalidateCache("/badge-classes");
  invalidateCache("/issuers");
  return res;
};

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
export const getAssertions = (params?: Record<string, string>) =>
  cachedGet("/assertions", params);
export const getAssertion = (id: string) => cachedGet(`/assertions/${id}`);
export const issueAssertion = async (data: Record<string, unknown>) => {
  const res = await api.post("/assertions", data);
  invalidateCache("/assertions");
  invalidateCache("/badge-classes");
  return res;
};
export const bulkIssueAssertions = async (data: Record<string, unknown>) => {
  const res = await api.post("/assertions/bulk", data);
  invalidateCache("/assertions");
  invalidateCache("/badge-classes");
  return res;
};
export const revokeAssertion = async (id: string, reason?: string) => {
  const res = await api.post(`/assertions/${id}/revoke`, { reason });
  invalidateCache("/assertions");
  return res;
};
export const resendEmail = async (id: string) => {
  const res = await api.post(`/assertions/${id}/resend-email`);
  invalidateCache("/assertions");
  return res;
};

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------
export const uploadImage = (file: File) => {
  const form = new FormData();
  form.append("image", file);
  return api.post("/uploads", form);
};

// ---------------------------------------------------------------------------
// API Keys
// ---------------------------------------------------------------------------
export const getApiKeys = () => cachedGet("/api-keys");
export const createApiKey = async (data: { name: string; scopes?: string[]; expiresAt?: string }) => {
  const res = await api.post("/api-keys", data);
  invalidateCache("/api-keys");
  return res;
};
export const revokeApiKey = async (id: string) => {
  const res = await api.delete(`/api-keys/${id}`);
  invalidateCache("/api-keys");
  return res;
};

// ---------------------------------------------------------------------------
// Audit Events
// ---------------------------------------------------------------------------
export const getAuditEvents = (params?: Record<string, string>) =>
  cachedGet("/audit-events", params, 5_000);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const getAuthConfig = () => axios.get("/auth/config");
export const getAuthMe = () => axios.get("/auth/me", { withCredentials: true });
export const authLogout = () => axios.post("/auth/logout", {}, { withCredentials: true });

// ---------------------------------------------------------------------------
// Verification (public)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------
export const getInvites = (params?: Record<string, string>) =>
  cachedGet("/invites", params);
export const createInvite = async (data: Record<string, unknown>) => {
  const res = await api.post("/invites", data);
  invalidateCache("/invites");
  return res;
};
export const bulkCreateInvites = async (data: Record<string, unknown>) => {
  const res = await api.post("/invites/bulk", data);
  invalidateCache("/invites");
  return res;
};
export const cancelInvite = async (id: string) => {
  const res = await api.delete(`/invites/${id}`);
  invalidateCache("/invites");
  return res;
};
export const getInvitePublic = (token: string) => axios.get(`/invites/${token}`);
export const claimInvite = (token: string, data: { recipientEmail: string; recipientName?: string }) =>
  axios.post(`/invites/${token}/claim`, data);

// ---------------------------------------------------------------------------
// Verification (public)
// ---------------------------------------------------------------------------
export const trackBadgeView = (id: string) =>
  axios.post(`/track/${id}/view`).catch(() => {});

export const getTrackingStats = () => cachedGet("/assertions/tracking/bulk", undefined, 10_000);

export const verifyBadge = async (id: string, params?: Record<string, string>) => {
  const qp = params ? `?${new URLSearchParams(params)}` : "";
  const key = `/verify/${id}${qp}`;
  const hit = getCached(key);
  if (hit !== null) return { data: hit };
  const res = await axios.get(key);
  setCache(key, res.data);
  return res;
};
