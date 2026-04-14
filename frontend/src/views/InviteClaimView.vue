<template>
  <div class="bp">
    <div class="bp-bg"></div>
    <div class="bp-glow"></div>

    <!-- Loading -->
    <div v-if="loading" class="bp-wrap">
      <div class="bp-hero">
        <div class="bp-pulse" style="width:100px;height:100px;border-radius:50%;margin:0 auto;"></div>
        <div class="bp-pulse" style="width:60%;height:24px;margin:20px auto 0;border-radius:8px;"></div>
        <div class="bp-pulse" style="width:40%;height:16px;margin:12px auto 0;border-radius:8px;"></div>
      </div>
    </div>

    <!-- Expired or already claimed -->
    <div v-else-if="invite && invite.status !== 'pending'" class="bp-wrap">
      <section class="bp-hero" style="border-radius:20px;">
        <div v-if="invite.status === 'claimed'" style="text-align:center;padding:20px 0;">
          <div class="invite-status-icon invite-status-icon--ok">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h1>Badge Already Claimed</h1>
          <p style="color:#8a9bb5;font-size:14px;margin-top:8px;">This invite for <strong>{{ invite.badgeName }}</strong> has already been used.</p>
          <router-link v-if="invite.assertionId" :to="`/badges/${invite.assertionId}`" class="btn btn-gold" style="margin-top:20px;display:inline-block;">
            View Your Badge
          </router-link>
        </div>
        <div v-else style="text-align:center;padding:20px 0;">
          <div class="invite-status-icon invite-status-icon--fail">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h1>Invite Expired</h1>
          <p style="color:#8a9bb5;font-size:14px;margin-top:8px;">This invite for <strong>{{ invite.badgeName }}</strong> is no longer valid.</p>
        </div>
      </section>
    </div>

    <!-- Active invite -->
    <div v-else-if="invite" class="bp-wrap">
      <section class="bp-hero">
        <div class="bp-hero-img-slot" v-if="invite.badgeImage">
          <div class="bp-ring">
            <img :src="invite.badgeImage" :alt="invite.badgeName" />
          </div>
        </div>
        <h1>You've Been Invited!</h1>
        <div class="bp-issuer-line">
          <a v-if="invite.issuerUrl" :href="invite.issuerUrl" target="_blank">{{ invite.issuerName }}</a>
          <span v-else>{{ invite.issuerName }}</span>
          &nbsp;has invited you to claim:
        </div>
        <h2 style="color:#ffc300;margin-top:12px;font-size:20px;">{{ invite.badgeName }}</h2>
        <p v-if="invite.badgeDescription" style="color:#8a9bb5;font-size:13px;margin-top:8px;max-width:400px;margin-left:auto;margin-right:auto;line-height:1.6;">
          {{ invite.badgeDescription }}
        </p>
      </section>

      <section class="bp-card" style="padding:24px 28px;">
        <div v-if="claimSuccess" style="text-align:center;padding:20px 0;">
          <div class="invite-status-icon invite-status-icon--ok">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <h2 style="color:#22c55e;margin-top:12px;">Badge Claimed!</h2>
          <p style="color:#8a9bb5;font-size:14px;margin-top:8px;">Your credential has been issued and signed.</p>
          <router-link v-if="claimedAssertionId" :to="`/badges/${claimedAssertionId}`" class="btn btn-gold" style="margin-top:20px;display:inline-block;">
            View Your Badge
          </router-link>
        </div>

        <form v-else @submit.prevent="handleClaim">
          <p style="font-size:13px;color:#7b8fa8;margin-bottom:20px;">
            Confirm or update your details below, then claim your badge.
            A cryptographically signed credential will be issued to you.
          </p>

          <div v-if="claimError" class="alert alert-error" style="margin-bottom:16px;">{{ claimError }}</div>

          <div class="form-group">
            <label>Email *</label>
            <input v-model="claimEmail" type="email" required placeholder="your@email.com" />
          </div>
          <div class="form-group">
            <label>Name (optional)</label>
            <input v-model="claimName" type="text" placeholder="Your Name" />
          </div>

          <p style="font-size:11px;color:#5a7a9a;margin-bottom:16px;">
            Expires {{ formatDate(invite.expiresAt) }}
          </p>

          <button type="submit" class="btn btn-gold" style="width:100%;" :disabled="claiming">
            {{ claiming ? 'Claiming...' : 'Claim Badge' }}
          </button>
        </form>
      </section>

      <footer class="bp-foot">
        Powered by <a href="/" target="_blank">OpenBadge</a> &middot; Ed25519 Signed Credentials
      </footer>
    </div>

    <!-- Not found -->
    <div v-else class="bp-wrap">
      <section class="bp-hero" style="padding:64px 24px;border-radius:20px;">
        <h1 style="font-size:20px;opacity:.6;">Invite not found</h1>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";
