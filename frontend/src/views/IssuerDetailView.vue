<template>
  <div v-if="issuer">
    <h1>{{ issuer.name }}</h1>
    <div class="card">
      <div style="display: flex; gap: 20px; align-items: start;">
        <img v-if="issuer.imageUrl" :src="issuer.imageUrl" style="width: 80px; height: 80px; border-radius: 8px; object-fit: cover;" />
        <div>
          <p><strong>Email:</strong> {{ issuer.email }}</p>
          <p><strong>URL:</strong> <a :href="issuer.url" target="_blank">{{ issuer.url }}</a></p>
          <p v-if="issuer.description"><strong>Description:</strong> {{ issuer.description }}</p>
          <p style="margin-top: 8px;">
            <strong>Signing:</strong> Ed25519 (EdDSA)
            <span v-if="issuer.signingKeys?.length" style="color: var(--success);"> - Active</span>
          </p>
          <p style="margin-top: 4px; font-size: 13px; color: var(--text-muted);">
            OB 2.0 Profile:
            <a :href="`/ob/issuers/${issuer.id}`" target="_blank">/ob/issuers/{{ issuer.id }}</a>
          </p>
        </div>
      </div>
    </div>

    <h2>Badge Classes</h2>
    <div class="card-grid">
      <div class="card" v-for="bc in issuer.badgeClasses" :key="bc.id">
        <router-link :to="`/badge-classes/${bc.id}`" style="text-decoration: none; color: inherit;">
          <h3>{{ bc.name }}</h3>
          <p style="font-size: 14px; color: var(--text-muted);">{{ bc.description }}</p>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getIssuer } from "../services/api";

const route = useRoute();
const issuer = ref<any>(null);

onMounted(async () => {
  issuer.value = (await getIssuer(route.params.id as string)).data;
});
</script>
