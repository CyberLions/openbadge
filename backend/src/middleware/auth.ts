import { Request, Response, NextFunction } from "express";
import { authenticateApiKey } from "./api-key-auth";
import { authenticateOidc } from "./oidc-auth";
import { authenticatePassword } from "./password-auth";

/**
 * Determine the active auth mode from environment.
 *   AUTH_MODE=password  -> local password auth
 *   AUTH_MODE=oidc      -> OIDC (also used if OIDC_ISSUER is set without AUTH_MODE)
 *   AUTH_MODE=disabled  -> no auth
 *   AUTH_DISABLED=true  -> no auth (legacy compat)
 */
export function getAuthMode(): "password" | "oidc" | "disabled" {
  const mode = process.env.AUTH_MODE?.toLowerCase();
  if (mode === "password") return "password";
  if (mode === "oidc") return "oidc";
  if (mode === "disabled" || process.env.AUTH_DISABLED === "true") return "disabled";
  // Auto-detect: if OIDC vars are set, use oidc; otherwise disabled
  if (process.env.OIDC_ISSUER && process.env.OIDC_CLIENT_ID) return "oidc";
  return "disabled";
}

/**
 * Unified auth middleware. Runs session + API key checks in sequence.
 * If auth is disabled, all requests pass through as anonymous.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const mode = getAuthMode();
  if (mode === "disabled") {
    (req as any).user = { sub: "anonymous", email: "anonymous", name: "Anonymous" };
    return next();
  }

  if (mode === "password") {
    // Try password session first, then API key
    authenticatePassword(req, res, () => {
      authenticateApiKey(req, res, next);
    });
    return;
  }

  // OIDC mode
  authenticateOidc(req, res, () => {
    authenticateApiKey(req, res, next);
  });
}

/**
 * Guard middleware — rejects unauthenticated requests.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (getAuthMode() === "disabled") return next();

  if ((req as any).user || (req as any).apiKey) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}
