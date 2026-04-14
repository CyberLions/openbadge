import { Router } from "express";
import { generateKeyPairSync } from "crypto";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { audit } from "../services/audit";
import { deleteUploadByUrl } from "../services/uploads";

export const issuerRouter = Router();

const CreateIssuerSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  email: z.string().email(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  linkedInOrganizationName: z.string().optional(),
});

// List all issuers
issuerRouter.get("/", async (_req, res) => {
  const issuers = await prisma.issuer.findMany({
    include: { _count: { select: { badgeClasses: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(issuers);
});

// Get single issuer
issuerRouter.get("/:id", async (req, res) => {
  const issuer = await prisma.issuer.findUnique({
    where: { id: req.params.id },
    include: { badgeClasses: true, signingKeys: { where: { active: true }, select: { id: true, algorithm: true, publicKeyPem: true, createdAt: true } } },
  });
  if (!issuer) return res.status(404).json({ error: "Issuer not found" });
  res.json(issuer);
});

// Create issuer (also generates an Ed25519 signing key pair)
issuerRouter.post("/", async (req, res) => {
  const parsed = CreateIssuerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  const issuer = await prisma.issuer.create({
    data: {
      ...parsed.data,
      signingKeys: {
        create: {
          publicKeyPem: publicKey.export({ type: "spki", format: "pem" }) as string,
          privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
          algorithm: "EdDSA",
        },
      },
    },
    include: { signingKeys: { select: { id: true, algorithm: true, publicKeyPem: true } } },
  });

  audit({ action: "issuer.created", targetType: "issuer", targetId: issuer.id, details: { name: parsed.data.name }, req });
  res.status(201).json(issuer);
});

// Update issuer
issuerRouter.put("/:id", async (req, res) => {
  const parsed = CreateIssuerSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  // Clean up old image if being replaced
  if (parsed.data.imageUrl) {
    const old = await prisma.issuer.findUnique({ where: { id: req.params.id }, select: { imageUrl: true } });
    if (old?.imageUrl && old.imageUrl !== parsed.data.imageUrl) {
      await deleteUploadByUrl(old.imageUrl);
    }
  }

  const issuer = await prisma.issuer.update({
    where: { id: req.params.id },
    data: parsed.data,
  });
  audit({ action: "issuer.updated", targetType: "issuer", targetId: issuer.id, details: parsed.data, req });
  res.json(issuer);
});

// Delete issuer
issuerRouter.delete("/:id", async (req, res) => {
  // Collect all uploads to clean up (issuer image + all badge class images)
  const issuer = await prisma.issuer.findUnique({
    where: { id: req.params.id },
    select: { imageUrl: true, badgeClasses: { select: { imageUrl: true } } },
  });
  await prisma.issuer.delete({ where: { id: req.params.id } });
  // Clean up uploads after delete
  if (issuer) {
    await deleteUploadByUrl(issuer.imageUrl);
    for (const bc of issuer.badgeClasses) {
      await deleteUploadByUrl(bc.imageUrl);
    }
  }
  audit({ action: "issuer.deleted", targetType: "issuer", targetId: req.params.id, req });
  res.status(204).end();
});
