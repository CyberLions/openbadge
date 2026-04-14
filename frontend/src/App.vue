<template>
  <div v-if="ready">
    <!-- Public pages (badge viewing) — no sidebar -->
    <template v-if="isPublicRoute">
      <router-view />
    </template>

    <!-- Login required but not logged in -->
    <template v-else-if="authRequired && !user">
      <div class="login-page">
        <div class="login-card">
          <svg class="brand-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4L6 14v20l18 10 18-10V14L24 4z" fill="none" stroke="#ffc300" stroke-width="2"/>
            <path d="M24 8l-14 8v16l14 8 14-8V16L24 8z" fill="rgba(255,195,0,0.08)" stroke="#ffc300" stroke-width="1.5"/>
            <circle cx="24" cy="24" r="8" fill="none" stroke="#5aa9e6" stroke-width="2"/>
            <circle cx="24" cy="24" r="3" fill="#ffc300"/>
            <path d="M24 16v-4M24 32v4M16 24h-4M32 24h4" stroke="#5aa9e6" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <h1>OpenBadge</h1>
          <p>Sign in to manage badges and credentials.</p>
          <a href="/auth/login" class="btn btn-primary" style="display: inline-block; margin-top: 16px;">
            Sign in with SSO
          </a>
        </div>
      </div>
    </template>

    <!-- Authenticated layout -->
    <template v-else>
      <div class="app-layout">
        <aside class="sidebar">
          <div class="sidebar-brand">
            <svg class="brand-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 4L6 14v20l18 10 18-10V14L24 4z" fill="none" stroke="#ffc300" stroke-width="2"/>
              <path d="M24 8l-14 8v16l14 8 14-8V16L24 8z" fill="rgba(255,195,0,0.08)" stroke="#ffc300" stroke-width="1.5"/>
              <circle cx="24" cy="24" r="8" fill="none" stroke="#5aa9e6" stroke-width="2"/>
              <circle cx="24" cy="24" r="3" fill="#ffc300"/>
              <path d="M24 16v-4M24 32v4M16 24h-4M32 24h4" stroke="#5aa9e6" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <h2>OpenBadge</h2>
            <div class="brand-sub">Credential Platform</div>
          </div>
          <nav>
            <router-link to="/">
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
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getAuthConfig, getAuthMe, authLogout } from "./services/api";

const route = useRoute();
const user = ref<{ sub: string; email?: string; name?: string } | null>(null);
const authConfig = ref<{ authDisabled: boolean; oidcEnabled: boolean } | null>(null);
const ready = ref(false);

const isPublicRoute = computed(() => route.meta.public === true);
const authRequired = computed(() => {
  if (!authConfig.value) return false;
  return !authConfig.value.authDisabled && authConfig.value.oidcEnabled;
});

onMounted(async () => {
  try {
    const cfgRes = await getAuthConfig();
    authConfig.value = cfgRes.data;
  } catch { /* auth config endpoint not available — treat as no auth */ }

  try {
    const meRes = await getAuthMe();
    if (meRes.data.authenticated) {
      user.value = meRes.data.user;
    }
  } catch { /* not authenticated */ }

  ready.value = true;
});

async function handleLogout() {
  try {
    await authLogout();
  } catch { /* ignore */ }
  user.value = null;
  window.location.reload();
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
</style>
