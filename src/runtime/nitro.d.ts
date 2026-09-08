import type { PaneRule } from './options'

declare module 'nitropack/types' {
  interface NitroRouteConfig {
    panes?: PaneRule | true | 'tab' | string
  }
}

declare module 'nitropack' {
  interface NitroRouteConfig {
    panes?: PaneRule | true | 'tab' | string
  }
}

export {}
