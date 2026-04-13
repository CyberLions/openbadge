#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing backend dependencies..."
cd /workspaces/openbadge/backend
npm install

echo "==> Running database migrations..."
npx prisma migrate deploy
npx prisma generate

echo "==> Generating signing keys..."
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

echo "==> Installing frontend dependencies..."
cd /workspaces/openbadge/frontend
npm install

echo "==> Setup complete! Run 'npm run dev' in both backend/ and frontend/ directories."
