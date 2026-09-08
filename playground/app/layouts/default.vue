<template>
  <div class="shell">
    <header class="bar">
      <strong>nuxt-panes</strong>
      <nav class="links">
        <NuxtLink to="/inbox">Inbox</NuxtLink>
        <NuxtLink to="/settings/profile">Settings</NuxtLink>
        <NuxtLink to="/login">Login (no pane)</NuxtLink>
      </nav>
    </header>
    <div class="tabs">
      <PaneTabs />
    </div>
    <main class="body">
      <slot />
    </main>
  </div>
</template>
