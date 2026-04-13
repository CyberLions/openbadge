import * as jose from "jose";
import { prisma } from "./prisma";

export async function getSigningKey(issuerId: string) {
  const key = await prisma.signingKey.findFirst({
    where: { issuerId, active: true },
  });
  if (!key) throw new Error(`No active signing key for issuer ${issuerId}`);
  return key;
}

export async function signAssertion(
  assertionPayload: Record<string, unknown>,
  issuerId: string
): Promise<string> {
  const key = await getSigningKey(issuerId);
  const privateKey = await jose.importPKCS8(key.privateKeyPem, "EdDSA");

  const jws = await new jose.CompactSign(
    new TextEncoder().encode(JSON.stringify(assertionPayload))
  )
    .setProtectedHeader({
      alg: "EdDSA",
      kid: `${process.env.APP_URL}/ob/issuers/${issuerId}/keys/${key.id}`,
    })
    .sign(privateKey);

  return jws;
}

export async function verifyJws(
  jws: string,
  publicKeyPem: string
): Promise<Record<string, unknown>> {
  const publicKey = await jose.importSPKI(publicKeyPem, "EdDSA");
  const { payload } = await jose.compactVerify(jws, publicKey);
  return JSON.parse(new TextDecoder().decode(payload));
}
