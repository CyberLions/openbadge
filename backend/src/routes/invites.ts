import { Router } from "express";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { generateSalt } from "../utils/hashing";
import { signAssertion } from "../utils/signing";
import { buildAssertionJsonLd } from "../services/openbadges";
import { sendBadgeEmail } from "../services/email";
import { audit } from "../services/audit";

export const inviteRouter = Router();

// ── Protected routes (require auth) ──

const CreateInviteSchema = z.object({
  badgeClassId: z.string().uuid(),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
  expiresInDays: z.number().int().min(1).max(90).optional().default(14),
  sendEmail: z.boolean().optional().default(false),
});

const BulkInviteSchema = z.object({
  badgeClassId: z.string().uuid(),
  recipients: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })
  ),
  expiresInDays: z.number().int().min(1).max(90).optional().default(14),
  sendEmail: z.boolean().optional().default(true),
});

// Create a single invite
inviteRouter.post("/", async (req, res) => {
  const parsed = CreateInviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const badgeClass = await prisma.badgeClass.findUnique({
    where: { id: parsed.data.badgeClassId },
    include: { issuer: true },
  });
  if (!badgeClass) return res.status(404).json({ error: "BadgeClass not found" });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);

  const invite = await prisma.badgeInvite.create({
    data: {
      token,
      badgeClassId: parsed.data.badgeClassId,
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      expiresAt,
    },
    include: { badgeClass: { include: { issuer: true } } },
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${token}`;

  // Optionally send email with invite link
  if (parsed.data.sendEmail && parsed.data.recipientEmail) {
    try {
      await sendInviteEmail({
        to: parsed.data.recipientEmail,
        recipientName: parsed.data.recipientName,
        badgeName: badgeClass.name,
        issuerName: badgeClass.issuer.name,
        inviteUrl,
        expiresAt,
      });
    } catch (err) {
      console.error("Failed to send invite email:", err);
    }
  }

  audit({
    action: "invite.created",
    targetType: "invite",
    targetId: invite.id,
    details: { badgeClassId: parsed.data.badgeClassId },
    req,
  });

  res.status(201).json({ ...invite, inviteUrl });
});

// Bulk create invites
inviteRouter.post("/bulk", async (req, res) => {
  const parsed = BulkInviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const badgeClass = await prisma.badgeClass.findUnique({
    where: { id: parsed.data.badgeClassId },
    include: { issuer: true },
  });
  if (!badgeClass) return res.status(404).json({ error: "BadgeClass not found" });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const results = [];

  for (const recipient of parsed.data.recipients) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);

    const invite = await prisma.badgeInvite.create({
      data: {
        token,
        badgeClassId: parsed.data.badgeClassId,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        expiresAt,
      },
    });

    const inviteUrl = `${appUrl}/invite/${token}`;

    if (parsed.data.sendEmail) {
      try {
        await sendInviteEmail({
          to: recipient.email,
          recipientName: recipient.name,
          badgeName: badgeClass.name,
          issuerName: badgeClass.issuer.name,
          inviteUrl,
          expiresAt,
        });
      } catch (err) {
        console.error(`Failed to send invite to ${recipient.email}:`, err);
      }
    }

    results.push({ ...invite, inviteUrl });
  }

  audit({
    action: "invite.bulk_created",
    targetType: "badgeClass",
    targetId: parsed.data.badgeClassId,
    details: { count: results.length },
    req,
  });

  res.status(201).json(results);
});

// List invites for a badge class
inviteRouter.get("/", async (req, res) => {
  const where: Record<string, unknown> = {};
  if (req.query.badgeClassId) where.badgeClassId = req.query.badgeClassId;
  if (req.query.status) where.status = req.query.status;

  const invites = await prisma.badgeInvite.findMany({
    where,
    include: { badgeClass: { include: { issuer: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(invites);
});

// Delete/cancel an invite
inviteRouter.delete("/:id", async (req, res) => {
  await prisma.badgeInvite.update({
    where: { id: req.params.id },
    data: { status: "expired" },
  });
  res.json({ success: true });
});

// ── Public invite routes (no auth) ──

export const publicInviteRouter = Router();

// View invite details (public, token-authenticated)
publicInviteRouter.get("/:token", async (req, res) => {
  const invite = await prisma.badgeInvite.findUnique({
    where: { token: req.params.token },
    include: { badgeClass: { include: { issuer: true } } },
  });

  if (!invite) return res.status(404).json({ error: "Invite not found" });

  if (invite.status !== "pending") {
    return res.json({
      status: invite.status,
      badgeName: invite.badgeClass.name,
      issuerName: invite.badgeClass.issuer.name,
      assertionId: invite.assertionId,
    });
  }

  if (new Date() > invite.expiresAt) {
    await prisma.badgeInvite.update({
      where: { id: invite.id },
      data: { status: "expired" },
    });
    return res.json({ status: "expired", badgeName: invite.badgeClass.name });
  }

  res.json({
    status: "pending",
    recipientEmail: invite.recipientEmail || "",
    recipientName: invite.recipientName || "",
    badgeName: invite.badgeClass.name,
    badgeDescription: invite.badgeClass.description,
    badgeImage: invite.badgeClass.imageUrl,
    issuerName: invite.badgeClass.issuer.name,
    issuerUrl: invite.badgeClass.issuer.url,
    expiresAt: invite.expiresAt.toISOString(),
  });
});

// Claim an invite (public, token-authenticated)
const ClaimInviteSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().optional(),
});

publicInviteRouter.post("/:token/claim", async (req: any, res) => {
  const parsed = ClaimInviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid email is required" });

  const invite = await prisma.badgeInvite.findUnique({
    where: { token: req.params.token },
    include: { badgeClass: { include: { issuer: true } } },
  });

  if (!invite) return res.status(404).json({ error: "Invite not found" });
  if (invite.status !== "pending") return res.status(400).json({ error: `Invite already ${invite.status}` });
  if (new Date() > invite.expiresAt) {
    await prisma.badgeInvite.update({ where: { id: invite.id }, data: { status: "expired" } });
    return res.status(400).json({ error: "Invite has expired" });
  }

  // Issue the badge
  const salt = generateSalt();
  let assertion = await prisma.assertion.create({
    data: {
      badgeClassId: invite.badgeClassId,
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      salt,
    },
    include: { badgeClass: { include: { issuer: true } } },
  });

  const assertionJsonLd = buildAssertionJsonLd(assertion);
  const jws = await signAssertion(assertionJsonLd, invite.badgeClass.issuerId);

  assertion = await prisma.assertion.update({
    where: { id: assertion.id },
    data: { jws },
    include: { badgeClass: { include: { issuer: true } } },
  });

  // Mark invite as claimed
  await prisma.badgeInvite.update({
    where: { id: invite.id },
    data: {
      status: "claimed",
      recipientEmail: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      assertionId: assertion.id,
    },
  });

  // Send badge email
  try {
    await sendBadgeEmail({
      to: parsed.data.recipientEmail,
      recipientName: parsed.data.recipientName,
      badgeName: invite.badgeClass.name,
      issuerName: invite.badgeClass.issuer.name,
      assertionId: assertion.id,
      description: invite.badgeClass.description,
      issuedOn: assertion.issuedOn,
      expires: assertion.expires,
    });
    await prisma.assertion.update({
      where: { id: assertion.id },
      data: { emailSent: true },
    });
  } catch (err) {
    console.error("Failed to send badge email after claim:", err);
  }

  audit({
    action: "invite.claimed",
    targetType: "invite",
    targetId: invite.id,
    details: { assertionId: assertion.id },
    req,
  });

  res.json({
    success: true,
    assertionId: assertion.id,
    badgeName: invite.badgeClass.name,
  });
});

// ── Email helper ──

async function sendInviteEmail(params: {
  to: string;
  recipientName?: string;
  badgeName: string;
  issuerName: string;
  inviteUrl: string;
  expiresAt: Date;
}) {
  // Reuse the existing email infrastructure
  const nodemailer = await import("nodemailer");
  const host = process.env.SMTP_HOST || "localhost";
  const port = Number(process.env.SMTP_PORT) || 1025;
  const secure = process.env.SMTP_SECURE === "true";
  const from = process.env.SMTP_FROM || "badges@openbadge.local";
  const auth =
    process.env.SMTP_USER && process.env.SMTP_PASS
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined;

  const transporter = nodemailer.createTransport({ host, port, secure, auth });

  const expiresDate = params.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const html = `
    <div style="max-width:560px;margin:0 auto;font-family:system-ui,sans-serif;color:#333;">
      <div style="background:linear-gradient(135deg,#001d3d,#003566);padding:32px 24px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#ffc300;margin:0;font-size:22px;">You've Been Invited!</h1>
      </div>
      <div style="padding:24px;background:#f8f9fa;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;">
        <p>Hi${params.recipientName ? ` ${params.recipientName}` : ""},</p>
        <p><strong>${params.issuerName}</strong> has invited you to claim the badge:</p>
        <h2 style="color:#003566;margin:16px 0 8px;">${params.badgeName}</h2>
        <p>Click the button below to review and claim your credential. You'll be able to confirm or update your email and name before the badge is issued.</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${params.inviteUrl}" style="display:inline-block;padding:12px 32px;background:linear-gradient(135deg,#ffc300,#e6b000);color:#001d3d;font-weight:700;text-decoration:none;border-radius:50px;font-size:14px;">
            Claim Your Badge
          </a>
        </div>
        <p style="font-size:13px;color:#666;">This invite expires on ${expiresDate}.</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from,
    to: params.to,
    subject: `You've been invited to claim: ${params.badgeName}`,
    html,
  });
}
