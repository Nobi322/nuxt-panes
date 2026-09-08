import { defineNuxtPlugin, useRouter } from '#imports'
import { intentForPush, ownerForCanonical } from './policy'
import { omitQueryKey, readPaneHint } from './query'
import { usePanes } from './composables/usePanes'

export default defineNuxtPlugin({
  name: 'panes',
  enforce: 'post',
  setup() {
    if (import.meta.server) return

    const router = useRouter()
    const panesCtrl = usePanes()
    const queryKey = panesCtrl.config.queryKey

    let popping = false
    let stripping = false
    window.addEventListener('popstate', () => {
      popping = true
    }, true)

    router.beforeEach((to) => {
      if (stripping) return
      if (!panesCtrl.clientReady.value) return
      if (panesCtrl.pending.value) return
      if (popping) {
        popping = false
        return
      }
      const classified = panesCtrl.classify(to.path, to.meta)
      const owner = ownerForCanonical(panesCtrl.panes.value, classified.canonicalKey)
      const active = panesCtrl.panes.value.find(pane => pane.id === panesCtrl.activeId.value)
      const intent = intentForPush({
        to: classified,
        ownerId: owner?.id ?? null,
        activeId: panesCtrl.activeId.value,
        reuseGlobs: active?.reuse ?? [],
        hint: readPaneHint(to.query, queryKey)
      })
      if (intent) panesCtrl.pending.value = intent
    })

    router.afterEach((to, _from, failure) => {
      if (failure) {
        panesCtrl.pending.value = null
        popping = false
        stripping = false
        return
      }
      if (!panesCtrl.clientReady.value) return

      if (stripping) {
        stripping = false
      } else {
        panesCtrl.reconcile(to.path, to.meta)
      }

      if (!readPaneHint(to.query, queryKey)) return
      stripping = true
      return router.replace({
        path: to.path,
        query: omitQueryKey(to.query, queryKey),
        hash: to.hash
      })
    })
  }
})
