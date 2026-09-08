<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from '#imports'
import { usePanes } from '../composables/usePanes'

const route = useRoute()
const { panes, activeId, routeById, clientReady, bootstrap, classify, config } = usePanes()
const classified = computed(() => classify(route.path, route.meta))
const showPanes = computed(() => config.enabled && classified.value.enabled && clientReady.value)

onMounted(() => {
  clientReady.value = true
  bootstrap()
})
</script>

<template>
  <template v-if="showPanes">
    <PanePage
      v-for="pane in panes"
      :key="pane.id"
      :pane="pane"
      :active="pane.id === activeId"
      :resolved-route="routeById[pane.id]"
    />
  </template>
  <NuxtPage v-else />
</template>
