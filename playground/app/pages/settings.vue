<script setup lang="ts">
definePageMeta({
  title: 'Settings',
  panes: { key: 'settings' }
})
</script>

<template>
  <div>
    <h1>Settings</h1>
    <p>Singleton pane. Profile and billing share one tab.</p>
    <p>
      <NuxtLink :to="paneIn('/settings/profile')">Profile</NuxtLink>
      ·
      <NuxtLink :to="paneIn('/settings/billing')">Billing</NuxtLink>
    </p>
    <NuxtPage />
  </div>
</template>
