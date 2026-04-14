import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "landing",
      meta: { public: true },
      component: () => import("../views/LandingView.vue"),
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: () => import("../views/DashboardView.vue"),
    },
    {
      path: "/issuers",
      name: "issuers",
      component: () => import("../views/IssuersView.vue"),
    },
    {
      path: "/issuers/:id",
      name: "issuer-detail",
      component: () => import("../views/IssuerDetailView.vue"),
    },
    {
      path: "/badge-classes",
      name: "badge-classes",
      component: () => import("../views/BadgeClassesView.vue"),
    },
    {
      path: "/badge-classes/:id",
      name: "badge-class-detail",
      component: () => import("../views/BadgeClassDetailView.vue"),
    },
    {
      path: "/issue",
      name: "issue-badge",
      component: () => import("../views/IssueBadgeView.vue"),
    },
    {
      path: "/assertions",
      name: "assertions",
      component: () => import("../views/AssertionsView.vue"),
    },
    {
      path: "/api-keys",
      name: "api-keys",
      component: () => import("../views/ApiKeysView.vue"),
    },
    {
      path: "/activity",
      name: "activity-log",
      component: () => import("../views/ActivityLogView.vue"),
    },
    // Public pages (no auth required)
    {
      path: "/badges/:id",
      name: "badge-view",
      meta: { public: true },
      component: () => import("../views/BadgeViewPublic.vue"),
    },
    {
      path: "/invite/:token",
      name: "invite-claim",
      meta: { public: true },
      component: () => import("../views/InviteClaimView.vue"),
    },
  ],
});
