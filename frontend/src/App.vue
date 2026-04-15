<template>
  <!-- OIDC redirect in progress — show immediately, don't wait for ready -->
  <div v-if="oidcRedirecting" class="login-page">
    <div class="login-card">
      <img class="brand-icon" src="/logo.svg" alt="OpenBadge" />
      <h1>OpenBadge</h1>
      <p>Redirecting to SSO provider...</p>
      <a href="/auth/login" class="btn btn-primary" style="display: inline-block; margin-top: 16px;">
        Sign in with SSO
      </a>
    </div>
  </div>

  <div v-else-if="ready">
    <!-- Public pages (badge viewing, landing, invite claim) — no sidebar -->
    <template v-if="isPublicRoute">
      <router-view />
    </template>

    <!-- Login required but not logged in (password mode) -->
    <template v-else-if="authRequired && !user">

      <!-- Password mode: show login form -->
      <div v-if="authConfig?.passwordEnabled" class="login-page">
        <div class="login-card" style="max-width: 420px;">
          <img class="brand-icon" src="/logo.svg" alt="OpenBadge" />
          <h1>OpenBadge</h1>
          <p>Sign in to manage badges and credentials.</p>

          <div v-if="loginError" class="alert alert-error" style="margin-top: 16px; text-align: left;">{{ loginError }}</div>

          <div style="margin-top: 20px;">
            <div v-if="!showRegister">
              <form @submit.prevent="handlePasswordLogin" style="text-align: left;">
                <div class="form-group">
                  <label>Username or Email</label>
                  <input v-model="loginUsername" type="text" required placeholder="admin" autocomplete="username" />
                </div>
                <div class="form-group">
                  <label>Password</label>
                  <input v-model="loginPassword" type="password" required placeholder="********" autocomplete="current-password" />
                </div>
                <button type="submit" class="btn btn-gold" style="width: 100%;" :disabled="loggingIn">
                  {{ loggingIn ? 'Signing in...' : 'Sign In' }}
                </button>
              </form>
              <p v-if="authConfig?.registrationOpen" style="margin-top: 12px; font-size: 13px; color: var(--text-muted);">
                No account? <a href="#" @click.prevent="showRegister = true" style="color: var(--gold);">Create one</a>
              </p>
            </div>

            <div v-else>
              <form @submit.prevent="handleRegister" style="text-align: left;">
                <div class="form-group">
                  <label>Username</label>
                  <input v-model="regUsername" type="text" required placeholder="admin" autocomplete="username" />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input v-model="regEmail" type="email" required placeholder="admin@example.com" autocomplete="email" />
                </div>
                <div class="form-group">
                  <label>Name (optional)</label>
                  <input v-model="regName" type="text" placeholder="John Doe" autocomplete="name" />
                </div>
                <div class="form-group">
                  <label>Password (min 8 chars)</label>
                  <input v-model="regPassword" type="password" required minlength="8" placeholder="********" autocomplete="new-password" />
                </div>
                <button type="submit" class="btn btn-gold" style="width: 100%;" :disabled="loggingIn">
                  {{ loggingIn ? 'Creating account...' : 'Create Account' }}
                </button>
              </form>
              <p style="margin-top: 12px; font-size: 13px; color: var(--text-muted);">
                Already have an account? <a href="#" @click.prevent="showRegister = false" style="color: var(--gold);">Sign in</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Authenticated layout -->
    <template v-else>
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <img class="brand-icon" src="/logo.svg" alt="OpenBadge" />
            <h2>OpenBadge</h2>
            <div class="brand-sub">Credential Platform</div>
          </div>
          <nav>
            <router-link to="/dashboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              Dashboard
            </router-link>
            <router-link to="/issuers">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Issuers
            </router-link>
            <router-link to="/badge-classes">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
              Badge Classes
            </router-link>
            <router-link to="/issue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              Issue Badge
            </router-link>
            <router-link to="/assertions">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
                <rect x="9" y="3" width="6" height="4" rx="1"/>
                <path d="m9 14 2 2 4-4"/>
              </svg>
              Issued Badges
            </router-link>
            <router-link to="/api-keys">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
              </svg>
              API Keys
            </router-link>
            <router-link to="/activity">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              Activity Log
            </router-link>
          </nav>
          <div class="sidebar-footer">
            <div v-if="user" class="sidebar-user">
              <div class="sidebar-user-name">{{ user.name || user.email || user.sub }}</div>
              <button class="btn btn-outline btn-sm" style="width: 100%; margin-top: 6px;" @click="handleLogout">Logout</button>
            </div>
            <div style="margin-top: 8px; font-size: 11px; color: var(--text-muted); text-align: center;">OB 2.0 + 3.0 Compliant</div>
          </div>
        </aside>

        <main class="main-content">
          <router-view />
        </main>

        <aside class="help-sidebar">
          <div class="help-sidebar-header">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Guide
          </div>
          <div class="help-sidebar-content">
            <template v-if="currentHelp">
              <h4>{{ currentHelp.title }}</h4>
              <div class="help-steps">
                <div v-for="(step, i) in currentHelp.steps" :key="i" class="help-step">
                  <span class="help-step-num">{{ i + 1 }}</span>
                  <span>{{ step }}</span>
                </div>
              </div>
              <div v-if="currentHelp.tips?.length" class="help-tips">
                <div class="help-tips-title">Tips</div>
                <ul>
                  <li v-for="(tip, i) in currentHelp.tips" :key="i">{{ tip }}</li>
                </ul>
              </div>
            </template>
          </div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { getAuthConfig, getAuthMe, authLogout } from "./services/api";

