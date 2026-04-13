#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing dependencies..."
cd /workspaces/openbadge
pnpm install

echo "==> Running database migrations..."
pnpm --filter backend exec prisma migrate deploy
pnpm --filter backend exec prisma generate

echo "==> Generating signing keys..."
cd /workspaces/openbadge/backend
node -e "
const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');
const keyDir = path.join(__dirname, 'keys');
if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir);
if (!fs.existsSync(path.join(keyDir, 'private.pem'))) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  fs.writeFileSync(path.join(keyDir, 'private.pem'), privateKey.export({ type: 'pkcs8', format: 'pem' }));
  fs.writeFileSync(path.join(keyDir, 'public.pem'), publicKey.export({ type: 'spki', format: 'pem' }));
  console.log('Signing keys generated.');
} else {
  console.log('Signing keys already exist.');
}
"

echo "==> Setup complete! Run 'pnpm dev' from the root to start both servers."
