import { withPaneQuery } from '../query'
import { usePanesConfig } from './usePanes'

/** Mark a `:to` so the click stays in the current pane. */
export function paneIn(to: string) {
  return withPaneQuery(to, 'in', usePanesConfig().queryKey)
}

/** Mark a `:to` so the click opens or focuses the dest pane, ignoring `reuse`. */
export function paneTab(to: string) {
  return withPaneQuery(to, 'new', usePanesConfig().queryKey)
}
