import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Validate a local session cookie (ob_session=<signed token>).
 * Token format: base64url(JSON payload).base64url(HMAC-SHA256 signature)
 */
export async function authenticatePassword(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = parseCookie(req.headers.cookie, "ob_session");
  if (!token) return next();

  const secret = process.env.SESSION_SECRET || "openbadge-dev-secret";
  const dotIdx = token.lastIndexOf(".");
  if (dotIdx < 0) return next();

  const payloadB64 = token.substring(0, dotIdx);
  const sigB64 = token.substring(dotIdx + 1);

  const expectedSig = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");

  const sigBuf = Buffer.from(sigB64);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return next();

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString()
    );
    if (payload.exp && Date.now() > payload.exp) return next();
    (req as any).user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    // Invalid payload
  }
  next();
}

export function createSessionToken(user: {
  id: string;
  username: string;
  email: string;
  name?: string | null;
}): string {
  const secret = process.env.SESSION_SECRET || "openbadge-dev-secret";
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name || user.username,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24h
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

function parseCookie(
  header: string | undefined,
  name: string
): string | null {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
