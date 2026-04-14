import { Router } from "express";
import multer from "multer";
import * as jose from "jose";
import { prisma } from "../utils/prisma";
import { verifyJws } from "../utils/signing";
import { hashIdentity } from "../utils/hashing";

export const offlineVerifyRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Extract the "openbadges" iTXt chunk value from a PNG buffer.
 */
function extractBakedData(buf: Buffer): string | null {
  // PNG signature is 8 bytes, then chunks follow
  let offset = 8;
  while (offset < buf.length) {
    if (offset + 8 > buf.length) break;
    const length = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");

    if (type === "iTXt") {
      const chunkData = buf.subarray(offset + 8, offset + 8 + length);
      // iTXt: keyword\0 compressionFlag compressionMethod languageTag\0 translatedKeyword\0 text
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx < 0) { offset += 12 + length; continue; }
      const keyword = chunkData.subarray(0, nullIdx).toString("latin1");
      if (keyword === "openbadges") {
        // Skip: null, compressionFlag(1), compressionMethod(1), then two null-terminated strings
        let pos = nullIdx + 1 + 2; // skip null + compression flag + method
        // skip language tag (until null)
        const langEnd = chunkData.indexOf(0, pos);
        if (langEnd < 0) { offset += 12 + length; continue; }
        pos = langEnd + 1;
        // skip translated keyword (until null)
        const transEnd = chunkData.indexOf(0, pos);
        if (transEnd < 0) { offset += 12 + length; continue; }
        pos = transEnd + 1;
        return chunkData.subarray(pos).toString("utf-8");
      }
    }
    offset += 12 + length; // length(4) + type(4) + data(length) + crc(4)
  }
  return null;
}

interface OfflineVerifyResult {
  valid: boolean;
  reason?: string;
  assertionData?: Record<string, unknown>;
  issuerName?: string;
  badgeName?: string;
  issuedOn?: string;
  recipientIdentity?: string;
  recipientVerified?: boolean;
  source: "image" | "url";
}

async function verifyJwsOffline(jws: string): Promise<OfflineVerifyResult> {
  // Decode the JWS header to get the kid (issuer key URL)
  const parts = jws.split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "Invalid JWS format", source: "image" };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return { valid: false, reason: "Could not decode JWS payload", source: "image" };
  }

  // Try to verify against local database keys
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
  const kid = header.kid as string | undefined;

  if (kid) {
    // Extract key ID from kid URL pattern: .../ob/issuers/:issuerId/keys/:keyId
    const keyMatch = kid.match(/\/ob\/issuers\/([^/]+)\/keys\/([^/]+)/);
    if (keyMatch) {
      const [, issuerId, keyId] = keyMatch;
      const key = await prisma.signingKey.findFirst({
        where: { id: keyId, issuerId },
        include: { issuer: true },
      });
      if (key) {
        try {
          await verifyJws(jws, key.publicKeyPem);
          // Look up badge class info from the payload
          const badgeUrl = payload.badge as string | undefined;
          let badgeName: string | undefined;
          if (badgeUrl) {
            const bcMatch = badgeUrl.match(/\/ob\/badge-classes\/([^/?]+)/);
            if (bcMatch) {
              const bc = await prisma.badgeClass.findUnique({ where: { id: bcMatch[1] } });
              if (bc) badgeName = bc.name;
            }
          }

          return {
            valid: true,
            assertionData: payload,
            issuerName: key.issuer.name,
            badgeName,
            issuedOn: payload.issuedOn as string | undefined,
            recipientIdentity: (payload.recipient as any)?.identity,
            source: "image",
          };
        } catch {
          return { valid: false, reason: "Signature verification failed", assertionData: payload, source: "image" };
        }
      }
    }
  }

  // If we can't verify locally, return the decoded payload with a warning
  return {
    valid: false,
    reason: "Signing key not found in this system — the credential may be from another issuer",
    assertionData: payload,
    source: "image",
  };
}

