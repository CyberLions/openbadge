import { Router } from "express";
import { prisma } from "../utils/prisma";
import { z } from "zod";
import { generateSalt } from "../utils/hashing";
import { signAssertion } from "../utils/signing";
import { buildAssertionJsonLd } from "../services/openbadges";
import { sendBadgeEmail } from "../services/email";
import { audit } from "../services/audit";

export const assertionRouter = Router();

const IssueAssertionSchema = z.object({
  badgeClassId: z.string().uuid(),
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
  expires: z.string().datetime().optional(),
  evidenceUrl: z.string().url().optional(),
  evidenceNarrative: z.string().optional(),
  sendEmail: z.boolean().optional().default(true),
});

const BulkIssueSchema = z.object({
  badgeClassId: z.string().uuid(),
  recipients: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })
  ),
  expires: z.string().datetime().optional(),
  sendEmail: z.boolean().optional().default(true),
});

// List assertions
assertionRouter.get("/", async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.badgeClassId) where.badgeClassId = req.query.badgeClassId;
  if (req.query.recipientEmail) where.recipientEmail = req.query.recipientEmail;

  const assertions = await prisma.assertion.findMany({
    where,
    include: { badgeClass: { include: { issuer: true } } },
    orderBy: { issuedOn: "desc" },
  });
  res.json(assertions);
});

// Get tracking stats for all assertions (bulk) — must be before /:id
assertionRouter.get("/tracking/bulk", async (req, res) => {
  const events = await prisma.badgeEvent.groupBy({
    by: ["assertionId", "type"],
    _count: { id: true },
  });

  const stats: Record<string, { emailOpens: number; linkClicks: number; badgeViews: number }> = {};
  for (const e of events) {
    if (!stats[e.assertionId]) {
      stats[e.assertionId] = { emailOpens: 0, linkClicks: 0, badgeViews: 0 };
    }
    if (e.type === "email_open") stats[e.assertionId].emailOpens = e._count.id;
    else if (e.type === "link_click") stats[e.assertionId].linkClicks = e._count.id;
    else if (e.type === "badge_view") stats[e.assertionId].badgeViews = e._count.id;
  }
  res.json(stats);
});

// Get single assertion
assertionRouter.get("/:id", async (req, res) => {
  const assertion = await prisma.assertion.findUnique({
    where: { id: req.params.id },
    include: { badgeClass: { include: { issuer: true } } },
  });
  if (!assertion) return res.status(404).json({ error: "Assertion not found" });
  res.json(assertion);
});

// Issue a badge (create assertion)
assertionRouter.post("/", async (req, res) => {
  const parsed = IssueAssertionSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const badgeClass = await prisma.badgeClass.findUnique({
    where: { id: parsed.data.badgeClassId },
    include: { issuer: true },
  });
  if (!badgeClass)
    return res.status(404).json({ error: "BadgeClass not found" });

  const salt = generateSalt();

  // Create the assertion record first
  let assertion = await prisma.assertion.create({
    data: {
      badgeClassId: parsed.data.badgeClassId,
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      salt,
      expires: parsed.data.expires ? new Date(parsed.data.expires) : undefined,
      evidenceUrl: parsed.data.evidenceUrl,
      evidenceNarrative: parsed.data.evidenceNarrative,
    },
    include: { badgeClass: { include: { issuer: true } } },
  });

  // Build the OB 2.0 assertion JSON-LD and sign it
  const assertionJsonLd = buildAssertionJsonLd(assertion);
  const jws = await signAssertion(assertionJsonLd, badgeClass.issuerId);

  // Store the JWS
  assertion = await prisma.assertion.update({
    where: { id: assertion.id },
    data: { jws },
    include: { badgeClass: { include: { issuer: true } } },
  });

  // Send email notification
  if (parsed.data.sendEmail) {
    try {
      await sendBadgeEmail({
        to: parsed.data.recipientEmail,
        recipientName: parsed.data.recipientName,
        badgeName: badgeClass.name,
        issuerName: badgeClass.issuer.name,
        assertionId: assertion.id,
        description: badgeClass.description,
        issuedOn: assertion.issuedOn,
        expires: assertion.expires,
      });
      await prisma.assertion.update({
        where: { id: assertion.id },
        data: { emailSent: true },
      });
      assertion.emailSent = true;
    } catch (err) {
      console.error("Failed to send badge email:", err);
    }
  }

  audit({
    action: "badge.issued",
    targetType: "assertion",
    targetId: assertion.id,
    details: { badgeClassId: parsed.data.badgeClassId, recipientEmail: parsed.data.recipientEmail },
    req,
  });

  res.status(201).json(assertion);
});

