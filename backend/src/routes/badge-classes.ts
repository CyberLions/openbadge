import { Router } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";

export const badgeClassRouter = Router();

const CreateBadgeClassSchema = z.object({
  issuerId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().min(1),
  criteriaUrl: z.string().url().optional(),
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
  res.status(201).json(badge);
});

// Update badge class
badgeClassRouter.put("/:id", async (req, res) => {
  const parsed = CreateBadgeClassSchema.partial().safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const badge = await prisma.badgeClass.update({
    where: { id: req.params.id },
    data: parsed.data,
    include: { issuer: true },
  });
  res.json(badge);
});

// Delete badge class
badgeClassRouter.delete("/:id", async (req, res) => {
  await prisma.badgeClass.delete({ where: { id: req.params.id } });
  res.status(204).end();
});
