import { Router } from "express";
import { randomBytes } from "crypto";
import { prisma } from "../utils/prisma";
import { hashApiKey } from "../middleware/api-key-auth";
import { z } from "zod";
import { audit } from "../services/audit";

export const apiKeyRouter = Router();

const CreateApiKeySchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

// List all API keys (never returns the actual key)
apiKeyRouter.get("/", async (_req, res) => {
  const keys = await prisma.apiKey.findMany({
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      active: true,
      lastUsedAt: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(keys);
});

// Create a new API key — returns the raw key ONCE
apiKeyRouter.post("/", async (req, res) => {
  const parsed = CreateApiKeySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const rawKey = `ob_${randomBytes(32).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      scopes: parsed.data.scopes ?? ["*"],
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  audit({ action: "apikey.created", targetType: "apiKey", targetId: apiKey.id, details: { name: parsed.data.name }, req });

  res.status(201).json({
    id: apiKey.id,
    name: apiKey.name,
    key: rawKey,
    keyPrefix,
    scopes: apiKey.scopes,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    _notice: "Store this key securely — it will not be shown again.",
  });
});

// Revoke an API key
apiKeyRouter.delete("/:id", async (req, res) => {
  const key = await prisma.apiKey.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  audit({ action: "apikey.revoked", targetType: "apiKey", targetId: req.params.id, details: { name: key.name }, req });
  res.status(204).end();
});
