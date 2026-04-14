<template>
  <div class="landing" @mousemove="onMouseMove" @mouseleave="onMouseLeave">
    <div class="landing-bg"></div>

    <!-- Nav bar -->
    <nav class="landing-nav">
      <div class="landing-nav-brand">
        <img src="/logo.svg" alt="OpenBadge" class="landing-nav-logo" />
        <span class="landing-nav-name">OpenBadge</span>
      </div>
      <div class="landing-nav-links">
        <a href="/api/docs" target="_blank">API Docs</a>
        <router-link to="/dashboard" class="btn btn-primary btn-sm">Sign In</router-link>
      </div>
    </nav>

    <!-- Hero -->
    <section class="landing-hero">
      <div class="landing-hero-content" ref="heroRef" :style="tiltStyle">
        <div class="landing-hero-badge">
          <img src="/logo.svg" alt="OpenBadge" />
        </div>
        <h1>Trust the Issuer,<br/>Not the Price Tag</h1>
        <p class="landing-hero-sub">
          OpenBadge is an open-source credential platform built on the belief that
          <strong>who issues a credential matters far more than how much someone paid for it</strong>.
          Universities, employers, and communities deserve tools that let them issue
          verifiable, cryptographically signed digital badges — without vendor lock-in or per-credential fees.
        </p>
        <div class="landing-hero-actions">
          <a href="#verify" class="btn btn-gold">Verify a Badge</a>
          <a href="#about" class="btn btn-outline">Learn More</a>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section id="about" class="landing-section">
      <h2>Why OpenBadge?</h2>
      <div class="landing-features">
        <div class="landing-feature-card">
          <div class="landing-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3>Cryptographic Trust</h3>
          <p>Every badge is signed with Ed25519 keys. Verification doesn't require calling home — the math proves authenticity.</p>
        </div>
        <div class="landing-feature-card">
          <div class="landing-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h3>Issuer Authority</h3>
          <p>A credential's value comes from the reputation of the organization behind it, not the platform that printed it.</p>
        </div>
        <div class="landing-feature-card">
          <div class="landing-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          </div>
          <h3>Open Standards</h3>
          <p>Full compliance with Open Badges 2.0 and W3C Verifiable Credentials (OB 3.0). No proprietary formats.</p>
        </div>
        <div class="landing-feature-card">
          <div class="landing-feature-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3>Self-Hosted</h3>
          <p>Your keys, your data, your infrastructure. Export issuers for static-site validation or run the full platform.</p>
        </div>
      </div>
    </section>

    <!-- Verify section -->
    <section id="verify" class="landing-section">
      <h2>Verify a Credential</h2>
      <p class="landing-section-sub">Upload a baked badge image (PNG) or paste a badge URL to verify its authenticity.</p>

      <div class="landing-verify-tabs">
        <button :class="['landing-tab', { active: verifyTab === 'image' }]" @click="verifyTab = 'image'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Upload Image
        </button>
        <button :class="['landing-tab', { active: verifyTab === 'url' }]" @click="verifyTab = 'url'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          Paste URL
        </button>
      </div>

      <div class="landing-verify-box">
        <!-- Image upload -->
        <div v-if="verifyTab === 'image'" class="landing-verify-content">
          <div
            class="landing-dropzone"
            :class="{ 'landing-dropzone--hover': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave="isDragging = false"
            @drop.prevent="handleDrop"
            @click="($refs.fileInput as HTMLInputElement).click()"
          >
            <input ref="fileInput" type="file" accept="image/png" style="display:none" @change="handleFileSelect" />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <p v-if="!selectedFile">Drop a baked badge PNG here or click to browse</p>
            <p v-else>{{ selectedFile.name }} <span style="opacity:.5">({{ (selectedFile.size / 1024).toFixed(1) }} KB)</span></p>
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:11px;color:#5a7a9a;">Recipient Email (optional — verify it matches the badge)</label>
            <input v-model="recipientEmail" type="email" placeholder="recipient@example.com" />
          </div>
          <button class="btn btn-gold" :disabled="!selectedFile || verifying" @click="verifyImage">
            {{ verifying ? 'Verifying...' : 'Verify Image' }}
          </button>
        </div>

        <!-- URL verify -->
        <div v-if="verifyTab === 'url'" class="landing-verify-content">
          <div class="form-group" style="margin-bottom:12px;">
            <input
              v-model="verifyUrl"
              type="text"
              placeholder="Paste badge URL or ID (e.g. https://example.com/badges/abc-123)"
              @keydown.enter="verifyByUrl"
            />
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label style="font-size:11px;color:#5a7a9a;">Recipient Email (optional — verify it matches the badge)</label>
            <input v-model="recipientEmail" type="email" placeholder="recipient@example.com" />
          </div>
          <button class="btn btn-gold" :disabled="!verifyUrl.trim() || verifying" @click="verifyByUrl">
            {{ verifying ? 'Verifying...' : 'Verify URL' }}
          </button>
        </div>
      </div>

      <!-- Result -->
      <div v-if="verifyResult" class="landing-verify-result" :class="verifyResult.valid ? 'landing-verify-result--ok' : 'landing-verify-result--fail'">
        <div class="landing-verify-status">
          <span class="landing-verify-dot"></span>
          {{ verifyResult.valid ? 'Valid Credential' : 'Verification Failed' }}
        </div>
        <div v-if="verifyResult.reason" class="landing-verify-reason">{{ verifyResult.reason }}</div>
        <div v-if="verifyResult.recipientVerified === true" class="landing-verify-recipient landing-verify-recipient--ok">
          Recipient email matches this badge
        </div>
        <div v-else-if="verifyResult.recipientVerified === false" class="landing-verify-recipient landing-verify-recipient--fail">
          Recipient email does not match this badge
        </div>
        <div class="landing-verify-details" v-if="verifyResult.badgeName || verifyResult.issuerName">
          <div v-if="verifyResult.badgeName" class="landing-verify-detail">
            <span class="landing-verify-detail-label">Badge</span>
            <span>{{ verifyResult.badgeName }}</span>
          </div>
          <div v-if="verifyResult.issuerName" class="landing-verify-detail">
            <span class="landing-verify-detail-label">Issuer</span>
            <span>{{ verifyResult.issuerName }}</span>
          </div>
          <div v-if="verifyResult.issuedOn" class="landing-verify-detail">
            <span class="landing-verify-detail-label">Issued</span>
            <span>{{ formatDate(verifyResult.issuedOn) }}</span>
          </div>
          <div v-if="verifyResult.assertionId" class="landing-verify-detail">
            <span class="landing-verify-detail-label">View</span>
            <router-link :to="`/badges/${verifyResult.assertionId}`">View full credential</router-link>
          </div>
        </div>
      </div>
      <div v-if="verifyError" class="alert alert-error" style="margin-top:16px;">{{ verifyError }}</div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <p>Open Badges 2.0 + 3.0 Compliant &middot; Ed25519 Signed</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";

