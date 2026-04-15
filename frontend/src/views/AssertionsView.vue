<template>
  <div>
    <h1>Issued Badges</h1>

    <!-- Skeleton: table -->
    <div v-if="loading" class="table-wrap">
      <div style="padding: 14px 16px; background: rgba(0,10,24,0.5); border-bottom: 1px solid var(--border);">
        <div style="display: flex; gap: 16px;">
          <div v-for="n in 10" :key="n" class="skeleton skeleton-text" style="flex: 1; margin-bottom: 0;"></div>
        </div>
      </div>
      <div v-for="n in 6" :key="n" class="skeleton-table-row">
        <div v-for="c in 10" :key="c" class="skeleton skeleton-table-cell"></div>
      </div>
    </div>

    <!-- Live -->
    <template v-else>
      <!-- Filters -->
      <div class="filters-bar">
        <div class="form-group" style="margin-bottom:0;flex:1;min-width:160px;">
          <input v-model="searchQuery" type="text" placeholder="Search by recipient, badge, or issuer..." />
        </div>
        <div class="form-group" style="margin-bottom:0;width:160px;">
          <select v-model="statusFilter">
            <option value="all">All statuses</option>
            <option value="valid">Valid</option>
            <option value="revoked">Revoked</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:0;width:180px;">
          <select v-model="badgeClassFilter">
            <option value="all">All badge classes</option>
            <option v-for="bc in badgeClassOptions" :key="bc" :value="bc">{{ bc }}</option>
          </select>
        </div>
        <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;padding-top:6px;">
          {{ filteredAssertions.length }} of {{ assertions.length }}
        </div>
      </div>

      <div v-if="filteredAssertions.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="sortable" @click="toggleSort('badge')">
                Badge <span class="sort-icon">{{ sortIcon('badge') }}</span>
              </th>
              <th class="sortable" @click="toggleSort('recipient')">
                Recipient <span class="sort-icon">{{ sortIcon('recipient') }}</span>
              </th>
              <th class="sortable" @click="toggleSort('issuer')">
                Issuer <span class="sort-icon">{{ sortIcon('issuer') }}</span>
              </th>
              <th class="sortable" @click="toggleSort('issued')">
                Issued <span class="sort-icon">{{ sortIcon('issued') }}</span>
              </th>
              <th>Status</th>
              <th>Email</th>
              <th>Opens</th>
              <th>Clicks</th>
              <th>Views</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in paginatedAssertions" :key="a.id">
              <td>{{ a.badgeClass.name }}</td>
              <td>{{ a.recipientName || a.recipientEmail }}</td>
              <td>{{ a.badgeClass.issuer.name }}</td>
              <td>{{ new Date(a.issuedOn).toLocaleDateString() }}</td>
              <td>
                <span v-if="a.revoked" class="badge-revoked">Revoked</span>
                <span v-else class="badge-valid">Valid</span>
              </td>
              <td style="color: var(--text-muted);">{{ a.emailSent ? 'Sent' : 'Not sent' }}</td>
              <td style="text-align:center;color:var(--text-muted);">{{ trackingStats[a.id]?.emailOpens || 0 }}</td>
              <td style="text-align:center;color:var(--text-muted);">{{ trackingStats[a.id]?.linkClicks || 0 }}</td>
              <td style="text-align:center;color:var(--text-muted);">{{ trackingStats[a.id]?.badgeViews || 0 }}</td>
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

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination">
        <button class="btn btn-sm btn-outline" :disabled="currentPage === 1" @click="currentPage = 1">First</button>
        <button class="btn btn-sm btn-outline" :disabled="currentPage === 1" @click="currentPage--">Prev</button>
        <template v-for="p in visiblePages" :key="p">
          <button v-if="p === '...'" class="btn btn-sm btn-outline" disabled>...</button>
          <button v-else :class="['btn btn-sm', p === currentPage ? 'btn-gold' : 'btn-outline']" @click="currentPage = p as number">{{ p }}</button>
        </template>
        <button class="btn btn-sm btn-outline" :disabled="currentPage === totalPages" @click="currentPage++">Next</button>
        <button class="btn btn-sm btn-outline" :disabled="currentPage === totalPages" @click="currentPage = totalPages">Last</button>
        <select v-model.number="pageSize" class="page-size-select">
          <option :value="10">10 / page</option>
          <option :value="25">25 / page</option>
          <option :value="50">50 / page</option>
          <option :value="100">100 / page</option>
        </select>
      </div>

      <div v-if="!filteredAssertions.length && assertions.length" class="card" style="margin-top:16px;">
        <div class="empty-state">No badges match your filters.</div>
      </div>

      <div v-if="!assertions.length" class="card">
        <div class="empty-state">No badges issued yet.</div>
      </div>

      <!-- Invites section -->
      <hr class="section-divider" style="margin: 32px 0;" />
      <h2>Badge Invites</h2>

      <!-- Invite filters -->
      <div v-if="invites.length" class="filters-bar" style="margin-bottom:16px;">
        <div class="form-group" style="margin-bottom:0;width:160px;">
          <select v-model="inviteStatusFilter">
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="claimed">Claimed</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div style="font-size:12px;color:var(--text-muted);white-space:nowrap;padding-top:6px;">
          {{ filteredInvites.length }} of {{ invites.length }}
        </div>
      </div>

      <div v-if="filteredInvites.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Badge</th>
              <th>Recipient</th>
              <th>Status</th>
              <th>Created</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in filteredInvites" :key="inv.id">
              <td>{{ inv.badgeClass?.name || '—' }}</td>
              <td>
                <span v-if="inv.recipientEmail">{{ inv.recipientEmail }}</span>
                <span v-else style="color:var(--text-muted);">No email</span>
                <span v-if="inv.recipientName" style="color:var(--text-muted);font-size:12px;"> ({{ inv.recipientName }})</span>
              </td>
              <td>
                <span v-if="inv.status === 'pending'" class="badge-valid">Pending</span>
                <span v-else-if="inv.status === 'claimed'" class="invite-badge-claimed">Claimed</span>
                <span v-else class="badge-revoked">Expired</span>
              </td>
              <td style="font-size:13px;color:var(--text-muted);">{{ formatDate(inv.createdAt) }}</td>
              <td style="font-size:13px;color:var(--text-muted);">{{ formatDate(inv.expiresAt) }}</td>
              <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button
                    v-if="inv.status === 'pending'"
                    class="btn btn-sm btn-outline"
                    @click="copyInviteLink(inv.token)"
                  >{{ copiedToken === inv.token ? 'Copied!' : 'Copy Link' }}</button>
                  <router-link
                    v-if="inv.status === 'claimed' && inv.assertionId"
                    :to="`/badges/${inv.assertionId}`"
                    class="btn btn-sm btn-outline"
                  >View Badge</router-link>
                  <button
                    v-if="inv.status === 'pending'"
                    class="btn btn-sm btn-danger"
                    @click="handleCancelInvite(inv.id)"
                  >Cancel</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else-if="!invites.length" class="card">
        <div class="empty-state">No invites sent yet. <router-link to="/issue">Create one</router-link></div>
      </div>

      <div v-else class="card">
        <div class="empty-state">No invites match your filter.</div>
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
import { ref, computed, watch, onMounted } from "vue";
import { getAssertions, revokeAssertion, resendEmail, getInvites, cancelInvite, getTrackingStats } from "../services/api";

