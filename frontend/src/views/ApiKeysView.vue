<template>
  <div>
    <div class="page-header">
      <h1>API Keys</h1>
      <button class="btn btn-primary" @click="showForm = !showForm">
        <svg v-if="!showForm" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        {{ showForm ? 'Cancel' : 'New API Key' }}
      </button>
    </div>

    <div v-if="showForm" class="card card-accent" style="margin-bottom: 24px;">
      <h2>Create API Key</h2>
      <p class="text-muted" style="font-size: 13px; margin-bottom: 20px;">
        The key will only be shown once after creation. Store it securely.
      </p>
      <form @submit.prevent="handleCreate">
        <div class="form-group">
          <label>Name *</label>
          <input v-model="form.name" required placeholder="e.g. CI Pipeline, LMS Integration" />
        </div>
        <div class="form-group">
          <label>Expiration (optional)</label>
          <input v-model="form.expiresAt" type="datetime-local" />
        </div>
        <button type="submit" class="btn btn-gold" :disabled="saving">
          {{ saving ? 'Creating...' : 'Create API Key' }}
        </button>
      </form>
    </div>

    <div v-if="newKey" class="card card-accent" style="margin-bottom: 24px;">
      <h2>API Key Created</h2>
      <p class="text-muted" style="font-size: 13px; margin-bottom: 12px;">
        Copy this key now. It will not be shown again.
      </p>
      <div style="display: flex; gap: 8px; align-items: center;">
        <code style="flex: 1; padding: 10px 14px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; font-size: 13px; word-break: break-all;">{{ newKey }}</code>
        <button class="btn btn-outline btn-sm" @click="copyKey">{{ copied ? 'Copied!' : 'Copy' }}</button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div v-if="loading" class="card-grid">
      <div v-for="n in 2" :key="n" class="skeleton-card">
        <div class="skeleton skeleton-heading" style="width: 50%;"></div>
        <div class="skeleton skeleton-text w-3/4"></div>
        <div class="skeleton skeleton-text w-1/2"></div>
      </div>
    </div>

    <template v-else>
      <div class="card-grid">
        <div class="card" v-for="key in apiKeys" :key="key.id">
          <div class="card-body">
            <h3>{{ key.name }}</h3>
            <div class="card-meta">
              Prefix: <code>{{ key.keyPrefix }}...</code>
            </div>
            <div class="card-meta">
              Created: {{ new Date(key.createdAt).toLocaleDateString() }}
            </div>
            <div v-if="key.lastUsedAt" class="card-meta">
              Last used: {{ new Date(key.lastUsedAt).toLocaleDateString() }}
            </div>
            <div v-if="key.expiresAt" class="card-meta">
              Expires: {{ new Date(key.expiresAt).toLocaleDateString() }}
            </div>
            <span
              class="badge-tag"
              :style="{ background: key.active ? 'var(--success)' : 'var(--danger)', color: '#fff' }"
            >
              {{ key.active ? 'Active' : 'Revoked' }}
            </span>
          </div>
          <div class="actions">
            <button
              v-if="key.active"
              class="btn btn-danger btn-sm"
              @click="handleRevoke(key.id, key.name)"
            >
              Revoke
            </button>
          </div>
        </div>
      </div>

      <div v-if="apiKeys.length === 0 && !showForm" class="card">
        <div class="empty-state">No API keys yet. Create one to enable programmatic access.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getApiKeys, createApiKey, revokeApiKey } from "../services/api";

const apiKeys = ref<any[]>([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const error = ref("");
const newKey = ref("");
const copied = ref(false);
const form = ref({ name: "", expiresAt: "" });

async function load() {
  try {
    apiKeys.value = (await getApiKeys()).data as any[];
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleCreate() {
  saving.value = true;
  error.value = "";
  newKey.value = "";
  try {
    const payload: any = { name: form.value.name };
    if (form.value.expiresAt) {
      payload.expiresAt = new Date(form.value.expiresAt).toISOString();
    }
    const res = await createApiKey(payload);
    newKey.value = res.data.key;
    form.value = { name: "", expiresAt: "" };
    showForm.value = false;
    await load();
  } catch (e: any) {
    error.value = e.response?.data?.error?.fieldErrors
      ? JSON.stringify(e.response.data.error.fieldErrors)
      : "Failed to create API key";
  } finally {
    saving.value = false;
  }
}

async function handleRevoke(id: string, name: string) {
  if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
  await revokeApiKey(id);
  await load();
}

function copyKey() {
  navigator.clipboard.writeText(newKey.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>
