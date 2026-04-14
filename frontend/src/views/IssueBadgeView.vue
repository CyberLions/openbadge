<template>
  <div>
    <h1>Issue Badge</h1>

    <div v-if="success" class="alert alert-success">
      {{ successMessage }}
      <router-link v-if="lastAssertionId" :to="`/badges/${lastAssertionId}`">View badge</router-link>
    </div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <!-- Top-level tabs -->
    <div class="issue-tabs">
      <button :class="['issue-tab', { active: activeTab === 'issue' }]" @click="activeTab = 'issue'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
        Issue Directly
      </button>
      <button :class="['issue-tab', { active: activeTab === 'invite' }]" @click="activeTab = 'invite'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        Invite to Claim
      </button>
    </div>

    <!-- ═══════════════════════════════════════════ -->
    <!-- ISSUE DIRECTLY TAB                          -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-if="activeTab === 'issue'">
      <div class="card card-accent">
        <h2>Single Issuance</h2>
        <form @submit.prevent="handleIssue">
          <div class="form-group">
            <label>Badge Class *</label>
            <select v-model="form.badgeClassId" required>
              <option value="">Select a badge class</option>
              <option v-for="bc in badgeClasses" :key="bc.id" :value="bc.id">
                {{ bc.name }} ({{ bc.issuer.name }})
              </option>
            </select>
          </div>

          <hr class="section-divider" />

          <h3 style="margin-bottom: 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Recipient</h3>
          <div class="form-row">
            <div class="form-group">
              <label>Email *</label>
              <input v-model="form.recipientEmail" type="email" required placeholder="recipient@example.com" />
            </div>
            <div class="form-group">
              <label>Name</label>
              <input v-model="form.recipientName" placeholder="John Doe" />
            </div>
          </div>

          <div class="form-group">
            <label>Expiration Date</label>
            <input v-model="form.expires" type="datetime-local" />
          </div>

          <hr class="section-divider" />

          <h3 style="margin-bottom: 16px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted);">Evidence (optional)</h3>
          <div class="form-group">
            <label>Evidence URL</label>
            <input v-model="form.evidenceUrl" type="url" placeholder="https://example.org/evidence" />
          </div>
          <div class="form-group">
            <label>Evidence Narrative</label>
            <textarea v-model="form.evidenceNarrative" placeholder="Description of the evidence..."></textarea>
          </div>

          <div class="form-group" style="display: flex; align-items: center; gap: 8px;">
            <input type="checkbox" v-model="form.sendEmail" id="sendEmail" style="width: auto;" />
            <label for="sendEmail" style="margin-bottom: 0; text-transform: none; font-size: 14px; font-weight: 500; color: var(--text);">
              Send email notification to recipient
            </label>
          </div>

          <button type="submit" class="btn btn-gold" :disabled="issuing">
            {{ issuing ? 'Issuing...' : 'Issue Badge' }}
          </button>
        </form>
      </div>

      <div class="card" style="margin-top: 24px;">
        <h2>Bulk Issue</h2>

        <div class="form-group">
          <label>Badge Class *</label>
          <select v-model="bulkBadgeClassId" required>
            <option value="">Select a badge class</option>
            <option v-for="bc in badgeClasses" :key="bc.id" :value="bc.id">
              {{ bc.name }} ({{ bc.issuer.name }})
            </option>
          </select>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <button :class="['btn btn-sm', bulkMode === 'text' ? 'btn-gold' : 'btn-outline']" @click="bulkMode = 'text'">Paste Text</button>
          <button :class="['btn btn-sm', bulkMode === 'csv' ? 'btn-gold' : 'btn-outline']" @click="bulkMode = 'csv'">Import CSV</button>
        </div>

        <template v-if="bulkMode === 'text'">
          <p class="text-muted" style="font-size: 13px; margin-bottom: 12px;">
            One recipient per line: email, name
          </p>
          <div class="form-group">
            <textarea v-model="bulkRecipients" rows="6" placeholder="john@example.com, John Doe&#10;jane@example.com, Jane Doe"></textarea>
          </div>
        </template>

        <template v-if="bulkMode === 'csv'">
          <p class="text-muted" style="font-size: 13px; margin-bottom: 12px;">
            Upload a CSV file with columns: <strong>email</strong> (required), <strong>name</strong> (optional).
            The first row should be a header row.
          </p>
          <div class="form-group">
            <input type="file" accept=".csv,text/csv" @change="handleCsvUpload($event, 'issue')" />
          </div>
          <div v-if="csvPreview.length" class="table-wrap" style="margin-bottom:16px; max-height:220px; overflow-y:auto;">
            <table>
              <thead><tr><th>Email</th><th>Name</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in csvPreview" :key="i">
                  <td>{{ r.email }}</td>
                  <td>{{ r.name || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div style="padding:8px 16px; font-size:12px; color:var(--text-muted);">{{ csvPreview.length }} recipient{{ csvPreview.length === 1 ? '' : 's' }} loaded</div>
          </div>
        </template>

        <button class="btn btn-primary" @click="handleBulkIssue" :disabled="bulkIssuing">
          {{ bulkIssuing ? 'Issuing...' : 'Bulk Issue' }}
        </button>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════ -->
    <!-- INVITE TO CLAIM TAB                         -->
    <!-- ═══════════════════════════════════════════ -->
    <template v-if="activeTab === 'invite'">
      <div class="card card-accent">
        <h2>Single Invite</h2>
        <p class="text-muted" style="font-size: 13px; margin-bottom: 16px;">
          Send an invite link — the recipient confirms their details before the badge is signed and issued.
        </p>

        <div v-if="inviteSuccess && inviteResults.length === 1" class="alert alert-success">
          Invite created!
          Link: <a :href="inviteResults[0].inviteUrl" target="_blank" style="word-break:break-all;">{{ inviteResults[0].inviteUrl }}</a>
        </div>

        <div class="form-group">
          <label>Badge Class *</label>
          <select v-model="inviteBadgeClassId" required>
            <option value="">Select a badge class</option>
            <option v-for="bc in badgeClasses" :key="bc.id" :value="bc.id">
              {{ bc.name }} ({{ bc.issuer.name }})
            </option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Recipient Email</label>
            <input v-model="inviteEmail" type="email" placeholder="recipient@example.com" />
          </div>
          <div class="form-group">
            <label>Name (optional)</label>
            <input v-model="inviteName" type="text" placeholder="John Doe" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Expires in (days)</label>
            <input v-model.number="inviteExpDays" type="number" min="1" max="90" />
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 24px;">
            <input type="checkbox" v-model="inviteSendEmail" id="inviteSendEmail" style="width: auto;" />
            <label for="inviteSendEmail" style="margin-bottom: 0; text-transform: none; font-size: 14px; font-weight: 500; color: var(--text);">
              Send invite email
            </label>
          </div>
        </div>

        <button class="btn btn-gold" @click="handleCreateInvite" :disabled="inviting">
          {{ inviting ? 'Creating...' : 'Create Invite' }}
        </button>
      </div>

      <div class="card" style="margin-top: 24px;">
        <h2>Bulk Invite</h2>

        <div v-if="inviteSuccess && inviteResults.length > 1" class="alert alert-success">
          {{ inviteResults.length }} invites created and sent!
        </div>

        <div class="form-group">
          <label>Badge Class *</label>
          <select v-model="bulkInviteBadgeClassId" required>
            <option value="">Select a badge class</option>
            <option v-for="bc in badgeClasses" :key="bc.id" :value="bc.id">
              {{ bc.name }} ({{ bc.issuer.name }})
            </option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Expires in (days)</label>
            <input v-model.number="bulkInviteExpDays" type="number" min="1" max="90" />
          </div>
          <div class="form-group" style="display: flex; align-items: center; gap: 8px; margin-top: 24px;">
            <input type="checkbox" v-model="bulkInviteSendEmail" id="bulkInviteSendEmail" style="width: auto;" />
            <label for="bulkInviteSendEmail" style="margin-bottom: 0; text-transform: none; font-size: 14px; font-weight: 500; color: var(--text);">
              Send invite emails
            </label>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-bottom:16px;">
          <button :class="['btn btn-sm', bulkInviteMode === 'text' ? 'btn-gold' : 'btn-outline']" @click="bulkInviteMode = 'text'">Paste Text</button>
          <button :class="['btn btn-sm', bulkInviteMode === 'csv' ? 'btn-gold' : 'btn-outline']" @click="bulkInviteMode = 'csv'">Import CSV</button>
        </div>

        <template v-if="bulkInviteMode === 'text'">
          <p class="text-muted" style="font-size: 13px; margin-bottom: 12px;">
            One recipient per line: email, name
          </p>
          <div class="form-group">
            <textarea v-model="bulkInviteRecipients" rows="6" placeholder="john@example.com, John Doe&#10;jane@example.com, Jane Doe"></textarea>
          </div>
        </template>

        <template v-if="bulkInviteMode === 'csv'">
          <p class="text-muted" style="font-size: 13px; margin-bottom: 12px;">
            Upload a CSV file with columns: <strong>email</strong> (required), <strong>name</strong> (optional).
            The first row should be a header row.
          </p>
          <div class="form-group">
            <input type="file" accept=".csv,text/csv" @change="handleCsvUpload($event, 'invite')" />
          </div>
          <div v-if="inviteCsvPreview.length" class="table-wrap" style="margin-bottom:16px; max-height:220px; overflow-y:auto;">
            <table>
              <thead><tr><th>Email</th><th>Name</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in inviteCsvPreview" :key="i">
                  <td>{{ r.email }}</td>
                  <td>{{ r.name || '—' }}</td>
                </tr>
              </tbody>
            </table>
            <div style="padding:8px 16px; font-size:12px; color:var(--text-muted);">{{ inviteCsvPreview.length }} recipient{{ inviteCsvPreview.length === 1 ? '' : 's' }} loaded</div>
          </div>
        </template>

        <button class="btn btn-primary" @click="handleBulkInvite" :disabled="bulkInviting">
          {{ bulkInviting ? 'Sending invites...' : 'Send Bulk Invites' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getBadgeClasses, issueAssertion, bulkIssueAssertions, createInvite, bulkCreateInvites } from "../services/api";
import { parseCsvRecipients } from "../utils/csv";

const route = useRoute();
const badgeClasses = ref<any[]>([]);
const activeTab = ref<"issue" | "invite">("issue");
const success = ref(false);
const successMessage = ref("");
const error = ref("");

// ── Issue directly ──
const issuing = ref(false);
const emailSent = ref(false);
const lastAssertionId = ref("");

const form = ref({
  badgeClassId: "",
  recipientEmail: "",
  recipientName: "",
  expires: "",
  evidenceUrl: "",
  evidenceNarrative: "",
  sendEmail: true,
});

const bulkBadgeClassId = ref("");
const bulkRecipients = ref("");
const bulkMode = ref<"text" | "csv">("text");
const bulkIssuing = ref(false);
const csvPreview = ref<{ email: string; name?: string }[]>([]);

// ── Invite to claim ──
const inviteBadgeClassId = ref("");
const inviteEmail = ref("");
const inviteName = ref("");
const inviteExpDays = ref(14);
const inviteSendEmail = ref(true);
const inviting = ref(false);
const inviteSuccess = ref(false);
const inviteResults = ref<any[]>([]);

const bulkInviteBadgeClassId = ref("");
const bulkInviteRecipients = ref("");
const bulkInviteMode = ref<"text" | "csv">("text");
const bulkInviteExpDays = ref(14);
const bulkInviteSendEmail = ref(true);
const bulkInviting = ref(false);
const inviteCsvPreview = ref<{ email: string; name?: string }[]>([]);

function handleCsvUpload(e: Event, target: "issue" | "invite") {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result as string;
    const result = parseCsvRecipients(text);
    if (result.error) {
      error.value = result.error;
      if (target === "issue") csvPreview.value = [];
      else inviteCsvPreview.value = [];
      return;
    }
    if (target === "issue") csvPreview.value = result.recipients;
    else inviteCsvPreview.value = result.recipients;
    error.value = "";
  };
  reader.readAsText(file);
}

onMounted(async () => {
  badgeClasses.value = (await getBadgeClasses()).data;
  if (route.query.badgeClassId) {
    form.value.badgeClassId = route.query.badgeClassId as string;
    bulkBadgeClassId.value = route.query.badgeClassId as string;
    inviteBadgeClassId.value = route.query.badgeClassId as string;
    bulkInviteBadgeClassId.value = route.query.badgeClassId as string;
  }
});

async function handleIssue() {
  issuing.value = true;
  success.value = false;
  error.value = "";
  try {
    const data: Record<string, unknown> = {
      badgeClassId: form.value.badgeClassId,
      recipientEmail: form.value.recipientEmail,
      sendEmail: form.value.sendEmail,
    };
    if (form.value.recipientName) data.recipientName = form.value.recipientName;
    if (form.value.expires) data.expires = new Date(form.value.expires).toISOString();
    if (form.value.evidenceUrl) data.evidenceUrl = form.value.evidenceUrl;
    if (form.value.evidenceNarrative) data.evidenceNarrative = form.value.evidenceNarrative;

    const res = await issueAssertion(data);
    lastAssertionId.value = res.data.id;
    emailSent.value = res.data.emailSent;
    successMessage.value = `Badge issued successfully!${res.data.emailSent ? " Notification email sent." : ""}`;
    success.value = true;
    form.value.recipientEmail = "";
    form.value.recipientName = "";
    form.value.expires = "";
    form.value.evidenceUrl = "";
    form.value.evidenceNarrative = "";
  } catch (e: any) {
    error.value = e.response?.data?.error || "Failed to issue badge";
  } finally {
    issuing.value = false;
  }
}

async function handleBulkIssue() {
  if (!bulkBadgeClassId.value) return;

  let recipients: { email: string; name?: string }[];
  if (bulkMode.value === "csv") {
    if (!csvPreview.value.length) return;
    recipients = csvPreview.value;
  } else {
    if (!bulkRecipients.value.trim()) return;
    recipients = bulkRecipients.value
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [email, ...nameParts] = line.split(",");
        return { email: email.trim(), name: nameParts.join(",").trim() || undefined };
      });
  }

  bulkIssuing.value = true;
  error.value = "";
  success.value = false;
  try {
    await bulkIssueAssertions({
      badgeClassId: bulkBadgeClassId.value,
      recipients,
      sendEmail: true,
    });
    lastAssertionId.value = "";
    successMessage.value = `${recipients.length} badges issued successfully!`;
    success.value = true;
    bulkRecipients.value = "";
    csvPreview.value = [];
  } catch (e: any) {
    error.value = "Bulk issue failed";
  } finally {
    bulkIssuing.value = false;
  }
}

