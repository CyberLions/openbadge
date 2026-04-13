import { createHash, randomBytes } from "crypto";

export function generateSalt(): string {
  return randomBytes(16).toString("hex");
}

export function hashIdentity(email: string, salt: string): string {
  const hash = createHash("sha256")
    .update(salt + email.toLowerCase())
    .digest("hex");
  return `sha256$${hash}`;
}