const route = useRoute();
const router = useRouter();
const user = ref<{ sub: string; email?: string; name?: string } | null>(null);
const authConfig = ref<{
  authDisabled: boolean;
  oidcEnabled: boolean;
  passwordEnabled: boolean;
  registrationOpen: boolean;
  authMode: string;
} | null>(null);
const ready = ref(false);
const oidcRedirecting = ref(false);

// Password login state
const loginUsername = ref("");
const loginPassword = ref("");
const loginError = ref("");
const loggingIn = ref(false);
const showRegister = ref(false);
const regUsername = ref("");
const regEmail = ref("");
const regName = ref("");
const regPassword = ref("");

const isPublicRoute = computed(() => route.meta.public === true);
const authRequired = computed(() => {
  if (!authConfig.value) return false;
  return !authConfig.value.authDisabled;
});

// ── Contextual help per route ──
const helpContent: Record<string, { title: string; steps: string[]; tips?: string[] }> = {
  dashboard: {
    title: "Dashboard",
    steps: [
      "View your credential platform at a glance — total issuers, badge classes, and issued badges.",
      "The recent badges table shows the latest issuances with quick links to each badge.",
      "Click any stat card to navigate to the relevant section.",
    ],
    tips: [
      "Stats refresh automatically every 30 seconds.",
    ],
  },
  issuers: {
    title: "Issuers",
    steps: [
      "Create an issuer to represent your organization. Each issuer gets its own Ed25519 signing key.",
      "Provide a name, URL, and email — these appear on every badge.",
      "After creation, click into an issuer to see its OB 2.0/3.0 profile links and signing key status.",
    ],
    tips: [
      "You can have multiple issuers for different departments or programs.",
      "The issuer detail page has a static export feature for offline verification.",
    ],
  },
  "issuer-detail": {
    title: "Issuer Details",
    steps: [
      "View and edit your issuer's profile, signing keys, and badge classes.",
      "Use the OBv2 and OBv3 profile links to test your issuer's public JSON-LD endpoints.",
      "Download a static export to host badge verification on GitHub Pages without this server.",
    ],
    tips: [
      "The static export includes a self-contained HTML verifier that works entirely client-side.",
    ],
  },
  "badge-classes": {
    title: "Badge Classes",
    steps: [
      "Define a badge class for each credential type you want to issue.",
      "Each badge class needs a name, description, image, and parent issuer.",
      "Optionally add criteria (URL or narrative) and tags for categorization.",
    ],
    tips: [
      "Badge images should be square PNGs for best results with badge baking.",
      "Tags help recipients and verifiers understand the credential's domain.",
    ],
  },
  "badge-class-detail": {
    title: "Badge Class Details",
    steps: [
      "Review and edit your badge class definition.",
      "View the OB 2.0 JSON-LD endpoint for this badge class.",
      "See all assertions issued under this badge class.",
    ],
  },
  "issue-badge": {
    title: "Issue a Badge",
    steps: [
      "Single Issue: select a badge class, enter the recipient's email, and issue immediately.",
      "Bulk Issue: paste comma-separated recipients or upload a CSV file with email and name columns.",
      "Invite to Claim: send an invite link — the recipient confirms their details before the badge is signed.",
    ],
    tips: [
      "Use invites when you want the recipient to verify their own email address.",
      "CSV files must have an 'email' column header. A 'name' column is optional.",
      "Evidence URLs and narratives are recorded in the signed assertion.",
    ],
  },
  assertions: {
    title: "Issued Badges",
    steps: [
      "View all badges that have been issued across all issuers and badge classes.",
      "Filter by badge class or recipient email to find specific assertions.",
      "Revoke a badge by clicking the revoke button — provide a reason for the audit trail.",
    ],
    tips: [
      "Revoked badges are still visible but will show as invalid during verification.",
      "You can resend the notification email if the recipient didn't receive it.",
    ],
  },
  "api-keys": {
    title: "API Keys",
    steps: [
      "Create API keys for programmatic access — CI/CD pipelines, scripts, or integrations.",
      "The raw key is shown only once at creation time. Copy and store it securely.",
      "Revoke keys that are no longer needed.",
    ],
    tips: [
      "API keys use Bearer token authentication: Authorization: Bearer ob_xxx...",
      "Set expiration dates on keys used for temporary integrations.",
    ],
  },
  "activity-log": {
    title: "Activity Log",
    steps: [
      "Review all actions taken on the platform — badge issuance, revocations, logins, and key management.",
      "Filter by action type, actor, or date range.",
      "Each entry includes the IP address and detailed context.",
    ],
    tips: [
      "The audit log is append-only and cannot be modified.",
    ],
  },
};

