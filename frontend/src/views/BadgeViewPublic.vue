<template>
  <div class="bp" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <div class="bp-bg"></div>
    <div class="bp-glow"></div>

    <!-- Loading -->
    <div v-if="loading" class="bp-wrap">
      <div class="bp-hero">
        <div class="bp-hero-img-slot"><div class="bp-pulse" style="width:120px;height:120px;border-radius:50%;"></div></div>
        <div class="bp-pulse" style="width:60%;height:28px;margin:16px auto 0;border-radius:8px;"></div>
        <div class="bp-pulse" style="width:40%;height:18px;margin:12px auto 0;border-radius:8px;"></div>
      </div>
      <div class="bp-card"><div class="bp-pulse" style="height:80px;border-radius:10px;"></div></div>
    </div>

    <!-- Content -->
    <div v-else-if="verification" ref="wrapRef" class="bp-wrap" :style="tiltStyle">

      <!-- Hero -->
      <section class="bp-hero">
        <div class="bp-hero-img-slot">
          <div class="bp-ring" :class="{ 'bp-ring--fail': !verification.valid }">
            <img
              v-if="verification.badgeClass?.image"
              :src="verification.badgeClass.image"
              :alt="verification.badgeClass?.name"
            />
          </div>
        </div>

        <h1>{{ verification.badgeClass?.name || 'Badge' }}</h1>

        <div class="bp-issuer-line" v-if="verification.issuer">
          <a v-if="verification.issuer.url" :href="verification.issuer.url" target="_blank">{{ verification.issuer.name }}</a>
          <span v-else>{{ verification.issuer.name }}</span>
        </div>

        <div class="bp-pills">
          <div class="bp-pill" :class="verification.valid ? 'bp-pill--ok' : 'bp-pill--bad'">
            <span class="bp-pill-dot"></span>
            {{ verification.valid ? 'Verified credential' : 'Verification failed' }}
          </div>
          <div v-if="verification.recipientVerified === true" class="bp-pill bp-pill--ok">
            <span class="bp-pill-dot"></span>
            Recipient confirmed
          </div>
          <div v-else-if="verification.recipientVerified === false" class="bp-pill bp-pill--bad">
            <span class="bp-pill-dot"></span>
            Recipient does not match
          </div>
        </div>
        <p v-if="!verification.valid" class="bp-fail-reason">{{ verification.reason }}</p>
      </section>

      <!-- Details -->
      <section class="bp-card">
        <div class="bp-details">
          <div v-if="recipientName" class="bp-row">
            <span class="bp-label">Recipient</span>
            <span class="bp-value">{{ recipientName }}</span>
          </div>
          <div v-if="identityEmail" class="bp-row">
            <span class="bp-label">Email</span>
            <span class="bp-value">{{ identityEmail }}</span>
          </div>
          <div v-if="verification.assertion?.issuedOn" class="bp-row">
            <span class="bp-label">Issued</span>
            <span class="bp-value">{{ formatDate(verification.assertion.issuedOn) }}</span>
          </div>
          <div v-if="verification.assertion?.expires" class="bp-row">
            <span class="bp-label">Expires</span>
            <span class="bp-value">{{ formatDate(verification.assertion.expires) }}</span>
          </div>
          <div class="bp-row bp-row--wide" v-if="verification.badgeClass?.description">
            <span class="bp-label">About</span>
            <span class="bp-value bp-desc">{{ verification.badgeClass.description }}</span>
          </div>
          <div v-if="verification.badgeClass?.criteriaUrl || verification.badgeClass?.criteriaNarrative" class="bp-row bp-row--wide">
            <span class="bp-label">Criteria</span>
            <span class="bp-value">
              <span v-if="verification.badgeClass.criteriaNarrative" class="bp-desc">{{ verification.badgeClass.criteriaNarrative }}</span>
              <a v-if="verification.badgeClass.criteriaUrl" :href="verification.badgeClass.criteriaUrl" target="_blank" class="bp-link" style="margin-top:4px;display:flex;">
                View criteria
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>
              </a>
            </span>
          </div>
          <div v-if="verification.badgeClass?.tags?.length" class="bp-row">
            <span class="bp-label">Tags</span>
            <span class="bp-value bp-tags">
              <span v-for="tag in verification.badgeClass.tags" :key="tag" class="bp-tag">{{ tag }}</span>
            </span>
          </div>
          <div v-if="verification.assertion?.evidence" class="bp-row bp-row--wide">
            <span class="bp-label">Evidence</span>
            <span class="bp-value">
              <a v-if="verification.assertion.evidence.id" :href="verification.assertion.evidence.id" target="_blank" class="bp-link">
                View evidence
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg>
              </a>
              <span v-if="verification.assertion.evidence.narrative" class="bp-desc" style="margin-top:4px;display:block;">{{ verification.assertion.evidence.narrative }}</span>
            </span>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <section class="bp-actions">
        <a :href="linkedInUrl" target="_blank" class="bp-act bp-act--li">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          Add to LinkedIn
        </a>
        <a :href="`/verify/${assertionId}/baked-image`" download class="bp-act">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          Download
        </a>
        <a :href="`/ob3/credentials/${assertionId}`" target="_blank" class="bp-act">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Credential JSON
        </a>
      </section>

      <!-- Footer -->
      <footer class="bp-foot">
        Issued as an <a href="https://openbadges.org/" target="_blank" rel="noopener noreferrer">Open Badge</a> (v2.0 + v3.0)
        &middot;
        Cryptographically signed with Ed25519
      </footer>
    </div>

    <!-- 404 -->
    <div v-else class="bp-wrap">
      <section class="bp-hero" style="padding:64px 24px;">
        <h1 style="font-size:20px;opacity:.6;">Badge not found</h1>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";
