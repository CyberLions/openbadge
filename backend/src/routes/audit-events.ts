import { Router } from "express";
import { prisma } from "../utils/prisma";

export const auditEventRouter = Router();

// List audit events (newest first, with pagination)
auditEventRouter.get("/", async (req, res) => {
  const take = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const skip = parseInt(req.query.offset as string) || 0;

  const where: Record<string, unknown> = {};
  if (req.query.action) where.action = req.query.action;
  if (req.query.actor) where.actor = { contains: req.query.actor as string };

  const [events, total] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.auditEvent.count({ where }),
  ]);

  res.json({ events, total, limit: take, offset: skip });
});
