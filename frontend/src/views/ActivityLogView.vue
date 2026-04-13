<template>
  <div>
    <div class="page-header">
      <h1>Activity Log</h1>
    </div>

    <div class="card" style="margin-bottom: 20px; padding: 16px;">
      <div class="form-row">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Filter by action</label>
          <select v-model="filterAction" @change="load()" style="padding: 8px 12px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);">
            <option value="">All</option>
            <option v-for="a in actionTypes" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Filter by actor</label>
          <input v-model="filterActor" @input="debouncedLoad" placeholder="Search actor..." />
        </div>
      </div>
    </div>

    <div v-if="loading" class="card">
      <div v-for="n in 5" :key="n" style="padding: 12px 0; border-bottom: 1px solid var(--border);">
        <div class="skeleton skeleton-text w-3/4"></div>
        <div class="skeleton skeleton-text w-1/2"></div>
      </div>
    </div>

    <template v-else>
      <div class="card" v-if="events.length > 0">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 2px solid var(--border);">
              <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: var(--text-muted);">Time</th>
              <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: var(--text-muted);">Action</th>
              <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: var(--text-muted);">Actor</th>
              <th style="padding: 10px 12px; font-size: 12px; text-transform: uppercase; color: var(--text-muted);">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in events" :key="event.id" style="border-bottom: 1px solid var(--border);">
              <td style="padding: 10px 12px; font-size: 13px; white-space: nowrap; color: var(--text-muted);">
                {{ new Date(event.createdAt).toLocaleString() }}
              </td>
              <td style="padding: 10px 12px;">
                <span class="badge-tag" :style="actionStyle(event.action)">{{ event.action }}</span>
              </td>
              <td style="padding: 10px 12px; font-size: 13px;">
                {{ event.actor }}
                <span v-if="event.actorType !== 'user'" style="color: var(--text-muted); font-size: 11px;"> ({{ event.actorType }})</span>
              </td>
              <td style="padding: 10px 12px; font-size: 13px; color: var(--text-muted); max-width: 300px; overflow: hidden; text-overflow: ellipsis;">
                {{ formatDetails(event.details) }}
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="total > events.length" style="padding: 16px; text-align: center;">
          <button class="btn btn-outline btn-sm" @click="loadMore">Load more</button>
          <span style="margin-left: 12px; font-size: 13px; color: var(--text-muted);">{{ events.length }} of {{ total }}</span>
        </div>
      </div>

      <div v-else class="card">
        <div class="empty-state">No activity recorded yet.</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getAuditEvents } from "../services/api";

const events = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const filterAction = ref("");
const filterActor = ref("");

const actionTypes = [
  "badge.issued", "badge.bulk_issued", "badge.revoked",
  "issuer.created", "issuer.updated", "issuer.deleted",
  "badgeclass.created", "badgeclass.updated", "badgeclass.deleted",
  "apikey.created", "apikey.revoked",
  "user.login", "user.logout",
];

let debounceTimer: ReturnType<typeof setTimeout>;
function debouncedLoad() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => load(), 300);
}

async function load() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (filterAction.value) params.action = filterAction.value;
    if (filterActor.value) params.actor = filterActor.value;
    const res = await getAuditEvents(params);
    const data = res.data as any;
    events.value = data.events;
    total.value = data.total;
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  const params: Record<string, string> = { offset: String(events.value.length) };
  if (filterAction.value) params.action = filterAction.value;
  if (filterActor.value) params.actor = filterActor.value;
  const res = await getAuditEvents(params);
  const data = res.data as any;
  events.value.push(...data.events);
  total.value = data.total;
}

function actionStyle(action: string) {
  if (action.includes("revoked") || action.includes("deleted"))
    return { background: "var(--danger)", color: "#fff" };
  if (action.includes("created") || action.includes("issued") || action.includes("login"))
    return { background: "var(--success)", color: "#fff" };
  return { background: "var(--info, #5aa9e6)", color: "#fff" };
}

function formatDetails(details: any) {
  if (!details) return "";
  if (typeof details === "string") return details;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(details)) {
    if (v !== null && v !== undefined) {
      parts.push(`${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
    }
  }
  return parts.join(" | ");
}

onMounted(load);
</script>