// POST /offline-verify/image — upload a baked PNG
offlineVerifyRouter.post("/image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded" });

  if (!req.file.mimetype.startsWith("image/png")) {
    return res.status(400).json({ error: "Only PNG images with baked badge data are supported" });
  }

  const bakedData = extractBakedData(req.file.buffer);
  if (!bakedData) {
    return res.json({
      valid: false,
      reason: "No Open Badge data found in this image. The image may not contain a baked credential.",
      source: "image",
    });
  }

  const recipientEmail = (req.body?.recipientEmail as string) || "";

  // Check if it's a JWS (three dot-separated base64url parts) or a URL
  if (bakedData.includes(".") && bakedData.split(".").length === 3) {
    const result = await verifyJwsOffline(bakedData);

    // Check recipient email against the hashed identity in the assertion
    if (recipientEmail && result.assertionData) {
      const recipient = result.assertionData.recipient as any;
      if (recipient?.hashed && recipient?.identity && recipient?.salt) {
        const hashed = hashIdentity(recipientEmail, recipient.salt);
        result.recipientVerified = hashed === recipient.identity;
      }
    }

    return res.json(result);
  }

  // It's a hosted URL — try to describe what we found
  return res.json({
    valid: false,
    reason: "This badge uses hosted verification. Visit the assertion URL to verify.",
    assertionData: { hostedUrl: bakedData },
    source: "image",
  });
});

// POST /offline-verify/url — verify a badge by assertion URL or ID
offlineVerifyRouter.post("/url", async (req, res) => {
  const { url, recipientEmail } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  // Extract assertion ID from known URL patterns
  const patterns = [
    /\/badges\/([0-9a-f-]{36})/,
    /\/verify\/([0-9a-f-]{36})/,
    /\/ob\/assertions\/([0-9a-f-]{36})/,
    /\/ob3\/credentials\/([0-9a-f-]{36})/,
    /^([0-9a-f-]{36})$/, // raw UUID
  ];

  let assertionId: string | null = null;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      assertionId = match[1];
      break;
    }
  }

  if (!assertionId) {
    return res.json({
      valid: false,
      reason: "Could not extract a badge ID from the provided URL",
      source: "url" as const,
    });
  }

  const assertion = await prisma.assertion.findUnique({
    where: { id: assertionId },
    include: { badgeClass: { include: { issuer: true } } },
  });

  if (!assertion) {
    return res.json({
      valid: false,
      reason: "Badge not found in this system",
      source: "url" as const,
    });
  }

  if (assertion.revoked) {
    return res.json({
      valid: false,
      reason: `Badge has been revoked${assertion.revokedReason ? `: ${assertion.revokedReason}` : ""}`,
      source: "url" as const,
    });
  }

  if (assertion.expires && new Date(assertion.expires) < new Date()) {
    return res.json({
      valid: false,
      reason: "Badge has expired",
      source: "url" as const,
    });
  }

  if (assertion.jws) {
    const key = await prisma.signingKey.findFirst({
      where: { issuerId: assertion.badgeClass.issuerId, active: true },
    });
    if (key) {
      try {
        await verifyJws(assertion.jws, key.publicKeyPem);
      } catch {
        return res.json({
          valid: false,
          reason: "Signature verification failed",
          source: "url" as const,
        });
      }
    }
  }

  // Check recipient email if provided
  let recipientVerified: boolean | undefined;
  if (recipientEmail && typeof recipientEmail === "string") {
    const expected = hashIdentity(assertion.recipientEmail, assertion.salt);
    const provided = hashIdentity(recipientEmail, assertion.salt);
    recipientVerified = expected === provided;
  }

  return res.json({
    valid: true,
    badgeName: assertion.badgeClass.name,
    issuerName: assertion.badgeClass.issuer.name,
    issuedOn: assertion.issuedOn.toISOString(),
    recipientIdentity: `sha256$...${assertion.salt.slice(0, 8)}`,
    recipientVerified,
    assertionId: assertion.id,
    source: "url" as const,
  });
});
