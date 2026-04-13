import { PrismaClient } from "@prisma/client";
import { generateKeyPairSync } from "crypto";

const prisma = new PrismaClient();

async function main() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");

  const issuer = await prisma.issuer.create({
    data: {
      name: "Demo Organization",
      url: "https://example.org",
      email: "badges@example.org",
      description: "A demo issuer for testing the OpenBadge platform",
      signingKeys: {
        create: {
          publicKeyPem: publicKey.export({ type: "spki", format: "pem" }) as string,
          privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
          algorithm: "EdDSA",
        },
      },
    },
  });

  console.log(`Created demo issuer: ${issuer.name} (${issuer.id})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
