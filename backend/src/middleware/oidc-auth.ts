import { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, JWTPayload } from "jose";
import { getOidcDiscovery } from "../services/oidc-discovery";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksUri: string | null = null;

async function getJwks() {
  const discovery = await getOidcDiscovery();
  // Re-create if the JWKS URI changed (shouldn't happen, but safe)
  if (!jwks || jwksUri !== discovery.jwks_uri) {
    jwksUri = discovery.jwks_uri;
    jwks = createRemoteJWKSet(new URL(jwksUri));
  }
  return { jwks, issuer: discovery.issuer };
}

export interface OidcUser {
  sub: string;
  email?: string;
  name?: string;
  preferred_username?: string;
  roles?: string[];
  [key: string]: unknown;
}

/**
 * Validate a session cookie (id_token) set during the OIDC callback.
 * If valid, attaches user info to req.user.
 * If no cookie is present, passes through (other auth methods may handle it).
 */
export async function authenticateOidc(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = parseCookie(req.headers.cookie, "ob_session");
  if (!token) return next();

  try {
    const clientId = process.env.OIDC_CLIENT_ID;
    if (!clientId) return next();

    const { jwks: keys, issuer } = await getJwks();
    const { payload } = await jwtVerify(token, keys, {
      issuer,
      audience: clientId,
    });

    (req as any).user = payloadToUser(payload);
    next();
  } catch {
    // Invalid/expired token — clear cookie and pass through
    res.setHeader(
      "Set-Cookie",
      "ob_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0"
    );
    next();
  }
}

function payloadToUser(payload: JWTPayload): OidcUser {
  return {
    sub: payload.sub!,
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
    preferred_username: payload.preferred_username as string | undefined,
    roles: (payload.realm_access as any)?.roles
      ?? (payload.groups as any)
      ?? [],
  };
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
