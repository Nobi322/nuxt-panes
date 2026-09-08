export type PaneRule = false | PaneRuleObject

export type PaneRuleObject = {
  /** Share one tab across URLs. Omit = one tab per normalized path. */
  key?: string
  /** Globs. While this pane is active, matching dest URLs stay in the pane. */
  reuse?: string | string[]
  /** Default true unless the canonical key is in `pinned`. */
  closable?: boolean
}

export type PanesModuleOptions = {
  enabled?: boolean
  maxPanes?: number
  persist?: boolean
  historyKey?: string
  storageKey?: string
  /** Path globs that never use panes. */
  exclude?: string[]
  /** Treat `definePageMeta({ layout: false })` as excluded. Default true. */
  skipLayoutFalse?: boolean
  /** Fallback when no meta / routeRules / rules match. Default: tab per path. */
  default?: PaneRule
  /** Module-level path glob → rule. Beaten by routeRules and page meta. */
  rules?: Record<string, PaneRule>
  /** Canonical keys that cannot be closed. */
  pinned?: string[]
  /** Where to go after the last pane closes. Default `/`. */
  homePath?: string
  /** Query key for stay (`in`) / dest pane (`new`). Default `tab`. */
  queryKey?: string
}

export type PaneMatch = {
  pattern: string
  rule: PaneRule
}

export type PanesConfig = {
  enabled: boolean
  maxPanes: number
  persist: boolean
  historyKey: string
  storageKey: string
  exclude: string[]
  skipLayoutFalse: boolean
  defaultRule: PaneRule
  rules: PaneMatch[]
  nitroRules: PaneMatch[]
  pinned: string[]
  homePath: string
  queryKey: string
}

export const PANES_DEFAULTS: PanesConfig = {
  enabled: true,
  maxPanes: 12,
  persist: true,
  historyKey: '__nuxtPane',
  storageKey: 'panes.v1',
  exclude: [],
  skipLayoutFalse: true,
  defaultRule: {},
  rules: [],
  nitroRules: [],
  pinned: [],
  homePath: '/',
  queryKey: 'tab'
}

export function asReuseList(reuse: string | string[] | undefined): string[] {
  if (!reuse) return []
  return Array.isArray(reuse) ? reuse : [reuse]
}

export function recordsToMatches(records: Record<string, PaneRule> | undefined): PaneMatch[] {
  if (!records) return []
  return Object.entries(records).map(([pattern, rule]) => ({ pattern, rule }))
}
