import type { PanesConfig, PaneRule, PaneRuleObject } from './options'
import { PANES_DEFAULTS, asReuseList } from './options'

export type Pane = {
  id: string
  canonicalKey: string
  href: string
  label: string
  closable: boolean
  reuse: string[]
  warm: boolean
  lastActivatedAt: number
}

export type RouteMetaLite = {
  layout?: unknown
  panes?: unknown
  title?: unknown
}

export type ClassifiedRoute = {
  enabled: boolean
  canonicalKey: string
  href: string
  defaultLabel: string
  reuse: string[]
  closable: boolean
}

export type HistoryStamp = {
  v: 1
  id: string
}

export type PaneIntent = {
  id: string
  mode: 'open' | 'activate'
}

export function normalizePath(path: string) {
  const raw = path.split('#')[0]?.split('?')[0] ?? '/'
  if (!raw.startsWith('/')) return `/${raw}`
  if (raw.length > 1 && raw.endsWith('/')) return raw.slice(0, -1)
  return raw || '/'
}

export function pathMatches(pattern: string, path: string): boolean {
  const target = normalizePath(path)
  const glob = normalizePath(pattern)
  if (glob === target) return true
  let src = '^'
  let i = 0
  while (i < glob.length) {
    if (glob[i] === '*' && glob[i + 1] === '*') {
      src += '.*'
      i += 2
      if (glob[i] === '/') i += 1
      continue
    }
    if (glob[i] === '*') {
      src += '[^/]+'
      i += 1
      continue
    }
    const ch = glob[i] ?? ''
    if ('.*+?^${}()|[]\\'.includes(ch)) src += `\\${ch}`
    else src += ch
    i += 1
  }
  src += '$'
  return new RegExp(src).test(target)
}

export function matchBestRule(
  matches: Array<{ pattern: string, rule: PaneRule }>,
  path: string
): PaneRule | undefined {
  let best: { pattern: string, rule: PaneRule } | undefined
  for (const item of matches) {
    if (!pathMatches(item.pattern, path)) continue
    if (!best || item.pattern.length > best.pattern.length) best = item
  }
  return best?.rule
}

export function paneId(canonicalKey: string) {
  return `pane:${canonicalKey}`
}

export function readStamp(state: unknown, historyKey: string): string | null {
  const stamp = (state as { [key: string]: HistoryStamp } | null)?.[historyKey]
  return stamp?.v === 1 && stamp.id ? stamp.id : null
}

function labelFrom(path: string, meta: RouteMetaLite) {
  if (typeof meta.title === 'string' && meta.title) return meta.title
  const parts = normalizePath(path).split('/').filter(Boolean)
  return parts[parts.length - 1] || 'Page'
}

function normalizeRule(raw: unknown): PaneRule | undefined {
  if (raw === undefined) return undefined
  if (raw === false) return false
  if (raw === true || raw === 'tab') return {}
  if (typeof raw === 'string') return { key: raw }
  if (raw && typeof raw === 'object') return raw as PaneRuleObject
  return undefined
}

export function resolveRule(path: string, meta: RouteMetaLite, config: PanesConfig): PaneRule {
  if (config.skipLayoutFalse && meta.layout === false) return false
  if (config.exclude.some(pattern => pathMatches(pattern, path))) return false
  const fromMeta = normalizeRule(meta.panes)
  if (fromMeta !== undefined) return fromMeta
  const fromNitro = matchBestRule(config.nitroRules, path)
  if (fromNitro !== undefined) return fromNitro
  const fromRules = matchBestRule(config.rules, path)
  if (fromRules !== undefined) return fromRules
  return config.defaultRule
}

export function classifyRoute(
  path: string,
  meta: RouteMetaLite = {},
  config: PanesConfig = PANES_DEFAULTS
): ClassifiedRoute {
  const href = normalizePath(path)
  const rule = resolveRule(href, meta, config)
  const disabled: ClassifiedRoute = {
    enabled: false,
    canonicalKey: '',
    href,
    defaultLabel: '',
    reuse: [],
    closable: true
  }
  if (!config.enabled || rule === false) return disabled

  const canonicalKey = rule.key || href
  const reuse = asReuseList(rule.reuse)
  const pinned = config.pinned.includes(canonicalKey)
  return {
    enabled: true,
    canonicalKey,
    href,
    defaultLabel: labelFrom(href, meta),
    reuse,
    closable: rule.closable ?? !pinned
  }
}

export function makePane(
  classified: ClassifiedRoute,
  id?: string,
  at = Date.now()
): Pane {
  return {
    id: id ?? paneId(classified.canonicalKey),
    canonicalKey: classified.canonicalKey,
    href: classified.href,
    label: classified.defaultLabel,
    closable: classified.closable,
    reuse: classified.reuse,
    warm: true,
    lastActivatedAt: at
  }
}

export function ownerForCanonical(panes: Pane[], canonicalKey: string) {
  return panes.find(pane => pane.canonicalKey === canonicalKey)
}

export function neighborAfterClose(panes: Pane[], closedId: string) {
  const index = panes.findIndex(pane => pane.id === closedId)
  if (index < 0) return panes[0] ?? null
  return panes[index - 1] ?? panes[index + 1] ?? panes[0] ?? null
}

export function evictExtras(
  panes: Pane[],
  keepId: string,
  maxPanes: number,
  pinned: string[]
) {
  if (panes.length <= maxPanes) return panes
  const closable = panes
    .filter(pane => pane.closable && pane.id !== keepId && !pinned.includes(pane.canonicalKey))
    .sort((a, b) => a.lastActivatedAt - b.lastActivatedAt)
  const dropIds = new Set(closable.slice(0, panes.length - maxPanes).map(pane => pane.id))
  return panes.filter(pane => !dropIds.has(pane.id))
}

export function reuseHits(globs: string[], path: string) {
  return globs.some(glob => pathMatches(glob, path))
}

export type PaneHint = 'in' | 'new'

export function intentForPush(input: {
  to: ClassifiedRoute
  ownerId: string | null
  activeId: string | null
  reuseGlobs: string[]
  hint?: PaneHint | null
}): PaneIntent | null {
  if (!input.to.enabled) return null
  if (input.ownerId) return { id: input.ownerId, mode: 'activate' }
  if (input.hint === 'in' && input.activeId) return { id: input.activeId, mode: 'activate' }
  if (input.hint === 'new') return { id: paneId(input.to.canonicalKey), mode: 'open' }
  if (input.activeId && reuseHits(input.reuseGlobs, input.to.href)) {
    return { id: input.activeId, mode: 'activate' }
  }
  return { id: paneId(input.to.canonicalKey), mode: 'open' }
}
