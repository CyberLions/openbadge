<p align="center">
  <img src="openbadge_platform_icon.svg" alt="OpenBadge" width="120" />
</p>

<h1 align="center">OpenBadge Platform</h1>

<p align="center">
An Open Badges 2.0 + 3.0 compliant credential platform with Ed25519 digital signatures, multiple authentication modes, badge invites, offline verification, static-site export, and a Vue.js management UI.
</p>

## Features

- **Open Badges 2.0 + 3.0 compliant** JSON-LD endpoints
- **W3C Verifiable Credentials** (OBv3) with DataIntegrityProof signing
- **Ed25519 (EdDSA) signed badges** using JWS (OBv2) and eddsa-jcs-2022 (OBv3)
- **Multiple auth modes** — OIDC (Authentik, Keycloak, Okta), local password, or disabled
- **Badge invites** — send claim links; recipients confirm details before issuance
- **CSV import** — bulk issue or bulk invite from CSV files
- **Offline verification** — verify baked badge PNGs or URLs without an account
- **Static-site export** — export an issuer for GitHub Pages verification (no server needed)
- **API keys** for programmatic/robot access
- **Audit logging** — tracks who issued, revoked, created, logged in, etc.
- **Badge baking** — embed assertion data into PNG images as iTXt chunks
- **LinkedIn "Add to Profile"** with pre-filled certification details
- **Email notifications** via SMTP with branded HTML templates
- **Image upload** for badge and issuer logos
- **Bulk issuance** — issue badges to multiple recipients at once
- **Revocation** with reason tracking and public revocation lists
- **Public verification page** with cryptographic signature verification
- **Hashed recipient identities** (SHA-256) for privacy
- **Swagger API docs** at `/api/docs`
- **Landing page** with drag-and-drop badge verification
- **Contextual help sidebar** — route-aware guidance on every page
- **Fully stateless** — all state in PostgreSQL + cookies, no filesystem dependencies

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  DevContainer                     │
│   ┌──────────────────┐  ┌──────────────────────┐ │
│   │  Vue.js Frontend │  │  Express.js Backend  │ │
│   │  (port 5173)     │  │  (port 3000)         │ │
│   │  - Landing Page  │  │  - REST API          │ │
│   │  - Dashboard     │  │  - OB 2.0 + 3.0      │ │
│   │  - Badge Mgmt    │  │  - JWS / VC Signing  │ │
│   │  - Issue / Invite│  │  - Badge Baking      │ │
│   │  - API Keys      │  │  - Auth (OIDC/Pass)  │ │
│   │  - Activity Log  │  │  - Audit Logging     │ │
│   │  - Public Viewer │  │  - Email (SMTP)      │ │
│   │  - Invite Claim  │  │  - Static Export     │ │
│   └──────────────────┘  └──────────────────────┘ │
└──────────────────────────────────────────────────┘
         │                        │
    ┌────┴────┐             ┌─────┴─────┐
    │ MailHog │             │ PostgreSQL │
    │ :8025   │             │ :5432      │
    └─────────┘             └───────────┘
```

## Quick Start (DevContainer)

1. Open this folder in VS Code
2. Click **"Reopen in Container"** when prompted
3. The `postCreateCommand` installs dependencies and runs migrations
4. Start the services:

```bash
# Terminal 1 — Backend
cd backend && pnpm dev

# Terminal 2 — Frontend
cd frontend && pnpm dev
```

5. Open http://localhost:5173

## Quick Start (Without DevContainer)

### Prerequisites

- Node.js 22+
- PostgreSQL 16+
- pnpm

### Setup

```bash
# Install dependencies
pnpm install

# Backend
cd backend
cp .env.example .env   # edit as needed
pnpm exec prisma migrate deploy
pnpm exec prisma generate
pnpm dev

