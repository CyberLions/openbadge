import { Request, Response, NextFunction } from "express";
import { authenticateApiKey } from "./api-key-auth";
import { authenticateOidc } from "./oidc-auth";

/**
 * Unified auth middleware. Runs OIDC + API key checks in sequence.
 * If AUTH_DISABLED=true, all requests pass through as anonymous.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.AUTH_DISABLED === "true") {
    (req as any).user = { sub: "anonymous", email: "anonymous", name: "Anonymous" };
    return next();
  }

  // Try OIDC session first, then API key
  authenticateOidc(req, res, () => {
    authenticateApiKey(req, res, next);
  });
}

/**
 * Guard middleware — rejects unauthenticated requests.
 * Apply after authenticate() on routes that require a logged-in user or API key.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (process.env.AUTH_DISABLED === "true") return next();

  if ((req as any).user || (req as any).apiKey) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
}
