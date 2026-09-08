# API

Auto-imported in the Nuxt app. Components register without a prefix.

## Components

### `PaneHost`

Replaces root `NuxtPage` inside the layout. Renders one `PanePage` per pane once `clientReady` is true and the current route classifies as enabled. Otherwise renders `NuxtPage`.

No props. Mount exactly once.

### `PanePage`

Used by the host. You rarely mount this yourself.

| Prop | Type | |
|---|---|---|
| `pane` | `Pane` | Identity and href. |
| `active` | `boolean` | Controls `v-show` and activity inject. |
| `resolvedRoute` | `RouteLocationNormalizedLoaded` | Snapshot fed to `NuxtPage`. |

Provides `usePaneActivity()`. Sets `data-pane` to the pane id.

### `PaneTabs`

Default strip. Reads `usePanes()` and calls `activate` / `close`.

No props. Close icon is inline SVG. Color classes expect a host theme: `border-primary`, `bg-primary`, `text-inverted`, `border-default`, `bg-default`, `text-muted`, `hover:bg-elevated`, `hover:text-highlighted`. Swap the strip if those classes do not exist.

Tab strip layout lives in scoped CSS: `flex: 1 1 0%`, `max-width: 168px`, `min-width: 46px`, ellipsis, round close hit target.

Wire a custom strip like this:

```vue
<script setup lang="ts">
const { panes, activeId, activate, close } = usePanes()
</script>

<template>
  <button
    v-for="pane in panes"
    :key="pane.id"
    :aria-current="pane.id === activeId ? 'page' : undefined"
    @click="activate(pane)"
  >
    {{ pane.label }}
    <button
      v-if="pane.closable"
      type="button"
      @click.stop="close(pane.id)"
    >
      Close
    </button>
  </button>
</template>
```

## Composables

### `usePanes()`

Shared pane controller. Safe in the layout and in pages.

| Field | Type | |
|---|---|---|
| `panes` | `Ref<Pane[]>` | Strip order. |
| `activeId` | `Ref<string \| null>` | |
| `activePane` | `ComputedRef<Pane \| null>` | |
| `config` | `PanesConfig` | Resolved module options. |
| `classify(path, meta?)` | | Same rules as the plugin. |
| `activate(pane)` | `Promise<void>` | `router.push` to `pane.href`. |
| `close(id)` | `Promise<void>` | Drop pane. Maybe `replace` to a neighbor. |
| `setCurrentLabel(label)` | | Rename the active pane. Persists. |
| `clear()` | | Empty strip, drop `sessionStorage`. |

`bootstrap` / `reconcile` / `pending` / `clientReady` are for the host and plugin. Calling them from a page will fight the controller.

### `paneIn(to)` / `paneTab(to)`

String in, string out. Appends `?tab=in` or `?tab=new` (or your `queryKey`). Use on any `:to`.

```ts
paneIn('/projects/acme/board')              // '/projects/acme/board?tab=in'
paneIn('/projects/acme/board?foo=1')        // '/projects/acme/board?foo=1&tab=in'
paneTab(itemPath(org, id))                 // '...?tab=new'
```

### `usePaneEnabled(extra?)`

`ComputedRef<boolean>`. True when this component tree is the active pane, and `extra` is true if you passed it.

`extra` is `MaybeRefOrGetter<boolean>`. Useful for "pane is active *and* we have an id".

Outside `setup()`, or outside a pane, this is `true`. Layout code keeps running.

### `usePaneActivity()`

`{ active: ComputedRef<boolean> }`. Lower-level inject. Prefer `usePaneEnabled`.

### `usePanesConfig()`

Resolved config object. Prefer `usePanes().config` unless you need options before the controller exists.

## Page meta

```ts
definePageMeta({
  title: 'Inbox',
  panes: false | true | 'tab' | string | {
    key?: string
    reuse?: string | string[]
    closable?: boolean
  }
})
```

`title` is the default tab label. Typed via `PageMeta.panes` in `runtime/types.d.ts`.

Nitro `routeRules` get the same union on `NitroRouteConfig.panes`.

## Pane object

```ts
type Pane = {
  id: string
  canonicalKey: string
  href: string
  label: string
  closable: boolean
  reuse: string[]
  warm: boolean
  lastActivatedAt: number
}
```

`id` is `pane:${canonicalKey}` unless restore/bootstrap supplied another one. Do not invent ids in app code. Create panes by navigating.

## Policy helpers

`runtime/policy.ts` is pure. Tests import it directly. You can too, but the composable is the supported app API.

Useful if you are writing a custom controller: `pathMatches`, `classifyRoute`, `intentForPush`, `evictExtras`, `neighborAfterClose`.
