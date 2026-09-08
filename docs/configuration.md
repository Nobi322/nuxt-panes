# Configuration

All of this is the `panes` key in `nuxt.config`. Types come from `PanesModuleOptions`.

## Options

| Option | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Master switch. `false` makes every route a normal `NuxtPage`. |
| `maxPanes` | `12` | LRU drop of closable tabs when the strip grows past this. |
| `persist` | `true` | Write panes to `sessionStorage`. |
| `storageKey` | `'panes.v1'` | Storage key. |
| `historyKey` | `'__nuxtPane'` | Key on `history.state` for the pane stamp. |
| `exclude` | `[]` | Path globs that never become panes. Beats page meta. |
| `skipLayoutFalse` | `true` | `definePageMeta({ layout: false })` is treated as excluded. |
| `default` | `{}` | Rule when nothing else matches. `{}` means one tab per path. |
| `rules` | `{}` | Path glob → rule. Beaten by `routeRules` and page meta. |
| `pinned` | `[]` | Canonical keys that cannot close (`closable` forced off). |
| `homePath` | `'/'` | `router.replace` target after the last tab closes. |
| `queryKey` | `'tab'` | Query flag for stay (`in`) or dest pane (`new`). Stripped after navigate. |

```ts
export default defineNuxtConfig({
  modules: ['nuxt-panes'],
  panes: {
    exclude: ['/', '/login'],
    homePath: '/app',
    maxPanes: 12,
    persist: true,
    rules: {
      '/settings/**': { key: 'settings' }
    }
  }
})
```

## Rule

A rule is `false` (no pane) or an object:

```ts
{
  key?: string              // singleton tab id. omit = pathname is the id
  reuse?: string | string[] // dest globs that stay in the *current* pane
  closable?: boolean        // default true, unless key is in `pinned`
}
```

Shorthand, mainly in page meta and `routeRules`:

| Write | Means |
|---|---|
| `false` | No pane. |
| `true` or `'tab'` | Per-path tab (`{}`). |
| `'settings'` | `{ key: 'settings' }` |
| `{ key, reuse, closable }` | As written. |

`routeRules['/x'].panes` uses the same shape. The module copies those entries at build time into `nitroRules`.

```ts
export default defineNuxtConfig({
  routeRules: {
    '/login': { panes: false },
    '/app/settings/**': { panes: { key: 'settings' } }
  }
})
```

```ts
definePageMeta({
  title: 'Project',
  panes: { reuse: '/projects/*/*' }
})
```

## Precedence

First match wins. This is the actual `resolveRule` order, not a suggestion.

1. Module `enabled: false` → everything off (`classifyRoute`).
2. `layout: false` when `skipLayoutFalse` is on.
3. `panes.exclude` globs.
4. `definePageMeta({ panes })`.
5. `routeRules[].panes` (longest matching pattern).
6. `panes.rules` (longest matching pattern).
7. `panes.default`.

Exclude cannot be undone from a page. If `/login` is excluded, `definePageMeta({ panes: true })` on that page still does nothing.

Among glob maps, the **longest pattern string** that matches wins. `/app/settings/**` beats `/app/**` because it is longer, not because it is more specific in glob semantics. Keep that in mind if you write two patterns of equal length.

## Globs

Used by `exclude`, `rules`, `routeRules` keys, and `reuse`.

| Pattern | Matches |
|---|---|
| `/inbox` | `/inbox` and `/inbox/` |
| `/mail/*` | `/mail/a`, not `/mail` and not `/mail/a/b` |
| `/mail/*/*` | `/mail/a/b` only |
| `/mail/**` | `/mail/a`, `/mail/a/b`, … not `/mail` itself |
| `/mail/**` + `/mail` | Put both in `exclude` if you need the index too |

`*` is one path segment. `**` is the rest, including slashes. Trailing slashes are normalized away before the test.

`reuse` is checked against the destination href while the *active* pane is the one holding those globs. A match keeps the current pane even if the dest would otherwise be a new per-path tab.

To stay or force a dest tab on **one link** without wrapping `NuxtLink`, put a query flag on `:to`. The plugin strips it after the navigation (push, then replace the same entry so Back is clean).

```vue
<NuxtLink :to="paneIn('/mail/42')" />  <!-- /mail/42?tab=in -->
<UButton :to="paneTab(path)" />
<NuxtLink :to="paneIn(rowHref)" />
```

| Query | Effect |
|---|---|
| (none) | New pane, unless dest already has one or `reuse` hits. |
| `tab=in` | Stay in the current pane. If dest already has a pane, focus that one instead (no duplicates). |
| `tab=new` | Open or focus the dest pane. Skips `reuse`. |

Rename the flag with `panes.queryKey` if `tab` is already an app filter.

## Pinned vs `closable: false`

`pinned: ['/app']` marks canonical key `/app` as unclosable. Use `pinned: ['settings']` when the rule set `key: 'settings'`.

`{ closable: false }` on a rule does the same for routes that hit that rule.

The close button is omitted when `pane.closable` is false. `close()` is a no-op.

## Home path

After the last closable tab goes away, `close()` does `router.replace(homePath)`. If `homePath` itself is excluded, you leave pane mode and `PaneHost` falls back to `NuxtPage`. Set `homePath` to something that *does* use panes if you want an empty strip to become a fresh home tab.
