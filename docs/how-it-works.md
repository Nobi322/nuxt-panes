# How it works

nuxt-panes is a pane manager on top of Vue Router, not a second router.

## Layout vs panes

Put `<PaneHost />` where `<NuxtPage />` would sit, **inside** `<NuxtLayout>`.

```
NuxtLayout          ← sidebar, navbar, PaneTabs  (one copy)
  PaneHost
    PanePage   ← v-show, still mounted
    PanePage
    PanePage
```

If the host wraps the layout, every tab remounts the sidebar. If the host is missing and the layout still has `NuxtPage`, you get normal Nuxt and a tab strip that lies.

`PaneHost` waits for `onMounted`, sets `clientReady`, then `bootstrap()`. Before that, it renders a normal `NuxtPage` so SSR has something to send.

## A pane

Each pane is a `Pane`:

- `id` like `pane:/dashboard` (or `pane:<key>` for singletons)
- `canonicalKey` that decides identity
- `href` last pathname shown in that pane
- `label`, `closable`, `reuse` globs
- `warm` / `lastActivatedAt` for LRU

The page instance is:

```vue
<NuxtPage
  :key="pane.id"
  :route="resolvedRoute"
  :page-key="pane.href"
  :keepalive="false"
/>
```

`resolvedRoute` is a snapshot from `router.resolve(href)` kept in `routeById`. Hidden panes keep that snapshot so `useRoute()` inside them does not jump to whatever the browser URL is now.

The pane wrapper is `v-show`, not `v-if`. Switching tabs does not destroy setup state. It also does not pause your `setInterval`. That is your job. See [Background work](#background-work).

## Navigation

The client plugin runs after Nuxt's router is up.

**Forward (link, `router.push`, tab click).** `beforeEach` classifies the destination and stores a pending intent: `open` a new pane or `activate` an existing one. `afterEach` consumes that intent in `reconcile()`.

If the dest query has `tab=in` or `tab=new`, that hint wins over `reuse` (`in` stays, `new` opens dest). Then `afterEach` `replace`s the same history entry without the flag so the address bar is clean. The strip navigation does not invent a second intent.

**Back / Forward.** A capture-phase `popstate` flag tells `beforeEach` to skip inventing an intent. `reconcile()` reads a stamp on `history.state.__nuxtPane` and focuses that pane. If the stamp is missing, it matches by `canonicalKey`, then creates a pane.

**Tab click.** `activate(pane)` sets pending and `router.push`es `pane.href` with the stamp in `state`. Same URL as now is a no-op plus a restamp.

The stamp shape is `{ v: 1, id }`. Rename the history key with `panes.historyKey` if another library already owns `__nuxtPane`.

## Identity

Default canonical key is the normalized pathname. `/settings/profile` and `/settings/billing` are two tabs.

Give a `key` and every URL that resolves to that key shares one pane. The pane's `href` updates as you move, so Back still has somewhere to go, and clicking the tab returns to the last path you were on inside it.

`reuse` is different. It does not change identity. While pane A is active, a matching destination stays in A instead of opening pane B. That swallows every matching click from that pane, including ones you wanted as a second tab. Prefer `paneIn()` on the stepper links when the same page also needs “open another pane.”

## Close

`close(id)`:

1. Refuses if `closable` is false or the key is in `pinned`.
2. Removes the pane and its route snapshot.
3. Writes `sessionStorage`.
4. If that pane was not active, stops. The URL does not change.
5. If it was active, `router.replace`s the previous tab's href, else the next, else `homePath`.

No `history.go(-n)`. No stack surgery. Old entries still exist. Hitting Back can reopen a closed path. Living with that is cheaper than lying to the browser.

## Cap

When a new pane would push the strip over `maxPanes`, `evictExtras` drops the oldest closable tabs by `lastActivatedAt`. It never drops the pane you just opened, and never drops `pinned` keys.

## Persistence

`persist()` writes `{ version: 1, panes: [...] }` to `sessionStorage`. Restore runs once in `bootstrap()`, and only if the in-memory list is empty.

Restored panes start `warm: false`. `PanePage` still mounts `NuxtPage` when the pane is active, so the first click after reload is a real page load of that URL, not a zombie from last session.

`clear()` empties memory and removes the storage key. Call it on logout.

## Labels

`classifyRoute` sets `defaultLabel` from `meta.title` or the last path segment. `select()` keeps an existing label when the canonical key did not change, so `setCurrentLabel` survives in-pane navigations that reuse the tab. A different key overwrites the label from meta again.

## Background work

Hidden panes are alive. A GraphQL subscription in a hidden race hub will keep running unless you stop it.

`PanePage` provides activity through `usePaneActivity()`. `usePaneEnabled()` is `true` only when *this* pane is the active one.

```ts
const enabled = usePaneEnabled()

const query = useQuery(RaceCardDocument, () => ({ id: raceId.value }), {
  enabled
})
```

AND an extra flag if you also need a selected id:

```ts
const enabled = usePaneEnabled(() => !!raceId.value)
```

Code that is *not* inside a pane (layout `useDaySchedule`, command palette) should not use this. Inject default is "always on", which is what you want for the layout, and also what unit tests get when they call the composable outside setup.

## Query strings

`normalizePath` drops `?` and `#`. The plugin classifies `to.path`, not `to.fullPath`.

`/inbox?tag=work` opens or focuses `/inbox`. The stored `href` has no query. Activating that tab later goes to `/inbox`. If your app's state lives in the query, either put it in pane-local component state or wait for this module to store `fullPath`. It does not today.