const verifyTab = ref<"image" | "url">("image");
const selectedFile = ref<File | null>(null);
const verifyUrl = ref("");
const recipientEmail = ref("");
const verifying = ref(false);
const verifyResult = ref<any>(null);
const verifyError = ref("");
const isDragging = ref(false);

const heroRef = ref<HTMLElement | null>(null);
const tiltStyle = ref<Record<string, string>>({});
let targetX = 0, targetY = 0, currentX = 0, currentY = 0, rafId = 0, hasMouse = false;

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function animate() {
  currentX = lerp(currentX, targetX, 0.06);
  currentY = lerp(currentY, targetY, 0.06);
  tiltStyle.value = { transform: `perspective(1400px) rotateY(${currentX}deg) rotateX(${currentY}deg)` };
  rafId = requestAnimationFrame(animate);
}

function onMouseMove(e: MouseEvent) {
  if (!hasMouse) { hasMouse = true; rafId = requestAnimationFrame(animate); }
  const x = (e.clientX / window.innerWidth - 0.5) * 2;
  const y = (e.clientY / window.innerHeight - 0.5) * 2;
  targetX = x * 2; targetY = -y * 2;
}

function onMouseLeave() { targetX = 0; targetY = 0; }

function handleDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (file && file.type === "image/png") selectedFile.value = file;
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) selectedFile.value = input.files[0];
}

async function verifyImage() {
  if (!selectedFile.value) return;
  verifying.value = true;
  verifyResult.value = null;
  verifyError.value = "";
  try {
    const form = new FormData();
    form.append("image", selectedFile.value);
    if (recipientEmail.value.trim()) form.append("recipientEmail", recipientEmail.value.trim());
    const res = await axios.post("/offline-verify/image", form);
    verifyResult.value = res.data;
  } catch (e: any) {
    verifyError.value = e.response?.data?.error || "Verification failed";
  } finally {
    verifying.value = false;
  }
}