import { verifyBadge } from "../services/api";

const route = useRoute();
const loading = ref(true);
const verification = ref<any>(null);
const assertionId = computed(() => route.params.id as string);
const identityEmail = computed(() => (route.query.identity_email as string) || null);

const wrapRef = ref<HTMLElement | null>(null);
const tiltStyle = ref<Record<string, string>>({});

// Smoothed tilt values
let currentX = 0;
let currentY = 0;
let targetX = 0;
let targetY = 0;
let rafId = 0;
let hasMouse = false;

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function animate() {
  currentX = lerp(currentX, targetX, 0.08);
  currentY = lerp(currentY, targetY, 0.08);
  tiltStyle.value = {
    transform: `perspective(1200px) rotateY(${currentX}deg) rotateX(${currentY}deg)`,
  };
  rafId = requestAnimationFrame(animate);
}

function onMouseMove(e: MouseEvent) {
  if (!hasMouse) {
    hasMouse = true;
    rafId = requestAnimationFrame(animate);
  }
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  targetX = x * 3;
  targetY = -y * 3;
}

function onMouseLeave() {
  targetX = 0;
  targetY = 0;
}

const recipientName = computed(() => {
  const ext = verification.value?.assertion?.["extensions:recipientProfile"];
  return ext?.name || null;
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const linkedInUrl = computed(() => {
  const v = verification.value;
  if (!v?.badgeClass) return "#";
  const p = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: v.badgeClass.name,
    organizationName: v.issuer?.linkedInOrganizationName || v.issuer?.name || "",
    certUrl: window.location.href,
    certId: v.badgeClass.name,
  });
  if (v.assertion?.issuedOn) {
    const d = new Date(v.assertion.issuedOn);
    p.set("issueYear", String(d.getFullYear()));
    p.set("issueMonth", String(d.getMonth() + 1));
  }
  if (v.assertion?.expires) {
    const d = new Date(v.assertion.expires);
    p.set("expirationYear", String(d.getFullYear()));
    p.set("expirationMonth", String(d.getMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
});

onMounted(async () => {
  try {
    const params: Record<string, string> = {};
    const identityEmail = route.query.identity_email as string | undefined;
    if (identityEmail) params.identity_email = identityEmail;
    const res = await verifyBadge(assertionId.value, Object.keys(params).length ? params : undefined);
    verification.value = res.data;
  } catch {
    verification.value = null;
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  cancelAnimationFrame(rafId);
});
</script>

<style scoped>
/* ================================================================
   Badge Public View — editorial / credential-card style
   ================================================================ */
.bp {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 20px 80px;
  background: #060d18;
}

/* Animated background gradient */
@keyframes bg-drift {
  0%   { background-position: 0% 0%; }
  25%  { background-position: 100% 50%; }
  50%  { background-position: 50% 100%; }
  75%  { background-position: 0% 50%; }
  100% { background-position: 0% 0%; }
}
.bp-bg {
  position: fixed;
  inset: 0;
  background: radial-gradient(ellipse at 30% 20%, rgba(90,169,230,.08) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(34,197,94,.06) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(255,195,0,.04) 0%, transparent 60%);
  background-size: 200% 200%;
  animation: bg-drift 20s ease-in-out infinite;
  pointer-events: none;
}

/* Soft radial glow behind the card */
.bp-glow {
  position: fixed;
  top: -30%;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(90,169,230,.12) 0%, transparent 70%);
  pointer-events: none;
}

.bp-wrap {
  position: relative;
  width: 100%;
  max-width: 580px;
  will-change: transform;
}

/* ── Pulse loader ── */
@keyframes shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.bp-pulse {
  background: linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.03) 75%);
  background-size: 800px 100%;
  animation: shimmer 1.5s infinite;
}

/* ── Hero ── */
.bp-hero {
  text-align: center;
  padding: 40px 24px 32px;
  background: linear-gradient(180deg, rgba(0,29,61,.6) 0%, rgba(0,10,24,.9) 100%);
  border: 1px solid rgba(90,169,230,.15);
  border-radius: 20px 20px 0 0;
}

.bp-hero h1 {
  font-size: 24px;
  font-weight: 800;
  color: #f0f4fa;
  margin: 20px 0 0;
  letter-spacing: -.3px;
  line-height: 1.25;
}
.bp-hero h1::after { display: none; }

.bp-hero-img-slot { margin: 0 auto; }

/* Badge ring */
.bp-ring {
  width: 120px;
  height: 120px;
  margin: 0 auto;
  border-radius: 50%;
  padding: 6px;
  background: conic-gradient(from 220deg, #22c55e, #5aa9e6, #ffc300, #22c55e);
  display: flex;
  align-items: center;
  justify-content: center;
}
.bp-ring--fail {
  background: conic-gradient(from 220deg, #e74c3c, #7b3030, #e74c3c);
}
.bp-ring img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
  background: #0a1628;
  border: 3px solid #0a1628;
}

/* Issuer link under title */
.bp-issuer-line {
  margin-top: 6px;
  font-size: 14px;
  color: #7b8fa8;
}
.bp-issuer-line a {
  color: #5aa9e6;
  text-decoration: none;
  font-weight: 600;
}
.bp-issuer-line a:hover { text-decoration: underline; }

/* Status pill */
.bp-pills {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 18px;
}
.bp-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .4px;
  text-transform: uppercase;
}
.bp-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}
.bp-pill--ok {
  background: rgba(34,197,94,.1);
  color: #22c55e;
  border: 1px solid rgba(34,197,94,.25);
}
.bp-pill--ok .bp-pill-dot { background: #22c55e; box-shadow: 0 0 6px #22c55e; }
.bp-pill--bad {
  background: rgba(231,76,60,.1);
  color: #e74c3c;
  border: 1px solid rgba(231,76,60,.25);
}
.bp-pill--bad .bp-pill-dot { background: #e74c3c; box-shadow: 0 0 6px #e74c3c; }

.bp-fail-reason {
  margin-top: 8px;
  font-size: 13px;
  color: #e74c3c;
  opacity: .85;
}

/* ── Details card ── */
.bp-card {
  background: rgba(0,20,42,.85);
  border-left: 1px solid rgba(90,169,230,.15);
  border-right: 1px solid rgba(90,169,230,.15);
  padding: 0;
}

.bp-details { padding: 8px 0; }

.bp-row {
  display: flex;
  padding: 14px 28px;
  gap: 16px;
  border-bottom: 1px solid rgba(90,169,230,.07);
}
.bp-row:last-child { border-bottom: none; }
.bp-row--wide { flex-direction: column; gap: 6px; }

.bp-label {
  flex-shrink: 0;
  width: 90px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: #5a7a9a;
  padding-top: 2px;
}

.bp-value {
  font-size: 14px;
  color: #c8d6e5;
  line-height: 1.5;
  white-space: pre-line;
}
.bp-desc {
  color: #8a9bb5;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-line;
}

.bp-link {
  color: #5aa9e6;
  text-decoration: none;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.bp-link:hover { text-decoration: underline; }

.bp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.bp-tag {
  display: inline-block;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  background: rgba(90,169,230,.1);
  color: #5aa9e6;
  border: 1px solid rgba(90,169,230,.2);
  letter-spacing: .3px;
}

/* ── Actions bar ── */
.bp-actions {
  display: flex;
  gap: 1px;
  background: rgba(90,169,230,.1);
  border-left: 1px solid rgba(90,169,230,.15);
  border-right: 1px solid rgba(90,169,230,.15);
  border-radius: 0 0 20px 20px;
  overflow: hidden;
}

.bp-act {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 14px 12px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  color: #8aa3bf;
  background: rgba(0,20,42,.85);
  transition: background .2s, color .2s;
  white-space: nowrap;
}
.bp-act:hover {
  background: rgba(0,30,60,.95);
  color: #e0e8f0;
}
.bp-act--li {
  color: #fff;
  background: #0a66c2;
}
.bp-act--li:hover {
  background: #084d96;
}

/* ── Footer ── */
.bp-foot {
  text-align: center;
  margin-top: 28px;
  font-size: 11px;
  color: #4a6078;
  line-height: 1.6;
}
.bp-foot a {
  color: #5aa9e6;
  text-decoration: none;
  font-weight: 600;
}
.bp-foot a:hover { text-decoration: underline; }

/* ── Responsive ── */
@media (max-width: 480px) {
  .bp { padding: 24px 12px 60px; }
  .bp-hero { padding: 28px 16px 24px; }
  .bp-ring { width: 96px; height: 96px; }
  .bp-hero h1 { font-size: 20px; }
  .bp-row { padding: 12px 18px; }
  .bp-actions { flex-wrap: wrap; }
  .bp-act { flex: 1 1 45%; }
}
</style>
