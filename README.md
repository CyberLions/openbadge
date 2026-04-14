# OpenBadge Platform

An Open Badges 2.0 + 3.0 compliant credential platform with Ed25519 digital signatures, OIDC authentication, API key access, audit logging, LinkedIn integration, and a Vue.js management UI.

## Features

- **Open Badges 2.0 + 3.0 compliant** JSON-LD endpoints
- **W3C Verifiable Credentials** (OBv3) with DataIntegrityProof signing
- **Ed25519 (EdDSA) signed badges** using JWS (OBv2) and eddsa-jcs-2022 (OBv3)
- **OIDC authentication** via auto-discovery (works with Authentik, Keycloak, Okta, etc.)
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
- **Auth bypass** via `AUTH_DISABLED=true` for development

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  DevContainer                     │
│   ┌──────────────────┐  ┌──────────────────────┐ │
│   │  Vue.js Frontend │  │  Express.js Backend  │ │
│   │  (port 5173)     │  │  (port 3000)         │ │
│   │  - Dashboard     │  │  - REST API          │ │
│   │  - Badge Mgmt    │  │  - OB 2.0 + 3.0      │ │
│   │  - Issue Badges  │  │  - JWS / VC Signing  │ │
│   │  - API Keys      │  │  - Badge Baking      │ │
│   │  - Activity Log  │  │  - OIDC Auth         │ │
│   │  - Public Viewer │  │  - Audit Logging     │ │
│   └──────────────────┘  │  - Email (SMTP)      │ │
│                          └──────────────────────┘ │
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
3. The `postCreateCommand` installs dependencies, runs migrations, and generates signing keys
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

All `/api/*` routes require authentication (OIDC session or API key) unless `AUTH_DISABLED=true`.

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
| `POST` | `/api/uploads` | Upload badge image |
| `GET/POST/DELETE` | `/api/api-keys` | Manage API keys |
| `GET` | `/api/audit-events` | Query activity log |
| `GET` | `/verify/:id` | Verify assertion (JSON) |
| `GET` | `/verify/:id/baked-image` | Download baked PNG |

## Authentication

### OIDC (Browser Users)

Configure via environment variables. Uses auto-discovery from `/.well-known/openid-configuration` — works with any OIDC provider (Authentik, Keycloak, Okta, Auth0, etc.).

```env
OIDC_ISSUER=https://auth.example.com/application/o/openbadge/
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
```

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

### Disable Auth (Development)

```env
AUTH_DISABLED=true
```

## Audit Logging

All mutating actions are logged with actor, action, target, and details:

| Action | Trigger |
|--------|---------|
| `badge.issued` | Single badge issued |
| `badge.bulk_issued` | Bulk badges issued |
| `badge.revoked` | Badge revoked |
| `issuer.created/updated/deleted` | Issuer CRUD |
| `badgeclass.created/updated/deleted` | Badge class CRUD |
| `apikey.created/revoked` | API key management |
| `user.login/logout` | OIDC login/logout |

View the activity log at `/activity` in the UI or query `GET /api/audit-events`.

## Digital Signing

- **OBv2:** Ed25519 JWS Compact Serialization
- **OBv3:** DataIntegrityProof with `eddsa-jcs-2022` cryptosuite
- **Key format:** Ed25519 key pairs, auto-generated per issuer
- **OBv3 public keys:** Multikey format (base58btc-encoded) in issuer profiles

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
| `FRONTEND_URL` | `http://localhost:5173` | Frontend public URL |
| `AUTH_DISABLED` | `false` | Disable all auth checks |
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

## Deployment

Docker images are built via GitHub Actions and deployed to Rancher:

```bash
# Images (arm64)
registry.psuccso.org/openbadge/openbadge-backend:latest
registry.psuccso.org/openbadge/openbadge-frontend:latest
```

Required GitHub secrets: `DOCKER_PASSWORD`, `RANCHER_TOKEN`

## Development Tools

- **Swagger UI:** http://localhost:3000/api/docs
- **Prisma Studio:** `cd backend && pnpm exec prisma studio`
- **Seed data:** `cd backend && pnpm run db:seed`
