# AGENTS.md — nuxt-panes

Nuxt module: retained-page tabs. One layout, several mounted `NuxtPage` instances, real browser history.

## Layout

```
src/module.ts              defineNuxtModule, writes #build/panes.config.mjs
src/runtime/
  plugin.client.ts         beforeEach intent + popstate + query-hint strip
  policy.ts                pure classify / globs / eviction (unit-tested)
  query.ts                 ?tab=in|new helpers
  options.ts               PanesModuleOptions
  components/              PaneHost, PaneTabs, PanePage
  composables/             usePanes, usePaneEnabled, paneIn, paneTab
docs/                      how-it-works, configuration, api
playground/                tiny app for manual clicks
test/                      node vitest (policy + query)
```

`PaneTabs` ships an inline close SVG. Color classes (`bg-primary`, …) come from the host theme (Nuxt UI tokens, or playground CSS). Not a Nuxt UI dependency.

## Scripts

```
pnpm install
pnpm dev:prepare    # stub dist + playground types; run after clone
pnpm test
pnpm lint
pnpm prepack        # dist/ for npm and for file: consumers
pnpm dev            # playground
```

CI runs prepare, lint, test, prepack.

## Publish

`files` is `dist` only. `pnpm prepack` must succeed before `npm publish`.

```
pnpm release        # lint, test, prepack, changelogen, npm publish, push tags
```

Do not publish from a dirty tree. First publish is `0.1.0`. Package name `nuxt-panes` (unscoped). GitHub `nobi322/nuxt-panes`.

A host app that depends via `file:../nuxt-panes` keeps the last `dist/` until you run `pnpm prepack` again.