const loading = ref(true);
const assertions = ref<any[]>([]);
const invites = ref<any[]>([]);
const trackingStats = ref<Record<string, { emailOpens: number; linkClicks: number; badgeViews: number }>>({});
const resending = ref<string | null>(null);
const revokeTarget = ref<string | null>(null);
const revokeReason = ref("");
const revoking = ref(false);
const copiedToken = ref<string | null>(null);

// ── Filters ──
const searchQuery = ref("");
const statusFilter = ref("all");
const badgeClassFilter = ref("all");
const inviteStatusFilter = ref("all");

// ── Sort ──
type SortField = "badge" | "recipient" | "issuer" | "issued";
const sortField = ref<SortField>("issued");
const sortDir = ref<"asc" | "desc">("desc");

function toggleSort(field: SortField) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === "asc" ? "desc" : "asc";
  } else {
    sortField.value = field;
    sortDir.value = field === "issued" ? "desc" : "asc";
  }
}

function sortIcon(field: SortField): string {
  if (sortField.value !== field) return "";
  return sortDir.value === "asc" ? "\u25B2" : "\u25BC";
}

// ── Pagination ──
const currentPage = ref(1);
const pageSize = ref(25);

// Reset page when filters/sort change
watch([searchQuery, statusFilter, badgeClassFilter, sortField, sortDir, pageSize], () => {
  currentPage.value = 1;
});

