<template>
  <div>
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h1 style="margin-bottom: 0;">Badge Classes</h1>
      <button class="btn btn-primary" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New Badge Class' }}
      </button>
    </div>

    <div v-if="showForm" class="card">
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
        <button type="submit" class="btn btn-primary" :disabled="saving || !form.imageUrl">
          {{ saving ? 'Creating...' : 'Create Badge Class' }}
        </button>
      </form>
    </div>

    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div class="card-grid">
      <div class="card" v-for="bc in badgeClasses" :key="bc.id">
        <div style="display: flex; gap: 16px; align-items: start;">
          <img :src="bc.imageUrl" style="width: 64px; height: 64px; border-radius: 8px; object-fit: contain; border: 1px solid var(--border);" />
          <div>
            <h3>{{ bc.name }}</h3>
            <p style="font-size: 13px; color: var(--text-muted);">by {{ bc.issuer.name }}</p>
            <p style="font-size: 14px; margin-top: 4px;">{{ bc.description }}</p>
            <div style="margin-top: 6px;">
              <span class="tag" v-for="tag in bc.tags" :key="tag">{{ tag }}</span>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">
              {{ bc._count?.assertions || 0 }} issued
            </p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getIssuers, getBadgeClasses, createBadgeClass, deleteBadgeClass, uploadImage } from "../services/api";

const badgeClasses = ref<any[]>([]);
const issuers = ref<any[]>([]);
const showForm = ref(false);
const saving = ref(false);
const error = ref("");
const tagsInput = ref("");
const form = ref({ issuerId: "", name: "", description: "", imageUrl: "", criteriaNarrative: "", criteriaUrl: "" });

async function load() {
  const [bc, iss] = await Promise.all([getBadgeClasses(), getIssuers()]);
  badgeClasses.value = bc.data;
  issuers.value = iss.data;
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
