# OpenBadge Platform

An Open Badges 2.0 compliant badge issuance platform with Ed25519 digital signatures, LinkedIn integration, and a Vue.js management UI.

## Features

- **Open Badges 2.0 compliant** JSON-LD endpoints for Issuers, BadgeClasses, and Assertions
- **Ed25519 (EdDSA) signed badges** using JWS compact serialization
- **Badge baking** — embed assertion data into PNG images as iTXt chunks
- **LinkedIn "Add to Profile"** integration for recipients
- **Email notifications** via SMTP (MailHog for dev)
- **Image upload** for badge and issuer logos
- **Bulk issuance** — issue badges to multiple recipients at once
- **Revocation** with reason tracking and public revocation list
- **Public verification page** with cryptographic signature verification
- **Hashed recipient identities** (SHA-256) for privacy

## Architecture

```
┌──────────────────────────────────────────────────┐
│                  DevContainer                     │
│   ┌──────────────────┐  ┌──────────────────────┐ │
│   │  Vue.js Frontend │  │  Express.js Backend  │ │
│   │  (port 5173)     │  │  (port 3000)         │ │
│   │  - Dashboard     │  │  - REST API          │ │
│   │  - Badge Mgmt    │  │  - OB 2.0 JSON-LD    │ │
│   │  - Issue Badges  │  │  - JWS Signing       │ │
│   │  - Public Viewer │  │  - Badge Baking      │ │
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
2. When prompted, click **"Reopen in Container"** (or run `Dev Containers: Reopen in Container` from the command palette)
3. The `postCreateCommand` will install dependencies, run migrations, and generate signing keys
4. Start the services:

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

5. Open http://localhost:5173 in your browser

## Quick Start (Without DevContainer)

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Docker (for MailHog, or configure your own SMTP)

### Setup

```bash
# Start database and mail server
docker compose up -d

# Backend
cd backend
cp .env .env.local   # edit if needed
npm install
npx prisma migrate deploy
npx prisma generate
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Open Badges 2.0 Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /ob/issuers/:id` | Issuer Profile (JSON-LD) |
| `GET /ob/issuers/:id/keys/:keyId` | Public Key (CryptographicKey) |
| `GET /ob/issuers/:id/revocations` | Revocation List |
| `GET /ob/badge-classes/:id` | BadgeClass (JSON-LD) |
| `GET /ob/assertions/:id` | Assertion (JSON-LD) |

## REST API

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
| `GET` | `/verify/:id` | Verify assertion (JSON) |
| `GET` | `/verify/:id/baked-image` | Download baked PNG |

## Badge Verification Flow

1. Recipient or verifier opens `/badges/:assertionId`
2. Frontend calls `/verify/:assertionId`
3. Backend loads the assertion and its signing key
4. Ed25519 JWS signature is verified
5. Expiration and revocation status are checked
6. Verification result is displayed with badge details

## LinkedIn Integration

Each badge view page includes an "Add to LinkedIn Profile" button that uses LinkedIn's certification API URL scheme:
```
https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME
  &name=<badge name>
  &certUrl=<verification page URL>
  &certId=<assertion ID>
```

## Digital Signing

- **Algorithm:** Ed25519 (EdDSA) via JOSE/JWS
- **Key generation:** Automatic on issuer creation
- **Format:** JWS Compact Serialization
- Each issuer gets its own key pair
- Public keys are served at `/ob/issuers/:id/keys/:keyId`

## Badge Baking

PNG badge images can be downloaded with assertion data embedded in the iTXt chunk:
- **Keyword:** `openbadges`
- **Value:** JWS compact serialization string (or hosted URL as fallback)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | (required) | PostgreSQL connection string |
| `APP_URL` | `http://localhost:3000` | Backend public URL |
| `FRONTEND_URL` | `http://localhost:5173` | Frontend public URL |
| `SMTP_HOST` | `localhost` | SMTP server host |
| `SMTP_PORT` | `1025` | SMTP server port |
| `SMTP_SECURE` | `false` | Use TLS for SMTP |
| `PORT` | `3000` | Backend port |

## Development Tools

- **MailHog UI:** http://localhost:8025 — view sent emails
- **Prisma Studio:** `cd backend && npx prisma studio` — browse database
- **Seed data:** `cd backend && npm run db:seed` — create a demo issuer
