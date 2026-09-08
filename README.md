# nuxt-panes

Retained-page tabs for Nuxt. One router, several mounted page instances, Back and Forward are real browser history.

SPA apps keep asking for Google Chrome-style tabs: leave the page running when you switch away, come back to the same scroll and the same form. Most implementations fake that with `KeepAlive` and then fight the browser. This module does not. Each tab is a real `NuxtPage`. Each visit still pushes a real history entry. Closing a tab does not splice history.

**Nuxt 3+.** Client-side after mount. The first SSR paint is a normal `NuxtPage`.

## Docs

| Doc | What it covers |
|---|---|
| [How it works](./docs/how-it-works.md) | Panes, history stamps, Back/Forward, close, persistence |
| [Configuration](./docs/configuration.md) | Options, rules, globs, precedence |
| [API](./docs/api.md) | Components, composables, page meta |

## Install

```bash
pnpm add nuxt-panes
```

```ts
export default defineNuxtConfig({
  modules: ['nuxt-panes']
})
```

`configKey` is `panes`.

Local checkout before npm exists:

```bash
pnpm add nuxt-panes@file:../nuxt-panes
```

Build the package first (`pnpm prepack` in this repo) so `dist/` exists.

## Quick start

**1.** Replace the root `NuxtPage` with `PaneHost` *inside* the layout. Sidebar and navbar stay shared. Only the page body is tabbed.

```vue
<!-- app.vue -->
<template>
  <NuxtLayout>
    <PaneHost />
  </NuxtLayout>
</template>
```

**2.** Put the tab strip in that layout, next to the navbar, not inside a page.

```vue
<!-- layouts/default.vue -->
<template>
  <header>
    <PaneTabs />
  </header>
  <slot />
</template>
```

**3.** Turn the module off for routes that should not get a pane. Login and marketing pages belong here.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-panes'],
  panes: {
    exclude: ['/', '/login'],
    homePath: '/app'
  },
  routeRules: {
    '/login': { panes: false }
  }
})
```

**4.** Hidden panes stay mounted. Gate GraphQL, websockets, and timers with `usePaneEnabled()` so a background tab does not keep the network busy.

```ts
const enabled = usePaneEnabled()
const { result } = useQuery(MyDocument, null, { enabled })
```

**5.** On logout, throw the session away. The module has no auth hook.

```ts
const { clear } = usePanes()
await clear()
```

## Default behavior

Each new pathname opens a tab. Visiting a path that already has a tab focuses it.

That is `panes.default: {}`. Override per path with module `rules`, Nitro `routeRules`, or `definePageMeta({ panes })`. Page meta beats routeRules beats module rules. `exclude` and `layout: false` beat all of those. Details in [configuration](./docs/configuration.md).

```ts
// One "settings" tab no matter which settings URL you are on.
definePageMeta({
  panes: { key: 'settings' }
})

// This page is never a pane.
definePageMeta({
  panes: false
})
```

Stay vs new pane on a **single click** (works on `NuxtLink`, `UButton :to`, any `:to`):

```vue
<NuxtLink :to="path">Open as tab</NuxtLink>
<NuxtLink :to="paneIn(path)">Stay in this tab</NuxtLink>
<NuxtLink :to="paneTab(path)">Ignore reuse, dest tab</NuxtLink>
```

`paneIn('/x')` is `/x?tab=in`. The plugin reads it, then `replace`s the URL so the query is gone. Default unmarked links still open a new pane. Page-level `reuse` globs still exist for hubs where every matching dest should stay.

Tab labels come from `definePageMeta({ title })`, else the last path segment. Rename the active tab at runtime with `usePanes().setCurrentLabel('Invoice 1842')`.

## What close does, and what it does not

Clicking X drops the pane from the strip and `replace`s the URL with a neighbor (or `homePath` if that was the last tab). It does **not** delete history entries.

Back after close can land on a URL whose pane is gone. Reconcile opens that path again. That is the point of using real history: the browser stack stays honest. If you wanted close to erase Back, you would be fighting `history`.

## Persistence

On by default. Panes write to `sessionStorage` under `panes.v1`.

Reload in the same browser tab restores the strip. Close that browser tab, or call `clear()`, and it is gone. This is not `localStorage` and not the server.

```ts
panes: {
  persist: false,            // opt out
  storageKey: 'panes.v1' // rename if you share origin with another app
}
```

## Tabs UI

`PaneTabs` shrinks like Google Chrome's tab bar: equal flex, 168px cap, 46px floor, ellipsis, close chip on hover. Close icon is inline SVG. Color classes (`bg-primary`, `text-inverted`, …) come from the host theme (Nuxt UI tokens work). Drive your own strip from `usePanes()` if those classes are missing.

## Limits (read these)

- **Pathname only.** Query and hash are stripped. `/inbox` and `/inbox?filter=unread` are the same tab. Restoring a tab navigates to the stored pathname, so the query is lost.
- **Cap.** `maxPanes` (default 12) LRU-drops closable tabs. Pinned keys and the tab you just opened are kept.
- **SSR.** Panes start after `PaneHost` mounts. Until then you get a plain `NuxtPage`.
- **No auth.** Call `clear()` yourself.
- **Background work.** Hidden panes are mounted. You must gate live work. See [how it works](./docs/how-it-works.md#background-work).

## File map

```
src/
├── module.ts                # defineNuxtModule, writes #build/panes.config.mjs
└── runtime/
    ├── plugin.client.ts     # beforeEach intent + popstate
    ├── options.ts
    ├── policy.ts            # pure classify / globs / eviction
    ├── query.ts
    ├── types.d.ts           # PageMeta.panes
    ├── nitro.d.ts           # routeRules.panes
    ├── composables/
    └── components/
docs/
test/                        # node vitest
playground/
```

Policy is framework-free and unit-tested from `test/policy.test.ts`.

## Publish

```bash
pnpm dev:prepare
pnpm test
pnpm prepack          # writes dist/
npm publish           # or pnpm release (changelogen + tag + push)
```

`files` publishes `dist` only. npm pack includes README and LICENSE automatically.

## License

MIT. See [LICENSE](./LICENSE).