const currentHelp = computed(() => {
  const name = route.name as string;
  return helpContent[name] || helpContent["dashboard"];
});

function triggerOidcRedirect() {
  if (oidcRedirecting.value) return;
  oidcRedirecting.value = true;
  user.value = null;
  // Use replace so the 401 page isn't in browser history
  window.location.replace("/auth/login");
}

// ── Auth expiry: intercept 401s and retrigger login ──
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPublicRoute.value) {
      if (authConfig.value?.oidcEnabled) {
        triggerOidcRedirect();
      } else {
        user.value = null;
        // For password mode, the template will show the login form automatically
      }
    }
    return Promise.reject(error);
  }
);

onMounted(async () => {
  // Wait for router to resolve so route.meta is accurate
  await router.isReady();

  try {
    const cfgRes = await getAuthConfig();
    authConfig.value = cfgRes.data;
  } catch { /* auth config endpoint not available — treat as no auth */ }

  // Skip auth check entirely for public routes
  if (isPublicRoute.value) {
    ready.value = true;
    return;
  }

  try {
    const meRes = await getAuthMe();
    if (meRes.data.authenticated) {
      user.value = meRes.data.user;
    }
  } catch { /* not authenticated */ }

  // If OIDC mode and trying to access a protected route while not logged in, redirect
  if (authConfig.value?.oidcEnabled && !user.value) {
    triggerOidcRedirect();
    return;
  }

  ready.value = true;
});

async function handlePasswordLogin() {
  loggingIn.value = true;
  loginError.value = "";
  try {
    const res = await axios.post("/auth/login", {
      username: loginUsername.value,
      password: loginPassword.value,
    });
    if (res.data.success) {
      user.value = res.data.user;
    }
  } catch (e: any) {
    loginError.value = e.response?.data?.error || "Login failed";
  } finally {
    loggingIn.value = false;
  }
}

async function handleRegister() {
  loggingIn.value = true;
  loginError.value = "";
  try {
    const res = await axios.post("/auth/register", {
      username: regUsername.value,
      email: regEmail.value,
      name: regName.value || undefined,
      password: regPassword.value,
    });
    if (res.data.success) {
      user.value = res.data.user;
    }
  } catch (e: any) {
    loginError.value = e.response?.data?.error || "Registration failed";
  } finally {
    loggingIn.value = false;
  }
}

async function handleLogout() {
  try {
    await authLogout();
  } catch { /* ignore */ }
  user.value = null;
  window.location.href = "/";
}
</script>

<style>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg);
}
.login-card {
  text-align: center;
  padding: 48px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  max-width: 400px;
}
.login-card h1 {
  margin: 16px 0 8px;
  font-size: 24px;
}
.login-card p {
  color: var(--text-muted);
  font-size: 14px;
}
.login-card .brand-icon {
  width: 64px;
  height: 64px;
}

/* ── Help Sidebar ── */
.help-sidebar {
  width: 240px;
  height: 100vh;
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, #000c1f 0%, #000a18 100%);
  border-left: 1px solid var(--border);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.help-sidebar-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 20px 18px 14px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}
.help-sidebar-header svg {
  opacity: 0.5;
}
.help-sidebar-content {
  padding: 18px;
  flex: 1;
}
.help-sidebar-content h4 {
  font-size: 14px;
  font-weight: 700;
  color: var(--gold);
  margin-bottom: 14px;
  letter-spacing: 0.3px;
}
.help-sidebar-content h4::after {
  display: none;
}
.help-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.help-step {
  display: flex;
  gap: 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}
.help-step-num {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 195, 0, 0.1);
  color: var(--gold);
  font-size: 10px;
  font-weight: 700;
  margin-top: 1px;
}
.help-tips {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.help-tips-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--blue-light);
  margin-bottom: 8px;
}
.help-tips ul {
  list-style: none;
  padding: 0;
}
.help-tips li {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  padding: 4px 0;
  padding-left: 12px;
  position: relative;
}
.help-tips li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 10px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--blue-light);
  opacity: 0.5;
}

@media (max-width: 1200px) {
  .help-sidebar {
    display: none;
  }
}
</style>