async function verifyByUrl() {
  if (!verifyUrl.value.trim()) return;
  verifying.value = true;
  verifyResult.value = null;
  verifyError.value = "";
  try {
    const res = await axios.post("/offline-verify/url", {
      url: verifyUrl.value.trim(),
      recipientEmail: recipientEmail.value.trim() || undefined,
    });
    verifyResult.value = res.data;
  } catch (e: any) {
    verifyError.value = e.response?.data?.error || "Verification failed";
  } finally {
    verifying.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
</script>

<style scoped>
.landing {
  min-height: 100vh;
  background: #060d18;
  color: #e8edf4;
  position: relative;
  overflow-x: hidden;
}

@keyframes bg-drift {
  0%   { background-position: 0% 0%; }
  50%  { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}
.landing-bg {
  position: fixed; inset: 0;
  background: radial-gradient(ellipse at 20% 20%, rgba(90,169,230,.06) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(255,195,0,.04) 0%, transparent 50%);
  background-size: 200% 200%;
  animation: bg-drift 25s ease-in-out infinite;
  pointer-events: none;
}

/* Nav */
.landing-nav {
  position: sticky; top: 0; z-index: 100;
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 48px;
  background: rgba(6,13,24,.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(0,53,102,.4);
}
.landing-nav-brand {
  display: flex; align-items: center; gap: 12px;
}
.landing-nav-logo {
  width: 32px; height: 32px;
  filter: drop-shadow(0 0 6px rgba(255,195,0,.3));
}
.landing-nav-name {
  font-family: "Orbitron", sans-serif;
  font-size: 15px; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  background: linear-gradient(135deg, #ffc300, #ffe45e);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.landing-nav-links {
  display: flex; align-items: center; gap: 20px;
}
.landing-nav-links a:not(.btn) {
  color: #7b8fa8; font-size: 13px; font-weight: 600;
  text-decoration: none; transition: color .2s;
}
.landing-nav-links a:not(.btn):hover { color: #ffc300; }

/* Hero */
.landing-hero {
  display: flex; align-items: center; justify-content: center;
  min-height: 75vh; padding: 80px 24px 60px;
  text-align: center;
}
.landing-hero-content {
  max-width: 680px; will-change: transform;
}
.landing-hero-badge img {
  width: 100px; height: 100px;
  filter: drop-shadow(0 0 24px rgba(255,195,0,.25));
  margin-bottom: 24px;
}
.landing-hero h1 {
  font-family: "Orbitron", sans-serif;
  font-size: 36px; font-weight: 800;
  letter-spacing: -0.5px; line-height: 1.2;
  background: linear-gradient(135deg, #ffc300 0%, #ffe45e 50%, #5aa9e6 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 20px;
}
.landing-hero h1::after { display: none; }
.landing-hero-sub {
  font-size: 16px; line-height: 1.7;
  color: #8a9bb5; max-width: 560px; margin: 0 auto 32px;
}
.landing-hero-sub strong { color: #c8d6e5; }
.landing-hero-actions {
  display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
}

/* Sections */
.landing-section {
  max-width: 900px; margin: 0 auto;
  padding: 60px 24px;
  text-align: center;
}
.landing-section h2 {
  font-family: "Orbitron", sans-serif;
  font-size: 22px; font-weight: 700;
  letter-spacing: 1px; margin-bottom: 12px;
  color: #f0f4fa;
}
.landing-section h2::after {
  content: ""; display: block;
  width: 48px; height: 3px;
  background: linear-gradient(90deg, #ffc300, transparent);
  border-radius: 2px; margin: 8px auto 0;
}
.landing-section-sub {
  color: #7b8fa8; font-size: 14px; margin-bottom: 32px;
}

/* Features */
.landing-features {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px; text-align: left;
}
.landing-feature-card {
  background: rgba(0,29,61,.55);
  border: 1px solid rgba(0,53,102,.6);
  border-radius: 16px; padding: 24px;
  transition: all .25s cubic-bezier(.4,0,.2,1);
}
.landing-feature-card:hover {
  border-color: rgba(90,169,230,.25);
  box-shadow: 0 0 20px rgba(0,69,141,.3);
  transform: translateY(-2px);
}
.landing-feature-icon {
  width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,195,0,.1); border-radius: 10px;
  color: #ffc300; margin-bottom: 14px;
}
.landing-feature-icon svg { width: 22px; height: 22px; }
.landing-feature-card h3 {
  font-size: 15px; font-weight: 700; color: #e8edf4;
  margin-bottom: 8px; letter-spacing: .3px;
}
.landing-feature-card h3::after { display: none; }
.landing-feature-card p {
  font-size: 13px; line-height: 1.6; color: #7b8fa8;
}

/* Verify section */
.landing-verify-tabs {
  display: flex; justify-content: center; gap: 4px;
  margin-bottom: 20px;
}
.landing-tab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 20px; border-radius: 50px;
  background: transparent; border: 1px solid rgba(0,53,102,.6);
  color: #7b8fa8; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .2s;
  font-family: "Inter", sans-serif;
}
.landing-tab:hover { border-color: rgba(90,169,230,.4); color: #c8d6e5; }
.landing-tab.active {
  background: rgba(255,195,0,.1); border-color: rgba(255,195,0,.3);
  color: #ffc300;
}
.landing-verify-box {
  background: rgba(0,29,61,.55);
  border: 1px solid rgba(0,53,102,.6);
  border-radius: 16px; padding: 28px;
  text-align: left;
}
.landing-verify-content {
  display: flex; flex-direction: column; gap: 16px;
}
.landing-dropzone {
  border: 2px dashed rgba(0,53,102,.6);
  border-radius: 12px; padding: 40px 24px;
  text-align: center; cursor: pointer;
  transition: all .2s;
  display: flex; flex-direction: column;
  align-items: center; gap: 12px;
}
.landing-dropzone:hover,
.landing-dropzone--hover {
  border-color: rgba(255,195,0,.4);
  background: rgba(255,195,0,.03);
}
.landing-dropzone p { font-size: 14px; color: #7b8fa8; margin: 0; }

/* Result */
.landing-verify-result {
  margin-top: 20px; border-radius: 12px; padding: 20px 24px;
  text-align: left;
}
.landing-verify-result--ok {
  background: rgba(34,197,94,.08);
  border: 1px solid rgba(34,197,94,.25);
}
.landing-verify-result--fail {
  background: rgba(231,76,60,.08);
  border: 1px solid rgba(231,76,60,.25);
}
.landing-verify-status {
  display: flex; align-items: center; gap: 8px;
  font-size: 14px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .5px;
}
.landing-verify-result--ok .landing-verify-status { color: #22c55e; }
.landing-verify-result--fail .landing-verify-status { color: #e74c3c; }
.landing-verify-dot {
  width: 8px; height: 8px; border-radius: 50%;
  display: inline-block;
}
.landing-verify-result--ok .landing-verify-dot {
  background: #22c55e; box-shadow: 0 0 8px #22c55e;
}
.landing-verify-result--fail .landing-verify-dot {
  background: #e74c3c; box-shadow: 0 0 8px #e74c3c;
}
.landing-verify-reason {
  margin-top: 8px; font-size: 13px; color: #8a9bb5;
}
.landing-verify-recipient {
  margin-top: 10px; padding: 8px 14px; border-radius: 8px;
  font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .4px;
}
.landing-verify-recipient--ok {
  background: rgba(34,197,94,.08); color: #22c55e; border: 1px solid rgba(34,197,94,.2);
}
.landing-verify-recipient--fail {
  background: rgba(231,76,60,.08); color: #e74c3c; border: 1px solid rgba(231,76,60,.2);
}
.landing-verify-details {
  margin-top: 14px;
  border-top: 1px solid rgba(90,169,230,.1);
  padding-top: 12px;
}
.landing-verify-detail {
  display: flex; gap: 12px; padding: 6px 0;
  font-size: 13px;
}
.landing-verify-detail-label {
  width: 70px; flex-shrink: 0;
  font-weight: 700; color: #5a7a9a;
  font-size: 11px; text-transform: uppercase;
  letter-spacing: .5px; padding-top: 1px;
}

/* Footer */
.landing-footer {
  text-align: center; padding: 40px 24px;
  border-top: 1px solid rgba(0,53,102,.3);
  font-size: 12px; color: #4a6078;
}
.landing-footer a { color: #5aa9e6; text-decoration: none; font-weight: 600; }
.landing-footer a:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .landing-nav { padding: 12px 16px; }
  .landing-hero { min-height: 60vh; padding: 60px 16px 40px; }
  .landing-hero h1 { font-size: 24px; }
  .landing-features { grid-template-columns: 1fr; }
  .landing-section { padding: 40px 16px; }
}
</style>
