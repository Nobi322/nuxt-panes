<script setup lang="ts">
import { usePanes } from '../composables/usePanes'

const { panes, activeId, activate, close } = usePanes()

function onActivate(id: string) {
  const pane = panes.value.find(item => item.id === id)
  if (pane) void activate(pane)
}

function onClose(id: string) {
  void close(id)
}
</script>

<template>
  <nav
    v-if="panes.length"
    class="ws-tabs"
    aria-label="Panes"
  >
    <span
      v-for="pane in panes"
      :key="pane.id"
      class="ws-tab"
      :class="pane.id === activeId
        ? 'is-active border-primary bg-primary text-inverted'
        : 'border-default bg-default text-muted hover:bg-elevated hover:text-highlighted'"
    >
      <button
        type="button"
        class="ws-title"
        :title="pane.label"
        @click="onActivate(pane.id)"
      >
        <span class="ws-label">{{ pane.label }}</span>
      </button>
      <button
        v-if="pane.closable"
        type="button"
        class="ws-close"
        :title="`Close ${pane.label}`"
        :aria-label="`Close ${pane.label}`"
        @click.stop="onClose(pane.id)"
      >
        <svg
          class="ws-x"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M3 3l6 6M9 3L3 9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </span>
  </nav>
</template>

<style scoped>
.ws-tabs {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  height: 1.75rem;
  gap: 0.375rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.ws-tabs::-webkit-scrollbar {
  display: none;
}

.ws-tab {
  display: flex;
  align-items: center;
  flex: 1 1 0%;
  min-width: 46px;
  max-width: 168px;
  height: 100%;
  overflow: hidden;
  border-radius: 0.375rem;
  border-width: 1px;
  border-style: solid;
}

.ws-title {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  flex: 1 1 0%;
  height: 1.25rem;
  padding: 0 0.5rem;
  text-align: left;
  font-size: 0.875rem;
  line-height: 1;
}

.ws-label {
  min-width: 0;
  flex: 1 1 0%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1;
}

.ws-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.125rem;
  padding: 0;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 9999px;
  line-height: 0;
  font-size: 0;
  cursor: pointer;
}

.ws-x {
  display: block;
  width: 0.75rem;
  height: 0.75rem;
  flex-shrink: 0;
}

.ws-tab:not(.is-active) .ws-close {
  opacity: 0;
  pointer-events: none;
}

.ws-tab:not(.is-active):hover .ws-close,
.ws-tab:not(.is-active):focus-within .ws-close {
  opacity: 1;
  pointer-events: auto;
}

.ws-close:hover {
  background: color-mix(in srgb, currentColor 32%, transparent);
}

.ws-close:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 1px;
}
</style>
