import { Assertion, BadgeClass, Issuer } from "@prisma/client";
import { hashIdentity } from "../utils/hashing";

const APP_URL = () => process.env.APP_URL || "http://localhost:3000";

/**
 * Build OB 2.0 Issuer Profile JSON-LD
 */
export function buildIssuerProfile(issuer: Issuer, keyId?: string) {
  const profile: Record<string, unknown> = {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Issuer",
    id: `${APP_URL()}/ob/issuers/${issuer.id}`,
    name: issuer.name,
    url: issuer.url,
    email: issuer.email,
  };
  if (issuer.description) profile.description = issuer.description;
  if (issuer.imageUrl) profile.image = `${APP_URL()}${issuer.imageUrl}`;
  if (keyId) {
    profile.publicKey = `${APP_URL()}/ob/issuers/${issuer.id}/keys/${keyId}`;
    profile.verification = { type: "signed", creator: profile.publicKey };
  }
  return profile;
}

/**
 * Build OB 2.0 BadgeClass JSON-LD
 */
export function buildBadgeClassJsonLd(
  badge: BadgeClass & { issuer: Issuer }
) {
  const bc: Record<string, unknown> = {
    "@context": "https://w3id.org/openbadges/v2",
    type: "BadgeClass",
    id: `${APP_URL()}/ob/badge-classes/${badge.id}`,
    name: badge.name,
    description: badge.description,
    image: `${APP_URL()}${badge.imageUrl}`,
    issuer: `${APP_URL()}/ob/issuers/${badge.issuerId}`,
    criteria: {},
  };
  if (badge.criteriaUrl) {
    (bc.criteria as Record<string, string>).id = badge.criteriaUrl;
  }
  if (badge.criteriaNarrative) {
    (bc.criteria as Record<string, string>).narrative =
      badge.criteriaNarrative;
  }
  if (badge.tags.length > 0) bc.tags = badge.tags;
  return bc;
}

/**
 * Build OB 2.0 Assertion JSON-LD
 */
export function buildAssertionJsonLd(
  assertion: Assertion & { badgeClass: BadgeClass & { issuer: Issuer } }
) {
  const a: Record<string, unknown> = {
    "@context": "https://w3id.org/openbadges/v2",
    type: "Assertion",
    id: `${APP_URL()}/ob/assertions/${assertion.id}`,
    recipient: {
      type: "email",
      hashed: assertion.recipientHashed,
      identity: assertion.recipientHashed
        ? hashIdentity(assertion.recipientEmail, assertion.salt)
        : assertion.recipientEmail,
      salt: assertion.recipientHashed ? assertion.salt : undefined,
    },
    badge: `${APP_URL()}/ob/badge-classes/${assertion.badgeClassId}`,
    verification: assertion.jws
      ? { type: "signed", creator: `${APP_URL()}/ob/issuers/${assertion.badgeClass.issuerId}/keys` }
      : { type: "hosted" },
    issuedOn: assertion.issuedOn.toISOString(),
  };
  if (assertion.expires) a.expires = assertion.expires.toISOString();
  if (assertion.revoked) {
    a.revoked = true;
    if (assertion.revokedReason) a.revocationReason = assertion.revokedReason;
  }
  if (assertion.evidenceUrl || assertion.evidenceNarrative) {
    a.evidence = {
      ...(assertion.evidenceUrl && { id: assertion.evidenceUrl }),
      ...(assertion.evidenceNarrative && {
        narrative: assertion.evidenceNarrative,
      }),
    };
  }
  return a;
}
