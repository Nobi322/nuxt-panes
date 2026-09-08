import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter, useState } from '#imports'
import panesConfig from '#build/panes.config.mjs'
import type { PanesConfig } from '../options'
import { PANES_DEFAULTS } from '../options'
import {
  classifyRoute,
  evictExtras,
  makePane,
  neighborAfterClose,
  ownerForCanonical,
  readStamp,
  type Pane
} from '../policy'

type Pending = { id: string, mode: 'open' | 'activate' }

type Persisted = {
  version: 1
  panes: Array<Pick<Pane, 'id' | 'canonicalKey' | 'href' | 'label' | 'closable' | 'reuse'>>
}

function snapshotRoute(router: Router, path: string): RouteLocationNormalizedLoaded {
  const resolved = router.resolve(path)
  return {
    ...resolved,
    params: { ...resolved.params },
    query: { ...resolved.query },
    hash: resolved.hash,
    matched: resolved.matched.slice()
  } as RouteLocationNormalizedLoaded
}

const routeById = shallowRef<Record<string, RouteLocationNormalizedLoaded>>({})

export function usePanesConfig(): PanesConfig {
  return { ...PANES_DEFAULTS, ...panesConfig }
}

export function usePanes() {
  const router = useRouter()
  const route = useRoute()
  const config = usePanesConfig()

  const panes = useState<Pane[]>('nuxt-panes', () => [])
  const activeId = useState<string | null>('panes-active', () => null)
  const pending = useState<Pending | null>('panes-pending', () => null)
  const bootstrapped = useState('panes-bootstrapped', () => false)
  const clientReady = useState('panes-client-ready', () => false)

  const activePane = computed(() => panes.value.find(pane => pane.id === activeId.value) ?? null)

  function stampPane(id: string) {
    if (!import.meta.client) return
    history.replaceState(
      { ...history.state, [config.historyKey]: { v: 1, id } },
      '',
      location.href
    )
  }

  function setRouteSnapshot(id: string, path: string) {
    if (!import.meta.client) return
    routeById.value = { ...routeById.value, [id]: snapshotRoute(router, path) }
  }

  function paneById(id: string) {
    return panes.value.find(pane => pane.id === id)
  }

  function classify(path: string, meta: Record<string, unknown> = {}) {
    return classifyRoute(path, meta, config)
  }

  function select(pane: Pane, classified: ReturnType<typeof classifyRoute>) {
    const nextHref = classified.href || pane.href
    const hrefChanged = pane.href !== nextHref
    pane.href = nextHref
    pane.canonicalKey = classified.canonicalKey
    pane.reuse = classified.reuse
    pane.closable = classified.closable
    if (classified.defaultLabel) pane.label = classified.defaultLabel
    pane.warm = true
    pane.lastActivatedAt = Date.now()
    activeId.value = pane.id
    if (hrefChanged || !routeById.value[pane.id]) setRouteSnapshot(pane.id, pane.href)
    stampPane(pane.id)
    persist()
  }

  function ensurePane(classified: ReturnType<typeof classifyRoute>, id?: string) {
    if (!classified.enabled) return null
    const existing = (id && paneById(id)) || ownerForCanonical(panes.value, classified.canonicalKey)
    if (existing) return existing
    const created = makePane(classified, id)
    panes.value = evictExtras(
      [...panes.value, created],
      created.id,
      config.maxPanes,
      config.pinned
    )
    return created
  }

  function apply(pane: Pane, classified: ReturnType<typeof classifyRoute>) {
    const same = pane.canonicalKey === classified.canonicalKey
    const label = same && pane.label ? pane.label : classified.defaultLabel
    select(pane, { ...classified, defaultLabel: label })
  }

  function takePending() {
    const job = pending.value
    pending.value = null
    return job
  }

  function bootstrap() {
    if (bootstrapped.value) return
    bootstrapped.value = true
    const classified = classify(route.path, route.meta)
    if (!classified.enabled) return
    restore()
    const pane = ensurePane(classified, readStamp(import.meta.client ? history.state : null, config.historyKey) ?? undefined)
    if (pane) apply(pane, classified)
  }

  function reconcile(path: string, meta: Record<string, unknown>) {
    const classified = classify(path, meta)
    if (!classified.enabled) {
      activeId.value = null
      return
    }

    const job = takePending()
    if (job) {
      const owner = ownerForCanonical(panes.value, classified.canonicalKey)
      const pane = owner ?? ensurePane(classified, job.id)
      if (pane) apply(pane, classified)
      return
    }

    const stamped = import.meta.client ? readStamp(history.state, config.historyKey) : null
    const owner = ownerForCanonical(panes.value, classified.canonicalKey)
    if (owner) {
      apply(owner, classified)
      return
    }

    const stampedPane = stamped ? paneById(stamped) : undefined
    if (stampedPane) {
      apply(stampedPane, classified)
      return
    }

    const pane = ensurePane(classified, stamped ?? undefined)
    if (pane) apply(pane, classified)
  }

  async function activate(pane: Pane) {
    if (pane.id === activeId.value && route.path === pane.href) {
      stampPane(pane.id)
      return
    }
    pending.value = { id: pane.id, mode: 'activate' }
    await router.push({
      path: pane.href,
      state: { [config.historyKey]: { v: 1, id: pane.id } }
    })
  }

  async function close(id: string) {
    const pane = paneById(id)
    if (!pane?.closable) return
    const neighbor = neighborAfterClose(panes.value, id)
    const wasActive = activeId.value === id
    panes.value = panes.value.filter(item => item.id !== id)
    const cleaned: Record<string, RouteLocationNormalizedLoaded> = {}
    for (const [key, value] of Object.entries(routeById.value)) {
      if (key !== id && value) cleaned[key] = value
    }
    routeById.value = cleaned
    persist()
    if (!wasActive) return
    const dest = neighbor?.href ?? config.homePath
    if (neighbor) pending.value = { id: neighbor.id, mode: 'activate' }
    await router.replace({
      path: dest,
      state: neighbor ? { [config.historyKey]: { v: 1, id: neighbor.id } } : {}
    })
  }

  function setCurrentLabel(label: string) {
    const pane = activePane.value
    if (!pane || !label) return
    pane.label = label
    persist()
  }

  function persist() {
    if (!import.meta.client || !config.persist) return
    const payload: Persisted = {
      version: 1,
      panes: panes.value.map(pane => ({
        id: pane.id,
        canonicalKey: pane.canonicalKey,
        href: pane.href,
        label: pane.label,
        closable: pane.closable,
        reuse: pane.reuse
      }))
    }
    try {
      sessionStorage.setItem(config.storageKey, JSON.stringify(payload))
    } catch {
      // ignore quota / private mode
    }
  }

  function restore() {
    if (!import.meta.client || !config.persist || panes.value.length) return
    try {
      const raw = sessionStorage.getItem(config.storageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as Persisted
      if (parsed.version !== 1 || !Array.isArray(parsed.panes)) return
      panes.value = parsed.panes.map(item => ({
        ...item,
        reuse: item.reuse ?? [],
        warm: false,
        lastActivatedAt: 0
      }))
    } catch {
      sessionStorage.removeItem(config.storageKey)
    }
  }

  function clear() {
    panes.value = []
    activeId.value = null
    pending.value = null
    routeById.value = {}
    bootstrapped.value = false
    if (import.meta.client) sessionStorage.removeItem(config.storageKey)
  }

  return {
    panes,
    activeId,
    activePane,
    routeById,
    clientReady,
    pending,
    config,
    classify,
    bootstrap,
    reconcile,
    activate,
    close,
    setCurrentLabel,
    clear
  }
}
