<template>
  <div>
    <h1>Dashboard</h1>

    <!-- Skeleton: stat cards -->
    <div v-if="loading" class="stat-grid">
      <div v-for="n in 3" :key="n" class="stat-card">
        <div class="skeleton skeleton-stat"></div>
        <div class="skeleton skeleton-text w-1/2" style="margin: 0 auto;"></div>
      </div>
    </div>

    <!-- Live: stat cards -->
    <div v-else class="stat-grid">
      <div class="stat-card">
        <div class="value">{{ stats.issuers }}</div>
        <div class="label">Issuers</div>
      </div>
      <div class="stat-card">
        <div class="value">{{ stats.badgeClasses }}</div>
        <div class="label">Badge Classes</div>
      </div>
      <div class="stat-card">
        <div class="value">{{ stats.assertions }}</div>
        <div class="label">Badges Issued</div>
      </div>
    </div>

    <h2>Recent Badges Issued</h2>

    <!-- Skeleton: table -->
    <div v-if="loading" class="table-wrap">
      <div style="padding: 14px 16px; background: rgba(0,10,24,0.5); border-bottom: 1px solid var(--border);">
        <div style="display: flex; gap: 16px;">
          <div v-for="n in 5" :key="n" class="skeleton skeleton-text" style="flex: 1; margin-bottom: 0;"></div>
        </div>
      </div>
      <div v-for="n in 5" :key="n" class="skeleton-table-row">
        <div v-for="c in 5" :key="c" class="skeleton skeleton-table-cell"></div>
      </div>
    </div>

    <!-- Live: content -->
    <template v-else>
      <div class="card" v-if="recentAssertions.length === 0">
        <div class="empty-state">No badges issued yet. Start by creating an issuer and badge class.</div>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Badge</th>
              <th>Recipient</th>
              <th>Issuer</th>
              <th>Issued</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in recentAssertions" :key="a.id">
              <td>{{ a.badgeClass.name }}</td>
              <td>{{ a.recipientName || a.recipientEmail }}</td>
              <td>{{ a.badgeClass.issuer.name }}</td>
              <td>{{ new Date(a.issuedOn).toLocaleDateString() }}</td>
              <td>
                <span v-if="a.revoked" class="badge-revoked">Revoked</span>
                <span v-else class="badge-valid">Valid</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getIssuers, getBadgeClasses, getAssertions } from "../services/api";

const loading = ref(true);
const stats = ref({ issuers: 0, badgeClasses: 0, assertions: 0 });
const recentAssertions = ref<any[]>([]);

onMounted(async () => {
  try {
    const [issuers, badges, assertions] = await Promise.all([
      getIssuers(),
      getBadgeClasses(),
      getAssertions(),
    ]);
    stats.value = {
      issuers: issuers.data.length,
      badgeClasses: badges.data.length,
      assertions: assertions.data.length,
    };
    recentAssertions.value = assertions.data.slice(0, 10);
  } finally {
    loading.value = false;
  }
});
</script>
