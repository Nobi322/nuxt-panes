import { addComponentsDir, addImportsDir, addPlugin, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit'
import type { PanesConfig, PanesModuleOptions, PaneRule } from './runtime/options'
import { PANES_DEFAULTS, recordsToMatches } from './runtime/options'

function nitroPaneRules(routeRules: Record<string, Record<string, unknown>> | undefined) {
  const matches: PanesConfig['nitroRules'] = []
  for (const [pattern, value] of Object.entries(routeRules || {})) {
    if (!value || typeof value !== 'object' || !('panes' in value)) continue
    matches.push({ pattern, rule: value.panes as PaneRule })
  }
  return matches
}

export type ModuleOptions = PanesModuleOptions
export type { PanesModuleOptions, PaneRule, PanesConfig } from './runtime/options'
export type { Pane } from './runtime/policy'

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-panes',
    configKey: 'panes',
    compatibility: { nuxt: '>=3.0.0' }
  },
  defaults: {
    enabled: PANES_DEFAULTS.enabled,
    maxPanes: PANES_DEFAULTS.maxPanes,
    persist: PANES_DEFAULTS.persist,
    historyKey: PANES_DEFAULTS.historyKey,
    storageKey: PANES_DEFAULTS.storageKey,
    exclude: [],
    skipLayoutFalse: PANES_DEFAULTS.skipLayoutFalse,
    default: {},
    rules: {},
    pinned: [],
    homePath: PANES_DEFAULTS.homePath,
    queryKey: PANES_DEFAULTS.queryKey
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    const resolved: PanesConfig = {
      enabled: options.enabled ?? true,
      maxPanes: options.maxPanes ?? 12,
      persist: options.persist ?? true,
      historyKey: options.historyKey ?? PANES_DEFAULTS.historyKey,
      storageKey: options.storageKey ?? PANES_DEFAULTS.storageKey,
      exclude: options.exclude ?? [],
      skipLayoutFalse: options.skipLayoutFalse ?? true,
      defaultRule: options.default ?? {},
      rules: recordsToMatches(options.rules),
      nitroRules: nitroPaneRules(nuxt.options.routeRules as Record<string, Record<string, unknown>> | undefined),
      pinned: options.pinned ?? [],
      homePath: options.homePath ?? '/',
      queryKey: options.queryKey ?? PANES_DEFAULTS.queryKey
    }

    addTemplate({
      filename: 'panes.config.mjs',
      getContents: () => `export default ${JSON.stringify(resolved)}`
    })

    addPlugin(resolver.resolve('./runtime/plugin.client'))
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false
    })
    addImportsDir(resolver.resolve('./runtime/composables'))

    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: resolver.resolve('./runtime/types.d.ts') })
      references.push({ path: resolver.resolve('./runtime/nitro.d.ts') })
    })
  }
})
