<template>
  <div>
    <!-- Skeleton -->
    <div v-if="loading">
      <div class="skeleton skeleton-heading" style="width: 30%; height: 26px; margin-bottom: 28px;"></div>
      <div class="skeleton-card" style="margin-bottom: 16px;">
        <div style="display: flex; gap: 20px; align-items: flex-start;">
          <div class="skeleton skeleton-avatar-lg"></div>
          <div style="flex: 1;">
            <div v-for="n in 5" :key="n" class="skeleton skeleton-text" :style="{ width: (70 - n * 8) + '%' }"></div>
          </div>
        </div>
      </div>
      <div class="skeleton skeleton-heading" style="width: 20%; margin-top: 32px;"></div>
      <div class="card-grid">
        <div v-for="n in 2" :key="n" class="skeleton-card">
          <div class="skeleton skeleton-heading" style="width: 50%;"></div>
          <div class="skeleton skeleton-text w-3/4"></div>
        </div>
      </div>
    </div>

    <!-- Live -->
    <div v-else-if="issuer">
      <h1>{{ issuer.name }}</h1>
      <div class="card card-accent">
        <div class="card-media">
          <img v-if="issuer.imageUrl" :src="issuer.imageUrl" class="avatar-lg" />
          <div class="card-body">
            <div class="detail-row">
              <span class="label">Email</span>
              <span>{{ issuer.email }}</span>
            </div>
            <div class="detail-row">
              <span class="label">URL</span>
              <span><a :href="issuer.url" target="_blank">{{ issuer.url }}</a></span>
            </div>
            <div v-if="issuer.description" class="detail-row">
              <span class="label">Description</span>
              <span>{{ issuer.description }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Signing</span>
              <span>
                Ed25519 (EdDSA)
                <span v-if="issuer.signingKeys?.length" class="badge-valid" style="margin-left: 8px;">Active</span>
              </span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="label">OB 2.0 Profile</span>
              <span><a :href="`/ob/issuers/${issuer.id}`" target="_blank">/ob/issuers/{{ issuer.id }}</a></span>
            </div>
          </div>
        </div>
      </div>

      <hr class="section-divider" />

      <h2>Badge Classes</h2>
      <div class="card-grid">
        <div class="card" v-for="bc in issuer.badgeClasses" :key="bc.id">
          <router-link :to="`/badge-classes/${bc.id}`" style="text-decoration: none; color: inherit;">
            <h3>{{ bc.name }}</h3>
            <p style="font-size: 14px; color: var(--text-muted); margin-top: 6px;">{{ bc.description }}</p>
          </router-link>
        </div>
      </div>
      <div v-if="!issuer.badgeClasses?.length" class="card">
        <div class="empty-state">
          No badge classes yet.
          <router-link to="/badge-classes">Create one</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getIssuer } from "../services/api";

const route = useRoute();
const loading = ref(true);
const issuer = ref<any>(null);

onMounted(async () => {
  try {
    issuer.value = (await getIssuer(route.params.id as string)).data;
  } finally {
    loading.value = false;
  }
});
</script>
