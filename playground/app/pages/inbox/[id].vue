<script setup lang="ts">
definePageMeta({ title: 'Thread' })
const route = useRoute()
</script>

<template>
  <div>
    <h1>Thread {{ route.params.id }}</h1>
    <p>
      <NuxtLink :to="paneIn('/inbox')">Back to inbox (stay)</NuxtLink>
    </p>
  </div>
</template>
