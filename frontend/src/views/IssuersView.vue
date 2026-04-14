<template>
  <div>
    <div class="page-header">
      <h1>Issuers</h1>
      <button class="btn btn-primary" @click="showForm = !showForm">
        <svg v-if="!showForm" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        {{ showForm ? 'Cancel' : 'New Issuer' }}
      </button>
    </div>

    <div v-if="showForm" class="card card-accent" style="margin-bottom: 24px;">
      <h2>Create Issuer</h2>
      <p class="text-muted" style="font-size: 13px; margin-bottom: 20px;">
        An Ed25519 signing key pair will be generated automatically.
      </p>
      <form @submit.prevent="handleCreate">
        <div class="form-row">
          <div class="form-group">
            <label>Name *</label>
            <input v-model="form.name" required placeholder="Organization name" />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input v-model="form.email" type="email" required placeholder="badges@example.org" />
          </div>
        </div>
        <div class="form-group">
          <label>URL *</label>
          <input v-model="form.url" type="url" required placeholder="https://example.org" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="form.description" placeholder="About this issuer..."></textarea>
        </div>
        <div class="form-group">
          <label>LinkedIn Organization Name</label>
          <input v-model="form.linkedInOrganizationName" placeholder="Company name as it appears on LinkedIn" />
        </div>
        <div class="form-group">
          <label>Logo Image</label>
          <input type="file" accept="image/*" @change="handleImageUpload" />
          <img v-if="form.imageUrl" :src="form.imageUrl" class="badge-image-preview" style="margin-top: 8px;" />
        </div>
        <button type="submit" class="btn btn-gold" :disabled="saving">
          {{ saving ? 'Creating...' : 'Create Issuer' }}
        </button>
      </form>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Skeleton: card grid -->
    <div v-if="loading" class="card-grid">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div class="skeleton skeleton-avatar"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-heading" style="width: 60%;"></div>
            <div class="skeleton skeleton-text w-1/2"></div>
            <div class="skeleton skeleton-text w-3/4"></div>
            <div class="skeleton skeleton-text w-1/3"></div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    </div>

    <!-- Live: card grid -->
    <template v-else>
      <div class="card-grid">
        <div class="card" v-for="issuer in issuers" :key="issuer.id">
          <div class="card-media">
            <img v-if="issuer.imageUrl" :src="issuer.imageUrl" class="avatar-sm" />
            <div class="card-body">
              <h3>{{ issuer.name }}</h3>
              <div class="card-meta">{{ issuer.email }}</div>
              <p v-if="issuer.description" class="card-description">{{ issuer.description }}</p>
              <div class="card-meta mt-md">
                {{ issuer._count?.badgeClasses || 0 }} badge classes
              </div>
            </div>
          </div>
          <div class="actions">
            <router-link :to="`/issuers/${issuer.id}`" class="btn btn-outline btn-sm">View</router-link>
            <button class="btn btn-danger btn-sm" @click="handleDelete(issuer.id)">Delete</button>
          </div>
        </div>
      </div>

      <div v-if="issuers.length === 0 && !showForm" class="card">
        <div class="empty-state">No issuers yet. Create one to start issuing badges.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getIssuers, createIssuer, deleteIssuer, uploadImage } from "../services/api";

const issuers = ref<any[]>([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const error = ref("");
const form = ref({ name: "", url: "", email: "", description: "", imageUrl: "", linkedInOrganizationName: "" });

async function load() {
  try {
    issuers.value = (await getIssuers()).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const res = await uploadImage(file);
  form.value.imageUrl = res.data.imageUrl;
}

async function handleCreate() {
  saving.value = true;
  error.value = "";
  try {
    await createIssuer(form.value);
    form.value = { name: "", url: "", email: "", description: "", imageUrl: "", linkedInOrganizationName: "" };
    showForm.value = false;
    await load();
  } catch (e: any) {
    error.value = e.response?.data?.error?.fieldErrors
      ? JSON.stringify(e.response.data.error.fieldErrors)
      : "Failed to create issuer";
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string) {
  if (!confirm("Delete this issuer and all its badge classes?")) return;
  await deleteIssuer(id);
  await load();
}
</script>

<style scoped>
.card-description {
  font-size: 13px;
  margin-top: 6px;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
