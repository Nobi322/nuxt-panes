import { computed, getCurrentInstance, inject, provide, toValue } from 'vue'
import type { ComputedRef, InjectionKey, MaybeRefOrGetter } from 'vue'

export type PaneActivity = {
  active: ComputedRef<boolean>
}

export const PaneActivityKey: InjectionKey<PaneActivity> = Symbol('pane-activity')

const alwaysOn: PaneActivity = { active: computed(() => true) }

export function providePaneActivity(active: ComputedRef<boolean>) {
  provide(PaneActivityKey, { active })
}

export function usePaneActivity(): PaneActivity {
  if (!getCurrentInstance()) return alwaysOn
  return inject(PaneActivityKey, alwaysOn)
}

export function usePaneEnabled(extra?: MaybeRefOrGetter<boolean>) {
  const { active } = usePaneActivity()
  return computed(() => active.value && (extra == null || toValue(extra)))
}
