<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 style="margin-bottom: 0;">Issuers</h1>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New Issuer' }}
      </button>
    </div>

    <div v-if="showForm" class="card">
      <h2>Create Issuer</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 16px;">
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
          <label>Logo Image</label>
          <input type="file" accept="image/*" @change="handleImageUpload" />
          <img v-if="form.imageUrl" :src="form.imageUrl" class="badge-image-preview" style="margin-top: 8px;" />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Creating...' : 'Create Issuer' }}
        </button>
      </form>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div class="card-grid">
      <div class="card" v-for="issuer in issuers" :key="issuer.id">
        <div style="display: flex; gap: 16px; align-items: start;">
          <img v-if="issuer.imageUrl" :src="issuer.imageUrl" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover;" />
          <div>
            <h3>{{ issuer.name }}</h3>
            <p style="font-size: 13px; color: var(--text-muted);">{{ issuer.email }}</p>
            <p v-if="issuer.description" style="font-size: 14px; margin-top: 4px;">{{ issuer.description }}</p>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
              {{ issuer._count?.badgeClasses || 0 }} badge classes
            </p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getIssuers, createIssuer, deleteIssuer, uploadImage } from "../services/api";

const issuers = ref<any[]>([]);
const showForm = ref(false);
const saving = ref(false);
const error = ref("");
const form = ref({ name: "", url: "", email: "", description: "", imageUrl: "" });

async function load() {
  issuers.value = (await getIssuers()).data;
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
    form.value = { name: "", url: "", email: "", description: "", imageUrl: "" };
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
