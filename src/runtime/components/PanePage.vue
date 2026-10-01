<script setup lang="ts">
import { computed } from 'vue'
import { providePaneActivity } from '../composables/usePaneActivity'
import { normalizePath, type Pane } from '../policy'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const props = defineProps<{
  pane: Pane
  active: boolean
  resolvedRoute?: RouteLocationNormalizedLoaded
}>()

const active = computed(() => props.active)
providePaneActivity(active)

// Path, not href: a query or hash change updates the route in place instead of remounting.
const pageKey = computed(() => normalizePath(props.pane.href))
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
        :page-key="pageKey"
        :keepalive="false"
      />
    </KeepAlive>
  </div>
</template>
