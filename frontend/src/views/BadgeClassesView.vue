<template>
  <div>
    <div class="page-header">
      <h1>Badge Classes</h1>
      <button class="btn btn-primary" @click="showForm = !showForm">
        <svg v-if="!showForm" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        {{ showForm ? 'Cancel' : 'New Badge Class' }}
      </button>
    </div>

    <div v-if="showForm" class="card card-accent" style="margin-bottom: 24px;">
      <h2>Create Badge Class</h2>
      <form @submit.prevent="handleCreate">
        <div class="form-group">
          <label>Issuer *</label>
          <select v-model="form.issuerId" required>
            <option value="">Select an issuer</option>
            <option v-for="i in issuers" :key="i.id" :value="i.id">{{ i.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>Badge Name *</label>
          <input v-model="form.name" required placeholder="e.g. Web Development Fundamentals" />
        </div>
        <div class="form-group">
          <label>Description *</label>
          <textarea v-model="form.description" required placeholder="What this badge recognizes..."></textarea>
        </div>
        <div class="form-group">
          <label>Badge Image *</label>
          <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp" @change="handleImageUpload" />
          <img v-if="form.imageUrl" :src="form.imageUrl" class="badge-image-preview" style="margin-top: 8px;" />
        </div>
        <div class="form-group">
          <label>Criteria Narrative</label>
          <textarea v-model="form.criteriaNarrative" placeholder="What must be done to earn this badge..."></textarea>
        </div>
        <div class="form-group">
          <label>Criteria URL</label>
          <input v-model="form.criteriaUrl" type="url" placeholder="https://example.org/criteria" />
        </div>
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input v-model="tagsInput" placeholder="web, development, html" />
        </div>
        <button type="submit" class="btn btn-gold" :disabled="saving || !form.imageUrl">
          {{ saving ? 'Creating...' : 'Create Badge Class' }}
        </button>
      </form>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Skeleton: card grid -->
    <div v-if="loading" class="card-grid">
      <div v-for="n in 3" :key="n" class="skeleton-card">
        <div style="display: flex; gap: 16px; align-items: flex-start;">
          <div class="skeleton skeleton-badge-img" style="width: 64px; height: 64px;"></div>
          <div style="flex: 1;">
            <div class="skeleton skeleton-heading" style="width: 55%;"></div>
            <div class="skeleton skeleton-text w-1/3"></div>
            <div class="skeleton skeleton-text w-full"></div>
            <div style="display: flex; gap: 6px; margin-top: 8px;">
              <div class="skeleton" style="width: 52px; height: 20px; border-radius: 50px;"></div>
              <div class="skeleton" style="width: 64px; height: 20px; border-radius: 50px;"></div>
            </div>
            <div class="skeleton skeleton-text w-1/4" style="margin-top: 8px;"></div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
          <div class="skeleton skeleton-btn"></div>
        </div>
      </div>
    </div>

    <!-- Live: card grid -->
    <template v-else>
      <div class="card-grid">
        <div class="card" v-for="bc in badgeClasses" :key="bc.id">
          <div class="card-media">
            <img :src="bc.imageUrl" class="badge-img" style="width: 64px; height: 64px;" />
            <div class="card-body">
              <h3>{{ bc.name }}</h3>
              <div class="card-meta">by {{ bc.issuer.name }}</div>
              <p style="font-size: 14px; margin-top: 6px; color: var(--text);">{{ bc.description }}</p>
              <div style="margin-top: 8px;">
                <span class="tag" v-for="tag in bc.tags" :key="tag">{{ tag }}</span>
              </div>
              <div class="card-meta mt-md">
                {{ bc._count?.assertions || 0 }} issued
              </div>
            </div>
          </div>
          <div class="actions">
            <router-link :to="`/badge-classes/${bc.id}`" class="btn btn-outline btn-sm">View</router-link>
            <router-link :to="{ path: '/issue', query: { badgeClassId: bc.id } }" class="btn btn-primary btn-sm">Issue</router-link>
            <button class="btn btn-danger btn-sm" @click="handleDelete(bc.id)">Delete</button>
          </div>
        </div>
      </div>

      <div v-if="badgeClasses.length === 0 && !showForm" class="card">
        <div class="empty-state">No badge classes yet. Create an issuer first, then create a badge class.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getIssuers, getBadgeClasses, createBadgeClass, deleteBadgeClass, uploadImage } from "../services/api";

const badgeClasses = ref<any[]>([]);
const issuers = ref<any[]>([]);
const loading = ref(true);
const showForm = ref(false);
const saving = ref(false);
const error = ref("");
const tagsInput = ref("");
const form = ref({ issuerId: "", name: "", description: "", imageUrl: "", criteriaNarrative: "", criteriaUrl: "" });

async function load() {
  try {
    const [bc, iss] = await Promise.all([getBadgeClasses(), getIssuers()]);
    badgeClasses.value = bc.data;
    issuers.value = iss.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleImageUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    const res = await uploadImage(file);
    form.value.imageUrl = res.data.imageUrl;
  } catch (err: any) {
    error.value = err.response?.status === 413
      ? "Image too large. Maximum upload size is 5 MB."
      : err.response?.data?.error || "Image upload failed";
  }
}

async function handleCreate() {
  saving.value = true;
  error.value = "";
  try {
    const tags = tagsInput.value.split(",").map(t => t.trim()).filter(Boolean);
    await createBadgeClass({ ...form.value, tags });
    form.value = { issuerId: "", name: "", description: "", imageUrl: "", criteriaNarrative: "", criteriaUrl: "" };
    tagsInput.value = "";
    showForm.value = false;
    await load();
  } catch (e: any) {
    error.value = "Failed to create badge class";
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string) {
  if (!confirm("Delete this badge class and all its assertions?")) return;
  await deleteBadgeClass(id);
  await load();
}
</script>
