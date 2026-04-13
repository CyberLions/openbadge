<template>
  <div v-if="badge">
    <h1>{{ badge.name }}</h1>
    <div class="card">
      <div style="display: flex; gap: 24px; align-items: start;">
        <img :src="badge.imageUrl" style="width: 120px; height: 120px; border-radius: 8px; object-fit: contain; border: 1px solid var(--border);" />
        <div>
          <p><strong>Issuer:</strong> {{ badge.issuer.name }}</p>
          <p style="margin-top: 4px;">{{ badge.description }}</p>
          <p v-if="badge.criteriaNarrative" style="margin-top: 8px;"><strong>Criteria:</strong> {{ badge.criteriaNarrative }}</p>
          <div v-if="badge.tags?.length" style="margin-top: 8px;">
            <span class="tag" v-for="tag in badge.tags" :key="tag">{{ tag }}</span>
          </div>
          <p style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">
            OB 2.0 JSON-LD:
            <a :href="`/ob/badge-classes/${badge.id}`" target="_blank">/ob/badge-classes/{{ badge.id }}</a>
          </p>
          <div class="actions">
            <router-link :to="{ path: '/issue', query: { badgeClassId: badge.id } }" class="btn btn-primary">Issue This Badge</router-link>
          </div>
        </div>
      </div>
    </div>

    <h2>Issued Assertions</h2>
    <table v-if="assertions.length">
      <thead>
        <tr>
          <th>Recipient</th>
          <th>Issued On</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in assertions" :key="a.id">
          <td>{{ a.recipientName || a.recipientEmail }}</td>
          <td>{{ new Date(a.issuedOn).toLocaleDateString() }}</td>
          <td>
            <span v-if="a.revoked" class="badge-revoked">Revoked</span>
            <span v-else class="badge-valid">Valid</span>
          </td>
          <td>
            <router-link :to="`/badges/${a.id}`" class="btn btn-outline btn-sm">View</router-link>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-else class="card">
      <div class="empty-state">No assertions issued for this badge class yet.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getBadgeClass, getAssertions } from "../services/api";

const route = useRoute();
const badge = ref<any>(null);
const assertions = ref<any[]>([]);

onMounted(async () => {
  const id = route.params.id as string;
  const [bc, asserts] = await Promise.all([
    getBadgeClass(id),
    getAssertions({ badgeClassId: id }),
  ]);
  badge.value = bc.data;
  assertions.value = asserts.data;
});
</script>
