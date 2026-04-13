<template>
  <div>
    <h1>Issue Badge</h1>

    <div v-if="success" class="alert alert-success">
      Badge issued successfully! {{ emailSent ? 'Notification email sent.' : '' }}
      <router-link v-if="lastAssertionId" :to="`/badges/${lastAssertionId}`">View badge</router-link>
    </div>
    <div v-if="error" class="alert alert-error">{{ error }}</div>

    <div class="card">
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

        <h3 style="margin-bottom: 12px;">Recipient</h3>
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

        <h3 style="margin: 16px 0 12px;">Evidence (optional)</h3>
        <div class="form-group">
          <label>Evidence URL</label>
          <input v-model="form.evidenceUrl" type="url" placeholder="https://example.org/evidence" />
        </div>
        <div class="form-group">
          <label>Evidence Narrative</label>
          <textarea v-model="form.evidenceNarrative" placeholder="Description of the evidence..."></textarea>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" v-model="form.sendEmail" style="width: auto; margin-right: 6px;" />
            Send email notification to recipient
          </label>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="issuing">
          {{ issuing ? 'Issuing...' : 'Issue Badge' }}
        </button>
      </form>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h2>Bulk Issue</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 12px;">
        Paste comma-separated emails (one per line: email, name)
      </p>
      <div class="form-group">
        <label>Badge Class *</label>
        <select v-model="bulkBadgeClassId" required>
          <option value="">Select a badge class</option>
          <option v-for="bc in badgeClasses" :key="bc.id" :value="bc.id">
            {{ bc.name }} ({{ bc.issuer.name }})
          </option>
        </select>
      </div>
      <div class="form-group">
        <textarea v-model="bulkRecipients" rows="6" placeholder="john@example.com, John Doe&#10;jane@example.com, Jane Doe"></textarea>
      </div>
      <button class="btn btn-primary" @click="handleBulkIssue" :disabled="bulkIssuing">
        {{ bulkIssuing ? 'Issuing...' : 'Bulk Issue' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getBadgeClasses, issueAssertion, bulkIssueAssertions } from "../services/api";

const route = useRoute();
const badgeClasses = ref<any[]>([]);
const issuing = ref(false);
const bulkIssuing = ref(false);
const success = ref(false);
const error = ref("");
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

onMounted(async () => {
  badgeClasses.value = (await getBadgeClasses()).data;
  if (route.query.badgeClassId) {
    form.value.badgeClassId = route.query.badgeClassId as string;
    bulkBadgeClassId.value = route.query.badgeClassId as string;
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
  if (!bulkBadgeClassId.value || !bulkRecipients.value.trim()) return;
  bulkIssuing.value = true;
  error.value = "";
  success.value = false;
  try {
    const recipients = bulkRecipients.value
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [email, ...nameParts] = line.split(",");
        return { email: email.trim(), name: nameParts.join(",").trim() || undefined };
      });

    await bulkIssueAssertions({
      badgeClassId: bulkBadgeClassId.value,
      recipients,
      sendEmail: true,
    });
    success.value = true;
    bulkRecipients.value = "";
  } catch (e: any) {
    error.value = "Bulk issue failed";
  } finally {
    bulkIssuing.value = false;
  }
}
</script>