// ── Computed ──
const badgeClassOptions = computed(() => {
  const names = new Set(assertions.value.map((a: any) => a.badgeClass.name));
  return Array.from(names).sort();
});

const filteredAssertions = computed(() => {
  let result = assertions.value;

  // Status filter
  if (statusFilter.value === "valid") result = result.filter((a: any) => !a.revoked);
  else if (statusFilter.value === "revoked") result = result.filter((a: any) => a.revoked);

  // Badge class filter
  if (badgeClassFilter.value !== "all") {
    result = result.filter((a: any) => a.badgeClass.name === badgeClassFilter.value);
  }

  // Search
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter((a: any) =>
      a.badgeClass.name.toLowerCase().includes(q) ||
      (a.recipientName || "").toLowerCase().includes(q) ||
      a.recipientEmail.toLowerCase().includes(q) ||
      a.badgeClass.issuer.name.toLowerCase().includes(q)
    );
  }

  // Sort
  const dir = sortDir.value === "asc" ? 1 : -1;
  result = [...result].sort((a: any, b: any) => {
    let va: string, vb: string;
    switch (sortField.value) {
      case "badge": va = a.badgeClass.name; vb = b.badgeClass.name; break;
      case "recipient": va = a.recipientName || a.recipientEmail; vb = b.recipientName || b.recipientEmail; break;
      case "issuer": va = a.badgeClass.issuer.name; vb = b.badgeClass.issuer.name; break;
      case "issued": return dir * (new Date(a.issuedOn).getTime() - new Date(b.issuedOn).getTime());
      default: return 0;
    }
    return dir * va.localeCompare(vb);
  });

  return result;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredAssertions.value.length / pageSize.value)));

const paginatedAssertions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredAssertions.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | string)[] = [1];
  if (current > 3) pages.push("...");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
});

const filteredInvites = computed(() => {
  if (inviteStatusFilter.value === "all") return invites.value;
  return invites.value.filter((inv: any) => inv.status === inviteStatusFilter.value);
});

// ── Data loading ──
async function load() {
  try {
    const [assertionsRes, invitesRes, trackingRes] = await Promise.all([
      getAssertions(),
      getInvites(),
      getTrackingStats(),
    ]);
    assertions.value = assertionsRes.data;
    invites.value = invitesRes.data;
    trackingStats.value = trackingRes.data;
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function copyInviteLink(token: string) {
  const url = `${window.location.origin}/invite/${token}`;
  navigator.clipboard.writeText(url);
  copiedToken.value = token;
  setTimeout(() => { copiedToken.value = null; }, 2000);
}

async function handleCancelInvite(id: string) {
  try {
    await cancelInvite(id);
    await load();
  } catch {
    alert("Failed to cancel invite");
  }
}

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
.filters-bar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.sortable {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.sortable:hover {
  color: var(--gold);
}
.sort-icon {
  font-size: 9px;
  margin-left: 4px;
  opacity: 0.7;
}
.pagination {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  margin-top: 16px;
  flex-wrap: wrap;
}
.page-size-select {
  margin-left: 12px;
  padding: 5px 10px;
  background: rgba(0, 10, 24, 0.6);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 12px;
  font-family: "Inter", sans-serif;
  cursor: pointer;
}
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
.invite-badge-claimed {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--gold);
  font-weight: 600;
  font-size: 13px;
}
.invite-badge-claimed::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 6px rgba(255, 195, 0, 0.5);
}
</style>
