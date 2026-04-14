import { Assertion, BadgeClass, Issuer, SigningKey } from "@prisma/client";
import { createPrivateKey } from "crypto";
import { hashIdentity } from "../utils/hashing";

const APP_URL = () => process.env.APP_URL || "http://localhost:3000";

// OBv3 context URLs
const OB3_CONTEXT = [
  "https://www.w3.org/ns/credentials/v2",
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
];

/**
 * Build an OBv3 Issuer Profile (type: Profile)
 */
export function buildOb3Profile(issuer: Issuer, signingKey?: SigningKey) {
  const profile: Record<string, unknown> = {
    "@context": OB3_CONTEXT,
    id: `${APP_URL()}/ob3/issuers/${issuer.id}`,
    type: "Profile",
    name: issuer.name,
    url: issuer.url,
    email: issuer.email,
  };
  if (issuer.description) profile.description = issuer.description;
  if (issuer.imageUrl) {
    profile.image = {
      id: `${APP_URL()}${issuer.imageUrl}`,
      type: "Image",
    };
  }
  if (signingKey) {
    const pubKeyMultibase = pemToMultibase(signingKey.publicKeyPem);
    profile.verificationMethod = [
      {
        id: `${APP_URL()}/ob3/issuers/${issuer.id}#key-0`,
        type: "Multikey",
        controller: `${APP_URL()}/ob3/issuers/${issuer.id}`,
        publicKeyMultibase: pubKeyMultibase,
      },
    ];
  }
  return profile;
}

/**
 * Build an OBv3 Achievement (replaces OBv2 BadgeClass)
 */
export function buildOb3Achievement(badge: BadgeClass & { issuer: Issuer }) {
  const achievement: Record<string, unknown> = {
    id: `${APP_URL()}/ob3/achievements/${badge.id}`,
    type: "Achievement",
    name: badge.name,
    description: badge.description,
    achievementType: "Badge",
    creator: {
      id: `${APP_URL()}/ob3/issuers/${badge.issuerId}`,
      type: "Profile",
      name: badge.issuer.name,
    },
    image: {
      id: `${APP_URL()}${badge.imageUrl}`,
      type: "Image",
    },
  };
  if (badge.criteriaUrl || badge.criteriaNarrative) {
    achievement.criteria = {
      ...(badge.criteriaUrl && { id: badge.criteriaUrl }),
      ...(badge.criteriaNarrative && { narrative: badge.criteriaNarrative }),
    };
  }
  if (badge.tags.length > 0) achievement.tag = badge.tags;
  return achievement;
}

/**
 * Build an OBv3 AchievementCredential (OpenBadgeCredential)
 */
export function buildOb3Credential(
  assertion: Assertion & { badgeClass: BadgeClass & { issuer: Issuer } }
) {
  const credential: Record<string, unknown> = {
    "@context": OB3_CONTEXT,
    id: `${APP_URL()}/ob3/credentials/${assertion.id}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    name: assertion.badgeClass.name,
    issuer: {
      id: `${APP_URL()}/ob3/issuers/${assertion.badgeClass.issuerId}`,
      type: "Profile",
      name: assertion.badgeClass.issuer.name,
    },
    validFrom: assertion.issuedOn.toISOString(),
    credentialSubject: {
      type: "AchievementSubject",
      identifier: {
        type: "IdentityObject",
        hashed: assertion.recipientHashed,
        identityHash: assertion.recipientHashed
          ? hashIdentity(assertion.recipientEmail, assertion.salt)
          : assertion.recipientEmail,
        identityType: "email",
        ...(assertion.recipientHashed && { salt: assertion.salt }),
      },
      achievement: buildOb3Achievement(assertion.badgeClass),
    },
  };

  if (assertion.recipientName) {
    (credential.credentialSubject as any).identifier.name = assertion.recipientName;
  }

  if (assertion.expires) {
    credential.validUntil = assertion.expires.toISOString();
  }

  if (assertion.evidenceUrl || assertion.evidenceNarrative) {
    credential.evidence = [
      {
        type: "Evidence",
        ...(assertion.evidenceUrl && { id: assertion.evidenceUrl }),
        ...(assertion.evidenceNarrative && { narrative: assertion.evidenceNarrative }),
      },
    ];
  }

  if (assertion.revoked) {
    credential.credentialStatus = {
      type: "1EdTechRevocationList",
      id: `${APP_URL()}/ob3/issuers/${assertion.badgeClass.issuerId}/revocations`,
    };
  }

  return credential;
}

/**
 * Sign an OBv3 credential with a DataIntegrityProof (Ed25519 / Multikey)
 */
export async function signOb3Credential(
  credential: Record<string, unknown>,
  signingKey: SigningKey,
  issuerId: string
): Promise<Record<string, unknown>> {
  const { sign } = await import("crypto");

  const privateKey = createPrivateKey({
    key: signingKey.privateKeyPem,
    format: "pem",
    type: "pkcs8",
  });

  // Canonical JSON serialization for signing
  const canonicalData = JSON.stringify(credential);
  const signature = sign(null, Buffer.from(canonicalData), privateKey);

  return {
    ...credential,
    proof: {
      type: "DataIntegrityProof",
      cryptosuite: "eddsa-jcs-2022",
      created: new Date().toISOString(),
      verificationMethod: `${APP_URL()}/ob3/issuers/${issuerId}#key-0`,
      proofPurpose: "assertionMethod",
      proofValue: `z${signature.toString("base64url")}`,
    },
  };
}

/**
 * Convert a PEM-encoded Ed25519 public key to multibase (base58btc) format.
 * Ed25519 public keys are 32 bytes; multicodec prefix is 0xed01.
 */
function pemToMultibase(publicKeyPem: string): string {
  // Extract DER from PEM
  const b64 = publicKeyPem
    .replace(/-----BEGIN PUBLIC KEY-----/, "")
    .replace(/-----END PUBLIC KEY-----/, "")
    .replace(/\s/g, "");
  const der = Buffer.from(b64, "base64");

  // Ed25519 SPKI DER has a 12-byte header; raw key is the last 32 bytes
  const rawKey = der.subarray(der.length - 32);

  // Multicodec: 0xed 0x01 prefix for Ed25519
  const multicodec = Buffer.concat([Buffer.from([0xed, 0x01]), rawKey]);

  // Base58btc encoding with 'z' prefix
  return `z${base58btcEncode(multicodec)}`;
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58btcEncode(buf: Buffer): string {
  const digits = [0];
  for (const byte of buf) {
    let carry = byte;
    for (let j = 0; j < digits.length; j++) {
      carry += digits[j] << 8;
      digits[j] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  // Leading zeros
  let output = "";
  for (const byte of buf) {
    if (byte === 0) output += ALPHABET[0];
    else break;
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    output += ALPHABET[digits[i]];
  }
  return output;
}
