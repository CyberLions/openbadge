<template>
  <div class="badge-view-public">
    <div v-if="loading" class="card" style="text-align: center; padding: 48px;">
      Verifying badge...
    </div>

    <div v-else-if="verification">
      <div class="badge-header">
        <img
          v-if="verification.badgeClass?.image"
          :src="verification.badgeClass.image"
          :alt="verification.badgeClass?.name"
        />
        <h1>{{ verification.badgeClass?.name || 'Badge' }}</h1>
        <div
          class="verification-status"
          :class="verification.valid ? 'valid' : 'invalid'"
        >
          {{ verification.valid ? 'Verified' : 'Not Valid' }}
        </div>
        <p v-if="!verification.valid" style="color: var(--danger); margin-top: 8px;">
          {{ verification.reason }}
        </p>
      </div>

      <div class="card">
        <div class="detail-row">
          <span class="label">Badge</span>
          <span>{{ verification.badgeClass?.name }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Description</span>
          <span>{{ verification.badgeClass?.description }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Issuer</span>
          <span>
            <a v-if="verification.issuer?.url" :href="verification.issuer.url" target="_blank">
              {{ verification.issuer?.name }}
            </a>
            <template v-else>{{ verification.issuer?.name }}</template>
          </span>
        </div>
        <div class="detail-row" v-if="verification.assertion?.issuedOn">
          <span class="label">Issued On</span>
          <span>{{ new Date(verification.assertion.issuedOn).toLocaleDateString() }}</span>
        </div>
        <div class="detail-row" v-if="verification.assertion?.expires">
          <span class="label">Expires</span>
          <span>{{ new Date(verification.assertion.expires).toLocaleDateString() }}</span>
        </div>
        <div class="detail-row" v-if="verification.assertion?.evidence">
          <span class="label">Evidence</span>
          <span>
            <a v-if="verification.assertion.evidence.id" :href="verification.assertion.evidence.id" target="_blank">
              View Evidence
            </a>
            <template v-if="verification.assertion.evidence.narrative">
              {{ verification.assertion.evidence.narrative }}
            </template>
          </span>
        </div>
        <div class="detail-row">
          <span class="label">Verification</span>
          <span>Ed25519 Digital Signature (OB 2.0)</span>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;">
        <a :href="linkedInUrl" target="_blank" class="btn btn-linkedin">
          Add to LinkedIn Profile
        </a>
        <a :href="`/verify/${assertionId}`" target="_blank" class="btn btn-outline">
          View OB 2.0 JSON
        </a>
        <a :href="`/verify/${assertionId}/baked-image`" class="btn btn-outline" download>
          Download Baked Badge
        </a>
        <a :href="`/ob/assertions/${assertionId}`" target="_blank" class="btn btn-outline">
          Assertion JSON-LD
        </a>
      </div>
    </div>

    <div v-else class="card">
      <div class="empty-state">Badge not found.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { verifyBadge } from "../services/api";

const route = useRoute();
const loading = ref(true);
const verification = ref<any>(null);
const assertionId = computed(() => route.params.id as string);

const linkedInUrl = computed(() => {
  if (!verification.value?.badgeClass) return "#";
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: verification.value.badgeClass.name,
    certUrl: window.location.href,
    certId: assertionId.value,
  });
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
});

onMounted(async () => {
  try {
    const res = await verifyBadge(assertionId.value);
    verification.value = res.data;
  } catch {
    verification.value = null;
  } finally {
    loading.value = false;
  }
});
</script>
