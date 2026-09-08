<script setup lang="ts">
definePageMeta({ title: 'Inbox' })
</script>

<template>
  <div>
    <h1>Inbox</h1>
    <p>Unmarked links open a new pane.</p>
    <p>
      <NuxtLink to="/inbox/42">Thread 42 (new pane)</NuxtLink>
      ·
      <NuxtLink :to="paneIn('/inbox/42')">Thread 42 (stay)</NuxtLink>
    </p>
  </div>
</template>
