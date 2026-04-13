<template>
  <div>
    <h1>Issued Badges</h1>

    <!-- Skeleton: table -->
    <div v-if="loading" class="table-wrap">
      <div style="padding: 14px 16px; background: rgba(0,10,24,0.5); border-bottom: 1px solid var(--border);">
        <div style="display: flex; gap: 16px;">
          <div v-for="n in 7" :key="n" class="skeleton skeleton-text" style="flex: 1; margin-bottom: 0;"></div>
        </div>
      </div>
      <div v-for="n in 6" :key="n" class="skeleton-table-row">
        <div v-for="c in 7" :key="c" class="skeleton skeleton-table-cell"></div>
      </div>
    </div>

    <!-- Live -->
    <template v-else>
      <div v-if="assertions.length" class="table-wrap">
        <table>
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
              <td style="color: var(--text-muted);">{{ a.emailSent ? 'Sent' : 'Not sent' }}</td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <router-link :to="`/badges/${a.id}`" class="btn btn-outline btn-sm">View</router-link>
                  <button v-if="!a.revoked" class="btn btn-primary btn-sm" @click="handleResend(a.id)" :disabled="resending === a.id">
                    {{ resending === a.id ? 'Sending...' : 'Resend' }}
                  </button>
                  <button v-if="!a.revoked" class="btn btn-danger btn-sm" @click="handleRevoke(a.id)">Revoke</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="card">
        <div class="empty-state">No badges issued yet.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAssertions, revokeAssertion, resendEmail } from "../services/api";

const loading = ref(true);
const assertions = ref<any[]>([]);
const resending = ref<string | null>(null);

async function load() {
  try {
    assertions.value = (await getAssertions()).data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

async function handleResend(id: string) {
  resending.value = id;
  try {
    await resendEmail(id);
    await load();
  } catch {
    alert("Failed to send email");
  } finally {
    resending.value = null;
  }
}

async function handleRevoke(id: string) {
  const reason = prompt("Reason for revocation (optional):");
  if (reason === null) return;
  await revokeAssertion(id, reason || undefined);
  await load();
}
</script>
