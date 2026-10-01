// Minimal `#imports` for driving usePanes and the client plugin under vitest.
import { reactive, ref, type Ref } from 'vue'
import type { Router } from 'vue-router'

let router: Router | null = null
const states = new Map<string, Ref<unknown>>()

export function setTestRouter(next: Router) {
  router = next
  states.clear()
}

function current() {
  if (!router) throw new Error('setTestRouter() first')
  return router
}

export function useRouter() {
  return current()
}

export function useRoute() {
  return reactive(new Proxy({}, {
    get: (_, key) => (current().currentRoute.value as Record<PropertyKey, unknown>)[key]
  }))
}

export function useState<T>(key: string, init: () => T): Ref<T> {
  if (!states.has(key)) states.set(key, ref(init()) as Ref<unknown>)
  return states.get(key) as Ref<T>
}

export function defineNuxtPlugin<T>(plugin: T) {
  return plugin
}
