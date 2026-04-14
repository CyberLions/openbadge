import { Express } from "express";
import swaggerUi from "swagger-ui-express";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "OpenBadge API",
    version: "1.0.0",
    description: "Open Badges 2.0 credential platform API. All `/api/*` routes require authentication (OIDC session or API key via `Authorization: Bearer <key>`) unless `AUTH_DISABLED=true`.",
  },
  servers: [
    { url: "/", description: "Current server" },
  ],
  components: {
    securitySchemes: {
      BearerApiKey: {
        type: "http",
        scheme: "bearer",
        description: "API key (e.g. `ob_abc123...`)",
      },
      CookieSession: {
        type: "apiKey",
        in: "cookie",
        name: "ob_session",
        description: "OIDC session cookie (set after /auth/login flow)",
      },
    },
    schemas: {
      Issuer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          url: { type: "string", format: "uri" },
          email: { type: "string", format: "email" },
          description: { type: "string", nullable: true },
          imageUrl: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateIssuer: {
        type: "object",
        required: ["name", "url", "email"],
        properties: {
          name: { type: "string", minLength: 1 },
          url: { type: "string", format: "uri" },
          email: { type: "string", format: "email" },
          description: { type: "string" },
          imageUrl: { type: "string" },
        },
      },
      BadgeClass: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          issuerId: { type: "string", format: "uuid" },
          name: { type: "string" },
          description: { type: "string" },
          imageUrl: { type: "string" },
          criteriaUrl: { type: "string", nullable: true },
          criteriaNarrative: { type: "string", nullable: true },
          tags: { type: "array", items: { type: "string" } },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      CreateBadgeClass: {
        type: "object",
        required: ["issuerId", "name", "description", "imageUrl"],
        properties: {
          issuerId: { type: "string", format: "uuid" },
          name: { type: "string", minLength: 1 },
          description: { type: "string", minLength: 1 },
          imageUrl: { type: "string", minLength: 1 },
          criteriaUrl: { type: "string", format: "uri" },
          criteriaNarrative: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      Assertion: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          badgeClassId: { type: "string", format: "uuid" },
          recipientEmail: { type: "string", format: "email" },
          recipientName: { type: "string", nullable: true },
          recipientHashed: { type: "boolean" },
          salt: { type: "string" },
          issuedOn: { type: "string", format: "date-time" },
          expires: { type: "string", format: "date-time", nullable: true },
          revoked: { type: "boolean" },
          revokedReason: { type: "string", nullable: true },
          evidenceUrl: { type: "string", nullable: true },
          evidenceNarrative: { type: "string", nullable: true },
          jws: { type: "string", nullable: true },
          emailSent: { type: "boolean" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      IssueAssertion: {
        type: "object",
        required: ["badgeClassId", "recipientEmail"],
        properties: {
          badgeClassId: { type: "string", format: "uuid" },
          recipientEmail: { type: "string", format: "email" },
          recipientName: { type: "string" },
          expires: { type: "string", format: "date-time" },
          evidenceUrl: { type: "string", format: "uri" },
          evidenceNarrative: { type: "string" },
          sendEmail: { type: "boolean", default: true },
        },
      },
      BulkIssue: {
        type: "object",
        required: ["badgeClassId", "recipients"],
        properties: {
          badgeClassId: { type: "string", format: "uuid" },
          recipients: {
            type: "array",
            items: {
              type: "object",
              required: ["email"],
              properties: {
                email: { type: "string", format: "email" },
                name: { type: "string" },
              },
            },
          },
          expires: { type: "string", format: "date-time" },
          sendEmail: { type: "boolean", default: true },
        },
      },
      ApiKey: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          keyPrefix: { type: "string" },
          scopes: { type: "array", items: { type: "string" } },
          active: { type: "boolean" },
          lastUsedAt: { type: "string", format: "date-time", nullable: true },
          expiresAt: { type: "string", format: "date-time", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      CreateApiKey: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1 },
          scopes: { type: "array", items: { type: "string" } },
          expiresAt: { type: "string", format: "date-time" },
        },
      },
      AuditEvent: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          action: { type: "string" },
          actor: { type: "string" },
          actorType: { type: "string", enum: ["user", "apikey", "anonymous"] },
          targetType: { type: "string", nullable: true },
          targetId: { type: "string", nullable: true },
          details: { type: "object", nullable: true },
          ipAddress: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string" },
        },
      },
    },
  },
  security: [{ BearerApiKey: [] }, { CookieSession: [] }],
  paths: {
    // ── Issuers ──
    "/api/issuers": {
      get: {
        tags: ["Issuers"],
        summary: "List all issuers",
        responses: {
          "200": { description: "Array of issuers", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Issuer" } } } } },
        },
      },
      post: {
        tags: ["Issuers"],
        summary: "Create issuer (auto-generates Ed25519 signing key)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateIssuer" } } } },
        responses: {
          "201": { description: "Created issuer", content: { "application/json": { schema: { $ref: "#/components/schemas/Issuer" } } } },
          "400": { description: "Validation error" },
        },
      },
    },
    "/api/issuers/{id}": {
      get: {
        tags: ["Issuers"],
        summary: "Get issuer by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": { description: "Issuer details", content: { "application/json": { schema: { $ref: "#/components/schemas/Issuer" } } } },
          "404": { description: "Not found" },
        },
      },
      put: {
        tags: ["Issuers"],
        summary: "Update issuer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateIssuer" } } } },
        responses: { "200": { description: "Updated issuer" } },
      },
      delete: {
        tags: ["Issuers"],
        summary: "Delete issuer (cascades to badge classes and assertions)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },

    // ── Badge Classes ──
    "/api/badge-classes": {
      get: {
        tags: ["Badge Classes"],
        summary: "List badge classes",
        parameters: [{ name: "issuerId", in: "query", schema: { type: "string", format: "uuid" }, description: "Filter by issuer" }],
        responses: { "200": { description: "Array of badge classes", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/BadgeClass" } } } } } },
      },
      post: {
        tags: ["Badge Classes"],
        summary: "Create badge class",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBadgeClass" } } } },
        responses: { "201": { description: "Created badge class" }, "400": { description: "Validation error" } },
      },
    },
    "/api/badge-classes/{id}": {
      get: {
        tags: ["Badge Classes"],
        summary: "Get badge class by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Badge class details" }, "404": { description: "Not found" } },
      },
      put: {
        tags: ["Badge Classes"],
        summary: "Update badge class",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateBadgeClass" } } } },
        responses: { "200": { description: "Updated badge class" } },
      },
      delete: {
        tags: ["Badge Classes"],
        summary: "Delete badge class",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Deleted" } },
      },
    },

    // ── Assertions ──
    "/api/assertions": {
      get: {
        tags: ["Assertions"],
        summary: "List assertions",
        parameters: [
          { name: "badgeClassId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "recipientEmail", in: "query", schema: { type: "string", format: "email" } },
        ],
        responses: { "200": { description: "Array of assertions", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Assertion" } } } } } },
      },
      post: {
        tags: ["Assertions"],
        summary: "Issue a badge (create assertion)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/IssueAssertion" } } } },
        responses: { "201": { description: "Created assertion" }, "400": { description: "Validation error" }, "404": { description: "Badge class not found" } },
      },
    },
    "/api/assertions/bulk": {
      post: {
        tags: ["Assertions"],
        summary: "Bulk issue badges to multiple recipients",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/BulkIssue" } } } },
        responses: { "201": { description: "Array of created assertions" } },
      },
    },
    "/api/assertions/{id}": {
      get: {
        tags: ["Assertions"],
        summary: "Get assertion by ID",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Assertion details" }, "404": { description: "Not found" } },
      },
    },
    "/api/assertions/{id}/revoke": {
      post: {
        tags: ["Assertions"],
        summary: "Revoke an assertion",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { content: { "application/json": { schema: { type: "object", properties: { reason: { type: "string" } } } } } },
        responses: { "200": { description: "Revoked assertion" } },
      },
    },
    "/api/assertions/{id}/resend-email": {
      post: {
        tags: ["Assertions"],
        summary: "Resend badge notification email",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Email sent" }, "404": { description: "Not found" }, "500": { description: "Email delivery failed" } },
      },
    },

    // ── API Keys ──
    "/api/api-keys": {
      get: {
        tags: ["API Keys"],
        summary: "List API keys (raw key is never returned)",
        responses: { "200": { description: "Array of API keys", content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/ApiKey" } } } } } },
      },
      post: {
        tags: ["API Keys"],
        summary: "Create API key (raw key returned once)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CreateApiKey" } } } },
        responses: {
          "201": {
            description: "Created API key with raw key",
            content: { "application/json": { schema: {
              allOf: [{ $ref: "#/components/schemas/ApiKey" }, { type: "object", properties: { key: { type: "string", description: "Raw API key — shown only once" }, _notice: { type: "string" } } }],
            } } },
          },
        },
      },
    },
    "/api/api-keys/{id}": {
      delete: {
        tags: ["API Keys"],
        summary: "Revoke an API key",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "204": { description: "Revoked" } },
      },
    },

    // ── Audit Events ──
    "/api/audit-events": {
      get: {
        tags: ["Audit Events"],
        summary: "List audit events (newest first)",
        parameters: [
          { name: "action", in: "query", schema: { type: "string" }, description: "Filter by action (e.g. badge.issued)" },
          { name: "actor", in: "query", schema: { type: "string" }, description: "Filter by actor (substring match)" },
          { name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": {
            description: "Paginated audit events",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                events: { type: "array", items: { $ref: "#/components/schemas/AuditEvent" } },
                total: { type: "integer" },
                limit: { type: "integer" },
                offset: { type: "integer" },
              },
            } } },
          },
        },
      },
    },

    // ── Uploads ──
    "/api/uploads": {
      post: {
        tags: ["Uploads"],
        summary: "Upload a badge image (max 5MB, png/jpg/svg/webp)",
        requestBody: {
          required: true,
          content: { "multipart/form-data": { schema: { type: "object", required: ["image"], properties: { image: { type: "string", format: "binary" } } } } },
        },
        responses: {
          "201": {
            description: "Upload result",
            content: { "application/json": { schema: { type: "object", properties: { imageUrl: { type: "string" }, filename: { type: "string" }, originalName: { type: "string" }, size: { type: "integer" } } } } },
          },
        },
      },
    },

    // ── Auth ──
    "/auth/login": {
      get: {
        tags: ["Auth"],
        summary: "Redirect to OIDC provider login",
        security: [],
        responses: { "302": { description: "Redirect to OIDC provider" }, "501": { description: "OIDC not configured" } },
      },
    },
    "/auth/callback": {
      get: {
        tags: ["Auth"],
        summary: "OIDC callback (exchanges code for session)",
        security: [],
        parameters: [
          { name: "code", in: "query", required: true, schema: { type: "string" } },
          { name: "state", in: "query", required: true, schema: { type: "string" } },
        ],
        responses: { "302": { description: "Redirect to frontend with session cookie set" } },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        responses: {
          "200": {
            description: "User info",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                authenticated: { type: "boolean" },
                type: { type: "string", enum: ["oidc", "apikey"] },
                user: { type: "object", properties: { sub: { type: "string" }, email: { type: "string" }, name: { type: "string" } } },
              },
            } } },
          },
        },
      },
    },
    "/auth/config": {
      get: {
        tags: ["Auth"],
        summary: "Get auth configuration",
        security: [],
        responses: {
          "200": {
            description: "Auth config",
            content: { "application/json": { schema: { type: "object", properties: { authDisabled: { type: "boolean" }, oidcEnabled: { type: "boolean" } } } } },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout (clears session cookie)",
        responses: { "200": { description: "Logged out" } },
      },
    },

    // ── Verification (public) ──
    "/verify/{id}": {
      get: {
        tags: ["Verification"],
        summary: "Verify an assertion by ID",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Verification result",
            content: { "application/json": { schema: {
              type: "object",
              properties: { valid: { type: "boolean" }, reason: { type: "string" }, assertion: { type: "object" }, badgeClass: { type: "object" }, issuer: { type: "object" } },
            } } },
          },
        },
      },
    },
    "/verify/{id}/check-recipient": {
      post: {
        tags: ["Verification"],
        summary: "Check if email matches assertion recipient",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["email"], properties: { email: { type: "string", format: "email" } } } } } },
        responses: { "200": { description: "Match result", content: { "application/json": { schema: { type: "object", properties: { match: { type: "boolean" } } } } } } },
      },
    },
    "/verify/{id}/baked-image": {
      get: {
        tags: ["Verification"],
        summary: "Download baked badge PNG with embedded assertion",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Baked PNG image", content: { "image/png": { schema: { type: "string", format: "binary" } } } }, "404": { description: "Not found" } },
      },
    },

    // ── OB 2.0 JSON-LD (public) ──
    "/ob/issuers/{id}": {
      get: {
        tags: ["OpenBadges 2.0"],
        summary: "Issuer Profile (JSON-LD)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OB 2.0 Issuer Profile", content: { "application/ld+json": { schema: { type: "object" } } } } },
      },
    },
    "/ob/issuers/{issuerId}/keys/{keyId}": {
      get: {
        tags: ["OpenBadges 2.0"],
        summary: "Public key (CryptographicKey JSON-LD)",
        security: [],
        parameters: [
          { name: "issuerId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          { name: "keyId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: { "200": { description: "CryptographicKey" } },
      },
    },
    "/ob/badge-classes/{id}": {
      get: {
        tags: ["OpenBadges 2.0"],
        summary: "BadgeClass (JSON-LD)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OB 2.0 BadgeClass" } },
      },
    },
    "/ob/assertions/{id}": {
      get: {
        tags: ["OpenBadges 2.0"],
        summary: "Assertion (JSON-LD, for hosted verification)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OB 2.0 Assertion" } },
      },
    },
    "/ob/issuers/{id}/revocations": {
      get: {
        tags: ["OpenBadges 2.0"],
        summary: "Revocation list for an issuer",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "RevocationList JSON-LD" } },
      },
    },

    // ── OB 3.0 JSON-LD (public) ──
    "/ob3/issuers/{id}": {
      get: {
        tags: ["OpenBadges 3.0"],
        summary: "Issuer Profile (OBv3, with Multikey verification method)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OBv3 Profile JSON-LD", content: { "application/ld+json": { schema: { type: "object" } } } } },
      },
    },
    "/ob3/achievements/{id}": {
      get: {
        tags: ["OpenBadges 3.0"],
        summary: "Achievement (OBv3, replaces BadgeClass)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OBv3 Achievement JSON-LD" } },
      },
    },
    "/ob3/credentials/{id}": {
      get: {
        tags: ["OpenBadges 3.0"],
        summary: "AchievementCredential (OBv3, signed with DataIntegrityProof)",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "OBv3 OpenBadgeCredential (VerifiableCredential)" } },
      },
    },
    "/ob3/issuers/{id}/revocations": {
      get: {
        tags: ["OpenBadges 3.0"],
        summary: "1EdTech Revocation List",
        security: [],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "1EdTechRevocationList JSON-LD" } },
      },
    },

    // ── Health ──
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        security: [],
        responses: { "200": { description: "OK", content: { "application/json": { schema: { type: "object", properties: { status: { type: "string" }, timestamp: { type: "string", format: "date-time" } } } } } } },
      },
    },
  },
  tags: [
    { name: "Issuers", description: "Manage badge issuers" },
    { name: "Badge Classes", description: "Manage badge class definitions" },
    { name: "Assertions", description: "Issue, list, and revoke badges" },
    { name: "API Keys", description: "Manage API keys for programmatic access" },
    { name: "Audit Events", description: "View activity log" },
    { name: "Uploads", description: "Upload badge images" },
    { name: "Auth", description: "OIDC authentication" },
    { name: "Verification", description: "Public badge verification" },
    { name: "OpenBadges 2.0", description: "OB 2.0 JSON-LD endpoints (public)" },
    { name: "OpenBadges 3.0", description: "OB 3.0 Verifiable Credentials endpoints (public)" },
    { name: "Health", description: "Server health" },
  ],
};

export function setupSwagger(app: Express) {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(spec, {
    customSiteTitle: "OpenBadge API Docs",
  }));
  app.get("/api/docs.json", (_req, res) => res.json(spec));
}
