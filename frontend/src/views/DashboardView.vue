<template>
  <div>
    <h1>Dashboard</h1>
    <div class="stat-grid">
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
    <div class="card" v-if="recentAssertions.length === 0">
      <div class="empty-state">No badges issued yet. Start by creating an issuer and badge class.</div>
    </div>
    <table v-else>
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

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getIssuers, getBadgeClasses, getAssertions } from "../services/api";

const stats = ref({ issuers: 0, badgeClasses: 0, assertions: 0 });
const recentAssertions = ref<any[]>([]);

onMounted(async () => {
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
});
</script>
