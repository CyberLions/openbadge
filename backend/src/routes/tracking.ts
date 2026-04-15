import { Router } from "express";
import { prisma } from "../utils/prisma";

export const trackingRouter = Router();

// 1x1 transparent PNG pixel
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB" +
    "Nl7BcQAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * GET /track/:assertionId/pixel.png
 * Tracking pixel embedded in badge-issued emails.
 * Records an "email_open" event and returns a 1x1 transparent PNG.
 */
trackingRouter.get("/:assertionId/pixel.png", async (req, res) => {
  const { assertionId } = req.params;

  // Fire-and-forget — don't block the response
  prisma.badgeEvent
    .create({
      data: {
        assertionId,
        type: "email_open",
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      },
    })
    .catch(() => {});

  res.set("Content-Type", "image/png");
  res.set("Content-Length", String(PIXEL.length));
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.send(PIXEL);
});

/**
 * GET /track/:assertionId/click
 * Redirect link embedded in badge-issued emails for the "View Your Badge" button.
 * Records a "link_click" event, then redirects to the actual badge view page.
 */
trackingRouter.get("/:assertionId/click", async (req, res) => {
  const { assertionId } = req.params;
  const email = req.query.identity_email as string | undefined;

  // Fire-and-forget
  prisma.badgeEvent
    .create({
      data: {
        assertionId,
        type: "link_click",
        ipAddress: req.ip || req.socket.remoteAddress || null,
        userAgent: req.headers["user-agent"] || null,
      },
    })
    .catch(() => {});

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const emailParam = email ? `?identity_email=${encodeURIComponent(email)}` : "";
  res.redirect(`${frontendUrl}/badges/${assertionId}${emailParam}`);
});

/**
 * POST /track/:assertionId/view
 * Called by the frontend badge view page to record a "badge_view" event.
 */
trackingRouter.post("/:assertionId/view", async (req, res) => {
  const { assertionId } = req.params;

  await prisma.badgeEvent.create({
    data: {
      assertionId,
      type: "badge_view",
      ipAddress: req.ip || req.socket.remoteAddress || null,
      userAgent: req.headers["user-agent"] || null,
    },
  });

  res.json({ ok: true });
});
