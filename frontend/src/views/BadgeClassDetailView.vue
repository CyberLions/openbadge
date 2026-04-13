<template>
  <div>
    <!-- Skeleton -->
    <div v-if="loading">
      <div class="skeleton skeleton-heading" style="width: 35%; height: 26px; margin-bottom: 28px;"></div>
      <div class="skeleton-card" style="margin-bottom: 16px;">
        <div style="display: flex; gap: 24px; align-items: flex-start;">
          <div class="skeleton skeleton-badge-img"></div>
          <div style="flex: 1;">
            <div v-for="n in 4" :key="n" class="skeleton skeleton-text" :style="{ width: (75 - n * 10) + '%' }"></div>
            <div style="display: flex; gap: 6px; margin-top: 12px;">
              <div class="skeleton" style="width: 52px; height: 20px; border-radius: 50px;"></div>
              <div class="skeleton" style="width: 68px; height: 20px; border-radius: 50px;"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="skeleton skeleton-heading" style="width: 22%; margin-top: 40px;"></div>
      <div class="skeleton-card">
        <div v-for="n in 3" :key="n" class="skeleton-table-row">
          <div v-for="c in 4" :key="c" class="skeleton skeleton-table-cell"></div>
        </div>
      </div>
    </div>

    <!-- Live -->
    <div v-else-if="badge">
      <h1>{{ badge.name }}</h1>
      <div class="card card-accent">
        <div class="card-media">
          <img :src="badge.imageUrl" class="badge-img" />
          <div class="card-body">
            <div class="detail-row">
              <span class="label">Issuer</span>
              <span>{{ badge.issuer.name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">Description</span>
              <span>{{ badge.description }}</span>
            </div>
            <div v-if="badge.criteriaNarrative" class="detail-row">
              <span class="label">Criteria</span>
              <span>{{ badge.criteriaNarrative }}</span>
            </div>
            <div v-if="badge.tags?.length" style="padding: 14px 0; border-bottom: 1px solid rgba(0, 53, 102, 0.2);">
              <span class="tag" v-for="tag in badge.tags" :key="tag">{{ tag }}</span>
            </div>
            <div class="detail-row" style="border-bottom: none;">
              <span class="label">OB 2.0 JSON-LD</span>
              <span><a :href="`/ob/badge-classes/${badge.id}`" target="_blank">/ob/badge-classes/{{ badge.id }}</a></span>
            </div>
            <div class="actions">
              <router-link :to="{ path: '/issue', query: { badgeClassId: badge.id } }" class="btn btn-gold">Issue This Badge</router-link>
            </div>
          </div>
        </div>
      </div>

      <hr class="section-divider" />

      <h2>Issued Assertions</h2>
      <div v-if="assertions.length" class="table-wrap">
        <table>
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
      </div>
      <div v-else class="card">
        <div class="empty-state">No assertions issued for this badge class yet.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getBadgeClass, getAssertions } from "../services/api";

const route = useRoute();
const loading = ref(true);
const badge = ref<any>(null);
const assertions = ref<any[]>([]);

onMounted(async () => {
  try {
    const id = route.params.id as string;
    const [bc, asserts] = await Promise.all([
      getBadgeClass(id),
      getAssertions({ badgeClassId: id }),
    ]);
    badge.value = bc.data;
    assertions.value = asserts.data;
  } finally {
    loading.value = false;
  }
});
</script>
