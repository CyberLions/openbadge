import { generateKeyPairSync } from "crypto";
import fs from "fs";
import path from "path";

const keyDir = path.join(__dirname, "..", "..", "keys");
if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, { recursive: true });

const { publicKey, privateKey } = generateKeyPairSync("ed25519");

fs.writeFileSync(
  path.join(keyDir, "private.pem"),
  privateKey.export({ type: "pkcs8", format: "pem" })
);
fs.writeFileSync(
  path.join(keyDir, "public.pem"),
  publicKey.export({ type: "spki", format: "pem" })
);

console.log("Ed25519 signing keys generated in keys/ directory");