# Frontend (new terminal)
cd frontend
pnpm dev
```

## Static-Site Export (GitHub Pages)

You can export any issuer's badge data as a fully self-contained static site that verifies credentials without needing the OpenBadge server.

### How It Works

The static export generates:

| File | Purpose |
|------|---------|
| `issuer.json` | OB 2.0 Issuer Profile (JSON-LD) |
| `public-key.json` | Ed25519 public key for signature verification |
| `badge-classes/*.json` | Badge class definitions |
| `assertions/*.json` | Individual assertion JSON-LD files |
| `revocations.json` | List of revoked assertions |
| `index.html` | Self-contained verification page (no server needed) |
| `README.md` | Hosting instructions |

The `index.html` verifier works entirely client-side using the Web Crypto API — it imports the Ed25519 public key and verifies JWS signatures in the browser. No API calls are made.

### Export Steps

1. Navigate to **Issuers** in the dashboard
2. Click into the issuer you want to export
3. Scroll to **Static Export** and click **Download Static Export**
4. The download is a JSON bundle containing all files

### Unpack and Host

```bash
# Save the export JSON
# Then use this script to unpack it into a directory:

node -e "
const data = require('./my-issuer-static-export.json');
const fs = require('fs');
const path = require('path');
for (const [filePath, content] of Object.entries(data.files)) {
  const dir = path.dirname(filePath);
  if (dir !== '.') fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
}
console.log('Unpacked', Object.keys(data.files).length, 'files');
"
```

### Host on GitHub Pages

1. Create a new GitHub repository (e.g. `my-org-badges`)
2. Upload the unpacked files to the repository root
3. Go to **Settings > Pages** and enable GitHub Pages from the `main` branch
4. Your verification page is live at `https://<username>.github.io/<repo>/`

### How Static Verification Works

**Image upload:** Users drop a baked badge PNG on the page. The verifier extracts the JWS from the PNG's iTXt chunk, imports the Ed25519 public key from `public-key.json`, and verifies the signature using `crypto.subtle.verify('Ed25519', ...)` — all in the browser.

**Assertion ID lookup:** Users paste a UUID. The page fetches `assertions/<id>.json` and checks for revocation/expiration.

### Updating the Static Site

When new badges are issued or badges are revoked, re-export from the OpenBadge platform and replace the files in your repository. The `index.html` verifier is self-contained and doesn't need to change.

### API Endpoint

You can also export programmatically:

```bash
curl -H "Authorization: Bearer ob_your_api_key" \
  http://localhost:3000/api/static-export/<issuer-id>
```

Returns a JSON object with `files` (a map of file paths to file contents) that you can write to disk or push to a Git repository.

## Open Badges Endpoints

### OBv2 (JSON-LD)

| Endpoint | Description |
|----------|-------------|
| `GET /ob/issuers/:id` | Issuer Profile |
| `GET /ob/issuers/:id/keys/:keyId` | Public Key (CryptographicKey) |
| `GET /ob/issuers/:id/revocations` | Revocation List |
| `GET /ob/badge-classes/:id` | BadgeClass |
| `GET /ob/assertions/:id` | Assertion |

### OBv3 (W3C Verifiable Credentials)

| Endpoint | Description |
|----------|-------------|
| `GET /ob3/issuers/:id` | Profile (with Multikey verification method) |
| `GET /ob3/achievements/:id` | Achievement |
| `GET /ob3/credentials/:id` | OpenBadgeCredential (signed with DataIntegrityProof) |
| `GET /ob3/issuers/:id/revocations` | 1EdTech Revocation List |

## REST API

All `/api/*` routes require authentication (session or API key) unless `AUTH_MODE=disabled`.

Full interactive docs at **`/api/docs`** (Swagger UI).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET/POST` | `/api/issuers` | List / Create issuers |
| `GET/PUT/DELETE` | `/api/issuers/:id` | Get / Update / Delete issuer |
| `GET/POST` | `/api/badge-classes` | List / Create badge classes |
| `GET/PUT/DELETE` | `/api/badge-classes/:id` | Get / Update / Delete badge class |
| `GET/POST` | `/api/assertions` | List / Issue badge |
| `POST` | `/api/assertions/bulk` | Bulk issue badges |
| `POST` | `/api/assertions/:id/revoke` | Revoke a badge |
| `GET/POST/DELETE` | `/api/invites` | List / Create / Cancel invites |
| `POST` | `/api/invites/bulk` | Bulk create invites |
| `GET` | `/api/static-export/:issuerId` | Export issuer for static hosting |
| `POST` | `/api/uploads` | Upload badge image |
| `GET/POST/DELETE` | `/api/api-keys` | Manage API keys |
| `GET` | `/api/audit-events` | Query activity log |
| `GET` | `/verify/:id` | Verify assertion (JSON) |
| `GET` | `/verify/:id/baked-image` | Download baked PNG |
| `POST` | `/offline-verify/image` | Verify a baked PNG (public) |
| `POST` | `/offline-verify/url` | Verify by URL or ID (public) |

### Public Routes (No Auth)

| Endpoint | Description |
|----------|-------------|
| `GET /invites/:token` | View invite details |
| `POST /invites/:token/claim` | Claim an invite (issues the badge) |
| `POST /offline-verify/image` | Upload a baked PNG for verification |
| `POST /offline-verify/url` | Verify by badge URL or assertion ID |

## Authentication

### Auth Modes

Set `AUTH_MODE` in your `.env`:

| Mode | Description |
|------|-------------|
| `password` | Local username/password accounts with HMAC-signed session cookies |
| `oidc` | OIDC provider (Authentik, Keycloak, Okta, Auth0, etc.) |
| `disabled` | No auth — all requests treated as anonymous |

### Password Auth

```env
AUTH_MODE=password
SESSION_SECRET=your-256-bit-hex-secret
# Optional: ALLOW_REGISTRATION=true (otherwise only first user can register)
```

Generate a session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The first user to register becomes the admin. Subsequent registration is disabled unless `ALLOW_REGISTRATION=true`.

### OIDC Auth

```env
AUTH_MODE=oidc
OIDC_ISSUER=https://auth.example.com/application/o/openbadge/
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
```

Uses auto-discovery from `/.well-known/openid-configuration`.

### API Keys (Robots)

```bash
# Create a key
curl -X POST http://localhost:3000/api/api-keys \
  -H "Content-Type: application/json" \
  -d '{"name": "CI Pipeline"}'
# Returns: { "key": "ob_abc123...", ... }

# Use the key
curl http://localhost:3000/api/assertions \
  -H "Authorization: Bearer ob_abc123..."
```

## Badge Invites

Invites let recipients confirm their own details before a badge is issued:

1. Admin creates an invite (single or bulk, with optional CSV import)
2. Recipient receives a link (e.g. `https://badges.example.com/invite/<token>`)
3. Recipient visits the link, confirms/updates their email and name
4. Badge is automatically issued, signed, and emailed

Invite tokens are 256-bit random hex strings with configurable expiry (1-90 days).

## Offline Verification

The landing page at `/` allows anyone to verify a badge without logging in:

- **Image upload**: Drop a baked badge PNG — the server extracts the JWS from the iTXt chunk and verifies the Ed25519 signature
- **URL/ID**: Paste a badge URL or assertion UUID — checks signature, revocation, and expiration
- **Recipient check**: Optionally enter a recipient email to verify it matches the hashed identity in the badge

## Audit Logging

All mutating actions are logged with actor, action, target, and details:

| Action | Trigger |
|--------|---------|
| `badge.issued` | Single badge issued |
| `badge.bulk_issued` | Bulk badges issued |
| `badge.revoked` | Badge revoked |
| `invite.created` | Invite created |
| `invite.bulk_created` | Bulk invites created |
| `invite.claimed` | Invite claimed by recipient |
| `issuer.created/updated/deleted` | Issuer CRUD |
| `badgeclass.created/updated/deleted` | Badge class CRUD |
| `apikey.created/revoked` | API key management |
| `user.login/logout` | Login/logout |
| `user.registered` | New account registered |

View the activity log at `/activity` in the UI or query `GET /api/audit-events`.

## Digital Signing

- **OBv2:** Ed25519 JWS Compact Serialization
- **OBv3:** DataIntegrityProof with `eddsa-jcs-2022` cryptosuite
- **Key format:** Ed25519 key pairs, auto-generated per issuer, stored in database
- **OBv3 public keys:** Multikey format (base58btc-encoded) in issuer profiles
- **Fully stateless:** No keys on the filesystem — everything in PostgreSQL

## LinkedIn Integration

Badge view pages and email notifications include "Add to LinkedIn" with all fields pre-filled:
- Credential name, issuing organization
- Issue date, expiration date
- Credential ID, verification URL

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `APP_URL` | `http://localhost:3000` | Backend public URL |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend URL (dev proxy target) |
| `FRONTEND_DIST` | (auto-detect) | Path to built frontend files (set by Docker) |
| `AUTH_MODE` | auto-detect | `password`, `oidc`, or `disabled` |
| `SESSION_SECRET` | (dev fallback) | HMAC secret for password auth sessions |
| `ALLOW_REGISTRATION` | `false` | Allow new user registration (password mode) |
| `OIDC_ISSUER` | (optional) | OIDC provider issuer URL |
| `OIDC_CLIENT_ID` | (optional) | OIDC client ID |
| `OIDC_CLIENT_SECRET` | (optional) | OIDC client secret |
| `SMTP_HOST` | `localhost` | SMTP server host |
| `SMTP_PORT` | `1025` | SMTP server port |
| `SMTP_USER` | (optional) | SMTP username |
| `SMTP_PASS` | (optional) | SMTP password |
| `SMTP_FROM` | `OpenBadge Platform` | From address for emails |
| `SMTP_SECURE` | `false` | Use TLS for SMTP |
| `PORT` | `3000` | Backend port |

## Testing

```bash
# Backend (37 tests)
cd backend && pnpm test

# Frontend (13 tests)
cd frontend && pnpm test
```

## Deployment

OpenBadge ships as a single Docker image — the backend serves the built frontend.

```bash
# Build
docker build -t openbadge .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@db:5432/openbadge \
  -e APP_URL=https://badges.example.com \
  -e AUTH_MODE=password \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  openbadge
```

The container runs migrations on startup, then serves the API and frontend on port 3000.

For CI/CD, images are built via GitHub Actions:

```bash
registry.psuccso.org/openbadge/openbadge:latest
```

Required GitHub secrets: `DOCKER_PASSWORD`, `RANCHER_TOKEN`

## Development Tools

- **Swagger UI:** http://localhost:3000/api/docs
- **Prisma Studio:** `cd backend && pnpm exec prisma studio`
- **Seed data:** `cd backend && pnpm run db:seed`
