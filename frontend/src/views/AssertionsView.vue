<template>
  <div>
    <h1>Issued Badges</h1>

    <table v-if="assertions.length">
      <thead>
        <tr>
          <th>Badge</th>
          <th>Recipient</th>
          <th>Issuer</th>
          <th>Issued</th>
          <th>Status</th>
          <th>Email</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in assertions" :key="a.id">
          <td>{{ a.badgeClass.name }}</td>
          <td>{{ a.recipientName || a.recipientEmail }}</td>
          <td>{{ a.badgeClass.issuer.name }}</td>
          <td>{{ new Date(a.issuedOn).toLocaleDateString() }}</td>
          <td>
            <span v-if="a.revoked" class="badge-revoked">Revoked</span>
            <span v-else class="badge-valid">Valid</span>
          </td>
          <td>{{ a.emailSent ? 'Sent' : 'Not sent' }}</td>
          <td>
            <div style="display: flex; gap: 4px;">
              <router-link :to="`/badges/${a.id}`" class="btn btn-outline btn-sm">View</router-link>
              <button v-if="!a.revoked" class="btn btn-danger btn-sm" @click="handleRevoke(a.id)">Revoke</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-else class="card">
      <div class="empty-state">No badges issued yet.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAssertions, revokeAssertion } from "../services/api";

const assertions = ref<any[]>([]);

async function load() {
  assertions.value = (await getAssertions()).data;
}

onMounted(load);

async function handleRevoke(id: string) {
  const reason = prompt("Reason for revocation (optional):");
  if (reason === null) return;
  await revokeAssertion(id, reason || undefined);
  await load();
}
</script>
