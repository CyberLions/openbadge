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

    <!-- Revoke modal -->
    <Teleport to="body">
      <div v-if="revokeTarget" class="modal-overlay" @click.self="revokeTarget = null">
        <div class="modal-card">
          <h3>Revoke Badge</h3>
          <p class="text-muted" style="font-size: 13px; margin-bottom: 16px;">This action cannot be undone.</p>
          <div class="form-group">
            <label>Reason (optional)</label>
            <textarea v-model="revokeReason" rows="3" placeholder="Why is this badge being revoked?"></textarea>
          </div>
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button class="btn btn-outline btn-sm" @click="revokeTarget = null">Cancel</button>
            <button class="btn btn-danger btn-sm" @click="confirmRevoke" :disabled="revoking">
              {{ revoking ? 'Revoking...' : 'Revoke' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAssertions, revokeAssertion, resendEmail } from "../services/api";

const loading = ref(true);
const assertions = ref<any[]>([]);
const resending = ref<string | null>(null);
const revokeTarget = ref<string | null>(null);
const revokeReason = ref("");
const revoking = ref(false);

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

function handleRevoke(id: string) {
  revokeReason.value = "";
  revokeTarget.value = id;
}

async function confirmRevoke() {
  if (!revokeTarget.value) return;
  revoking.value = true;
  try {
    await revokeAssertion(revokeTarget.value, revokeReason.value || undefined);
    revokeTarget.value = null;
    await load();
  } finally {
    revoking.value = false;
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
}
.modal-card h3 {
  margin: 0 0 4px;
  font-size: 16px;
}
</style>
