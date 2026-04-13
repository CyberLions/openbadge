<template>
  <div class="app-layout">
    <aside class="sidebar">
      <h2>OpenBadge</h2>
      <nav>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/issuers">Issuers</router-link>
        <router-link to="/badge-classes">Badge Classes</router-link>
        <router-link to="/issue">Issue Badge</router-link>
        <router-link to="/assertions">Issued Badges</router-link>
      </nav>
    </aside>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>
