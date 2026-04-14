interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  end_session_endpoint?: string;
}

let cached: OidcDiscovery | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function getOidcDiscovery(): Promise<OidcDiscovery> {
  if (cached && Date.now() - cacheTime < CACHE_TTL) return cached;

  const issuer = process.env.OIDC_ISSUER;
  if (!issuer) throw new Error("OIDC_ISSUER not configured");

  const url = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OIDC discovery failed: ${res.status} ${await res.text()}`);
  }

  cached = (await res.json()) as OidcDiscovery;
  cacheTime = Date.now();
  console.log("OIDC discovery loaded from", url);
  return cached;
}
