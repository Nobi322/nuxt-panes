<script setup lang="ts">
import { computed } from 'vue'
import { providePaneActivity } from '../composables/usePaneActivity'
import type { Pane } from '../policy'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const props = defineProps<{
  pane: Pane
  active: boolean
  resolvedRoute?: RouteLocationNormalizedLoaded
}>()

const active = computed(() => props.active)
providePaneActivity(active)
</script>

<template>
  <div
    v-show="active"
    :data-pane="pane.id"
  >
    <KeepAlive>
      <NuxtPage
        v-if="resolvedRoute && (pane.warm || active)"
        :key="pane.id"
        :route="resolvedRoute"
        :page-key="pane.href"
        :keepalive="false"
      />
    </KeepAlive>
  </div>
</template>
