import { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import { prisma } from "../utils/prisma";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Middleware that validates an API key when an Authorization header is present.
 * If a valid key is provided, attaches the ApiKey record to req.apiKey.
 * If an invalid key is provided, returns 401.
 * If no Authorization header is present, the request passes through.
 */
export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return next();
  }

  const rawKey = header.slice(7);
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.active) {
    return res.status(401).json({ error: "Invalid or inactive API key" });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return res.status(401).json({ error: "API key has expired" });
  }

  // Update last-used timestamp (fire-and-forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  (req as any).apiKey = apiKey;
  next();
}

/**
 * Middleware that requires a valid API key via Authorization: Bearer <key>.
 * Returns 401 if no key or invalid key is provided.
 */
export async function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing API key. Use Authorization: Bearer <key>" });
  }

  const rawKey = header.slice(7);
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });

  if (!apiKey || !apiKey.active) {
    return res.status(401).json({ error: "Invalid or inactive API key" });
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return res.status(401).json({ error: "API key has expired" });
  }

  // Update last-used timestamp (fire-and-forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  (req as any).apiKey = apiKey;
  next();
}