// Bulk issue badges
assertionRouter.post("/bulk", async (req, res) => {
  const parsed = BulkIssueSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const badgeClass = await prisma.badgeClass.findUnique({
    where: { id: parsed.data.badgeClassId },
    include: { issuer: true },
  });
  if (!badgeClass)
    return res.status(404).json({ error: "BadgeClass not found" });

  const results = [];

  for (const recipient of parsed.data.recipients) {
    const salt = generateSalt();
    let assertion = await prisma.assertion.create({
      data: {
        badgeClassId: parsed.data.badgeClassId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        salt,
        expires: parsed.data.expires ? new Date(parsed.data.expires) : undefined,
      },
      include: { badgeClass: { include: { issuer: true } } },
    });

    const assertionJsonLd = buildAssertionJsonLd(assertion);
    const jws = await signAssertion(assertionJsonLd, badgeClass.issuerId);

    assertion = await prisma.assertion.update({
      where: { id: assertion.id },
      data: { jws },
      include: { badgeClass: { include: { issuer: true } } },
    });

    if (parsed.data.sendEmail) {
      try {
        await sendBadgeEmail({
          to: recipient.email,
          recipientName: recipient.name,
          badgeName: badgeClass.name,
          issuerName: badgeClass.issuer.name,
          assertionId: assertion.id,
          description: badgeClass.description,
          issuedOn: assertion.issuedOn,
          expires: assertion.expires,
        });
        await prisma.assertion.update({
          where: { id: assertion.id },
          data: { emailSent: true },
        });
      } catch (err) {
        console.error(`Failed to send email to ${recipient.email}:`, err);
      }
    }

    results.push(assertion);
  }

  audit({
    action: "badge.bulk_issued",
    targetType: "badgeClass",
    targetId: parsed.data.badgeClassId,
    details: { count: results.length, recipientEmails: parsed.data.recipients.map((r) => r.email) },
    req,
  });

  res.status(201).json(results);
});

// Resend email notification
assertionRouter.post("/:id/resend-email", async (req, res) => {
  const assertion = await prisma.assertion.findUnique({
    where: { id: req.params.id },
    include: { badgeClass: { include: { issuer: true } } },
  });
  if (!assertion) return res.status(404).json({ error: "Assertion not found" });

  try {
    await sendBadgeEmail({
      to: assertion.recipientEmail,
      recipientName: assertion.recipientName || undefined,
      badgeName: assertion.badgeClass.name,
      issuerName: assertion.badgeClass.issuer.name,
      assertionId: assertion.id,
      description: assertion.badgeClass.description,
      issuedOn: assertion.issuedOn,
      expires: assertion.expires,
    });
    await prisma.assertion.update({
      where: { id: assertion.id },
      data: { emailSent: true },
    });
    res.json({ success: true });
  } catch (err) {
    console.error("Failed to resend badge email:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// Get tracking stats for an assertion
assertionRouter.get("/:id/tracking", async (req, res) => {
  const assertionId = req.params.id;
  const [emailOpens, linkClicks, badgeViews] = await Promise.all([
    prisma.badgeEvent.count({ where: { assertionId, type: "email_open" } }),
    prisma.badgeEvent.count({ where: { assertionId, type: "link_click" } }),
    prisma.badgeEvent.count({ where: { assertionId, type: "badge_view" } }),
  ]);
  res.json({ emailOpens, linkClicks, badgeViews });
});

// Revoke an assertion
assertionRouter.post("/:id/revoke", async (req, res) => {
  const { reason } = req.body || {};
  const assertion = await prisma.assertion.update({
    where: { id: req.params.id },
    data: { revoked: true, revokedReason: reason },
    include: { badgeClass: { include: { issuer: true } } },
  });

  audit({
    action: "badge.revoked",
    targetType: "assertion",
    targetId: assertion.id,
    details: { reason, recipientEmail: assertion.recipientEmail, badgeName: assertion.badgeClass.name },
    req,
  });

  res.json(assertion);
});