import { getInvitePublic, claimInvite } from "../services/api";

const route = useRoute();
const loading = ref(true);
const invite = ref<any>(null);
const claimEmail = ref("");
const claimName = ref("");
const claiming = ref(false);
const claimError = ref("");
const claimSuccess = ref(false);
const claimedAssertionId = ref("");

onMounted(async () => {
  try {
    const token = route.params.token as string;
    const res = await getInvitePublic(token);
    invite.value = res.data;
    if (res.data.recipientEmail) claimEmail.value = res.data.recipientEmail;
    if (res.data.recipientName) claimName.value = res.data.recipientName;
  } catch {
    invite.value = null;
  } finally {
    loading.value = false;
  }
});

async function handleClaim() {
  claiming.value = true;
  claimError.value = "";
  try {
    const token = route.params.token as string;
    const res = await claimInvite(token, {
      recipientEmail: claimEmail.value,
      recipientName: claimName.value || undefined,
    });
    claimSuccess.value = true;
    claimedAssertionId.value = res.data.assertionId;
  } catch (e: any) {
    claimError.value = e.response?.data?.error || "Failed to claim badge";
  } finally {
    claiming.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
</script>

<style scoped>
/* Reuse badge-public styles */
.bp { min-height: 100vh; position: relative; overflow: hidden; display: flex; align-items: flex-start; justify-content: center; padding: 48px 20px 80px; background: #060d18; }
@keyframes bg-drift { 0% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
.bp-bg { position: fixed; inset: 0; background: radial-gradient(ellipse at 30% 20%, rgba(90,169,230,.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255,195,0,.06) 0%, transparent 50%); background-size: 200% 200%; animation: bg-drift 20s ease-in-out infinite; pointer-events: none; }
.bp-glow { position: fixed; top: -30%; left: 50%; transform: translateX(-50%); width: 700px; height: 700px; border-radius: 50%; background: radial-gradient(circle, rgba(90,169,230,.12) 0%, transparent 70%); pointer-events: none; }
.bp-wrap { position: relative; width: 100%; max-width: 520px; }
@keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
.bp-pulse { background: linear-gradient(90deg, rgba(255,255,255,.03) 25%, rgba(255,255,255,.06) 50%, rgba(255,255,255,.03) 75%); background-size: 800px 100%; animation: shimmer 1.5s infinite; }
.bp-hero { text-align: center; padding: 40px 24px 32px; background: linear-gradient(180deg, rgba(0,29,61,.6) 0%, rgba(0,10,24,.9) 100%); border: 1px solid rgba(90,169,230,.15); border-radius: 20px 20px 0 0; }
.bp-hero h1 { font-size: 22px; font-weight: 800; color: #f0f4fa; margin: 16px 0 0; letter-spacing: -.3px; line-height: 1.25; }
.bp-hero h1::after { display: none; }
.bp-hero h2::after { display: none; }
.bp-hero-img-slot { margin: 0 auto; }
.bp-ring { width: 100px; height: 100px; margin: 0 auto; border-radius: 50%; padding: 5px; background: conic-gradient(from 220deg, #ffc300, #5aa9e6, #22c55e, #ffc300); display: flex; align-items: center; justify-content: center; }
.bp-ring img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; background: #0a1628; border: 3px solid #0a1628; }
.bp-issuer-line { margin-top: 6px; font-size: 14px; color: #7b8fa8; }
.bp-issuer-line a { color: #5aa9e6; text-decoration: none; font-weight: 600; }
.bp-card { background: rgba(0,20,42,.85); border-left: 1px solid rgba(90,169,230,.15); border-right: 1px solid rgba(90,169,230,.15); border-bottom: 1px solid rgba(90,169,230,.15); border-radius: 0 0 20px 20px; }
.bp-foot { text-align: center; margin-top: 28px; font-size: 11px; color: #4a6078; line-height: 1.6; }
.bp-foot a { color: #5aa9e6; text-decoration: none; font-weight: 600; }

.invite-status-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.invite-status-icon--ok { background: rgba(34,197,94,.1); color: #22c55e; border: 2px solid rgba(34,197,94,.3); }
.invite-status-icon--fail { background: rgba(231,76,60,.1); color: #e74c3c; border: 2px solid rgba(231,76,60,.3); }

@media (max-width: 480px) {
  .bp { padding: 24px 12px 60px; }
  .bp-hero { padding: 28px 16px 24px; }
}
</style>
