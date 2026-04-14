import { Router } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { audit } from "../services/audit";
import { deleteUploadByUrl } from "../services/uploads";

export const badgeClassRouter = Router();

const CreateBadgeClassSchema = z.object({
  issuerId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().min(1),
  criteriaUrl: z.union([z.string().url(), z.literal("")]).optional().transform(v => v || undefined),
  criteriaNarrative: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// List all badge classes
badgeClassRouter.get("/", async (req, res) => {
  const where = req.query.issuerId
    ? { issuerId: req.query.issuerId as string }
    : {};
  const badges = await prisma.badgeClass.findMany({
    where,
    include: { issuer: true, _count: { select: { assertions: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(badges);
});

// Get single badge class
badgeClassRouter.get("/:id", async (req, res) => {
  const badge = await prisma.badgeClass.findUnique({
    where: { id: req.params.id },
    include: { issuer: true },
  });
  if (!badge) return res.status(404).json({ error: "BadgeClass not found" });
  res.json(badge);
});

// Create badge class
badgeClassRouter.post("/", async (req, res) => {
  const parsed = CreateBadgeClassSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const badge = await prisma.badgeClass.create({
    data: {
      ...parsed.data,
      tags: parsed.data.tags || [],
    },
    include: { issuer: true },
  });
  audit({ action: "badgeclass.created", targetType: "badgeClass", targetId: badge.id, details: { name: parsed.data.name }, req });
  res.status(201).json(badge);
});

// Update badge class
badgeClassRouter.put("/:id", async (req, res) => {
  const parsed = CreateBadgeClassSchema.partial().safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  // Clean up old image if being replaced
  if (parsed.data.imageUrl) {
    const old = await prisma.badgeClass.findUnique({ where: { id: req.params.id }, select: { imageUrl: true } });
    if (old?.imageUrl && old.imageUrl !== parsed.data.imageUrl) {
      await deleteUploadByUrl(old.imageUrl);
    }
  }

  const badge = await prisma.badgeClass.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { issuer: true },
  });
  audit({ action: "badgeclass.updated", targetType: "badgeClass", targetId: badge.id, details: parsed.data, req });
  res.json(badge);
});

// Delete badge class
badgeClassRouter.delete("/:id", async (req, res) => {
  const badge = await prisma.badgeClass.findUnique({ where: { id: req.params.id }, select: { imageUrl: true } });
  await prisma.badgeClass.delete({ where: { id: req.params.id } });
  if (badge) await deleteUploadByUrl(badge.imageUrl);
  audit({ action: "badgeclass.deleted", targetType: "badgeClass", targetId: req.params.id, req });
  res.status(204).end();
});
