import type { PanesConfig, PaneRule } from './options'

declare module '#app' {
  interface PageMeta {
    panes?: PaneRule | true | 'tab' | string
  }
}

declare module '#build/panes.config.mjs' {
  const panesConfig: PanesConfig
  export default panesConfig
}

export {}
