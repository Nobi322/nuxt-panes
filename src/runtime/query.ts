import type { LocationQuery } from 'vue-router'
import type { PaneHint } from './policy'

export function readPaneHint(query: LocationQuery | undefined, key: string): PaneHint | null {
  const raw = query?.[key]
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'in' || value === 'new') return value
  return null
}

export function omitQueryKey(query: LocationQuery, key: string): LocationQuery {
  if (!(key in query)) return query
  const next: LocationQuery = {}
  for (const [name, value] of Object.entries(query)) {
    if (name !== key) next[name] = value
  }
  return next
}

/** Append `?tab=in` (or `new`) onto a path, keeping existing query and hash. */
export function withPaneQuery(href: string, mode: PaneHint, key: string): string {
  const url = new URL(href, 'http://panes.local')
  url.searchParams.set(key, mode)
  return `${url.pathname}${url.search}${url.hash}`
}