async function handleCreateInvite() {
  if (!inviteBadgeClassId.value) return;
  inviting.value = true;
  error.value = "";
  inviteSuccess.value = false;
  success.value = false;
  try {
    const res = await createInvite({
      badgeClassId: inviteBadgeClassId.value,
      recipientEmail: inviteEmail.value || undefined,
      recipientName: inviteName.value || undefined,
      expiresInDays: inviteExpDays.value,
      sendEmail: inviteSendEmail.value,
    });
    inviteResults.value = [res.data];
    inviteSuccess.value = true;
    inviteEmail.value = "";
    inviteName.value = "";
  } catch (e: any) {
    error.value = e.response?.data?.error || "Failed to create invite";
  } finally {
    inviting.value = false;
  }
}

async function handleBulkInvite() {
  if (!bulkInviteBadgeClassId.value) return;

  let recipients: { email: string; name?: string }[];
  if (bulkInviteMode.value === "csv") {
    if (!inviteCsvPreview.value.length) return;
    recipients = inviteCsvPreview.value;
  } else {
    if (!bulkInviteRecipients.value.trim()) return;
    recipients = bulkInviteRecipients.value
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [email, ...nameParts] = line.split(",");
        return { email: email.trim(), name: nameParts.join(",").trim() || undefined };
      });
  }

  bulkInviting.value = true;
  error.value = "";
  inviteSuccess.value = false;
  success.value = false;
  try {
    const res = await bulkCreateInvites({
      badgeClassId: bulkInviteBadgeClassId.value,
      recipients,
      expiresInDays: bulkInviteExpDays.value,
      sendEmail: bulkInviteSendEmail.value,
    });
    inviteResults.value = res.data;
    inviteSuccess.value = true;
    bulkInviteRecipients.value = "";
    inviteCsvPreview.value = [];
  } catch (e: any) {
    error.value = e.response?.data?.error || "Bulk invite failed";
  } finally {
    bulkInviting.value = false;
  }
}
</script>

<style scoped>
.issue-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
}
.issue-tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 50px;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: "Inter", sans-serif;
}
.issue-tab:hover {
  border-color: rgba(90, 169, 230, 0.4);
  color: var(--text);
}
.issue-tab.active {
  background: var(--gold-dim);
  border-color: rgba(255, 195, 0, 0.3);
  color: var(--gold);
}
.issue-tab svg {
  opacity: 0.6;
}
.issue-tab.active svg {
  opacity: 1;
}
</style>
