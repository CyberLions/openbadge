<template>
  <div class="badge-view-public">
    <!-- Skeleton -->
    <div v-if="loading">
      <div style="text-align: center; margin-bottom: 36px;">
        <div class="skeleton skeleton-circle"></div>
        <div class="skeleton skeleton-heading" style="width: 50%; margin: 0 auto 14px;"></div>
        <div class="skeleton" style="width: 120px; height: 36px; border-radius: 50px; margin: 0 auto;"></div>
      </div>
      <div class="skeleton-card">
        <div v-for="n in 6" :key="n" style="display: flex; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid rgba(0,53,102,0.2);">
          <div class="skeleton skeleton-text w-1/4" style="margin-bottom: 0;"></div>
          <div class="skeleton skeleton-text w-1/2" style="margin-bottom: 0;"></div>
        </div>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <div class="skeleton" style="width: 140px; height: 40px; border-radius: 50px;"></div>
        <div class="skeleton" style="width: 110px; height: 40px; border-radius: 50px;"></div>
        <div class="skeleton" style="width: 150px; height: 40px; border-radius: 50px;"></div>
      </div>
    </div>

    <!-- Live -->
    <div v-else-if="verification">
      <div class="badge-header">
        <img
          v-if="verification.badgeClass?.image"
          :src="verification.badgeClass.image"
          :alt="verification.badgeClass?.name"
        />
        <h1 style="display: block;">{{ verification.badgeClass?.name || 'Badge' }}</h1>
        <div
          class="verification-status"
          :class="verification.valid ? 'valid' : 'invalid'"
        >
          <svg v-if="verification.valid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          {{ verification.valid ? 'Verified' : 'Not Valid' }}
        </div>
        <p v-if="!verification.valid" style="color: var(--danger); margin-top: 12px; font-size: 14px;">
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
        <div class="detail-row" style="border-bottom: none;">
          <span class="label">Verification</span>
          <span>Ed25519 Digital Signature (OB 2.0)</span>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap;">
        <a :href="linkedInUrl" target="_blank" class="btn btn-linkedin">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          Add to LinkedIn
        </a>
        <a :href="`/verify/${assertionId}`" target="_blank" class="btn btn-outline">
          OB 2.0 JSON
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
