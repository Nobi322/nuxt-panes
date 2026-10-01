import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { setTestRouter } from './stubs/imports'
import plugin from '../src/runtime/plugin.client'
import { usePanes } from '../src/runtime/composables/usePanes'
import { normalizePath } from '../src/runtime/policy'

const Page = { render: () => null }

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key)
  }
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

function makeRouter(): Router {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Page },
      { path: '/dashboard/streams', component: Page, meta: { title: 'Streams' } },
      { path: '/races/:id', component: Page, meta: { title: 'Race' } }
    ]
  })
  setTestRouter(router)
  return router
}

/** Fresh router + plugin, as on a page load at `start`. Session storage survives between calls. */
async function boot(start: string) {
  const router = makeRouter()
  ;(plugin as unknown as { setup: () => void }).setup()
  await router.push(start)
  await router.isReady()
  const panes = usePanes()
  panes.clientReady.value = true
  panes.bootstrap()
  return { router, panes }
}

function paneFor(panes: ReturnType<typeof usePanes>, canonicalKey: string) {
  const pane = panes.panes.value.find(item => item.canonicalKey === canonicalKey)
  if (!pane) throw new Error(`no pane for ${canonicalKey}`)
  return pane
}

beforeEach(() => {
  const state = { value: null as unknown }
  vi.stubGlobal('window', { addEventListener: () => {} })
  vi.stubGlobal('location', { href: 'http://panes.test/' })
  vi.stubGlobal('history', {
    get state() {
      return state.value
    },
    replaceState: (next: unknown) => {
      state.value = next
    }
  })
  vi.stubGlobal('sessionStorage', memoryStorage())
  makeRouter()
  usePanes().clear()
})

describe('pane destinations keep query and hash', () => {
  it('1. filtered page → another pane → original tab returns to the filter', async () => {
    const { router, panes } = await boot('/dashboard/streams?date=2025-02-02')
    await router.push('/races/7')
    expect(panes.panes.value).toHaveLength(2)

    await panes.activate(paneFor(panes, '/dashboard/streams'))

    expect(router.currentRoute.value.fullPath).toBe('/dashboard/streams?date=2025-02-02')
    const streams = paneFor(panes, '/dashboard/streams')
    expect(panes.activeId.value).toBe(streams.id)
    expect(panes.routeById.value[streams.id]?.query).toEqual({ date: '2025-02-02' })
  })

  it('2. hash survives tab activation', async () => {
    const { router, panes } = await boot('/dashboard/streams?date=2025-02-02#top')
    await router.push('/races/7')
    await panes.activate(paneFor(panes, '/dashboard/streams'))
    expect(router.currentRoute.value.fullPath).toBe('/dashboard/streams?date=2025-02-02#top')
  })

  it('3. query-only change updates the same pane without a new page key', async () => {
    const { router, panes } = await boot('/dashboard/streams?date=2025-02-02')
    const before = paneFor(panes, '/dashboard/streams')
    const snapshot = panes.routeById.value[before.id]

    await router.push('/dashboard/streams?date=2025-03-03')

    expect(panes.panes.value).toHaveLength(1)
    const after = paneFor(panes, '/dashboard/streams')
    expect(after.id).toBe(before.id)
    expect(after.href).toBe('/dashboard/streams?date=2025-03-03')
    expect(normalizePath(after.href)).toBe(normalizePath(before.href))
    expect(panes.routeById.value[after.id]).not.toBe(snapshot)
    expect(panes.routeById.value[after.id]?.query).toEqual({ date: '2025-03-03' })
  })

  it('4. pane hint is stripped before the destination is stored', async () => {
    const { router, panes } = await boot('/dashboard/streams')
    await router.push('/races/7?tab=new&lap=3#sector')
    await settle()

    expect(paneFor(panes, '/races/7').href).toBe('/races/7?lap=3#sector')
    expect(router.currentRoute.value.fullPath).toBe('/races/7?lap=3#sector')
  })

  it('5. closing the active neighbor restores the filtered destination', async () => {
    const { router, panes } = await boot('/dashboard/streams?date=2025-02-02')
    await router.push('/races/7')

    await panes.close(paneFor(panes, '/races/7').id)

    expect(panes.panes.value).toHaveLength(1)
    expect(router.currentRoute.value.fullPath).toBe('/dashboard/streams?date=2025-02-02')
  })

  it('6. session restore keeps the stored destination', async () => {
    const first = await boot('/dashboard/streams?date=2025-02-02')
    await first.router.push('/races/7')

    const { router, panes } = await boot('/races/7')
    expect(panes.panes.value).toHaveLength(2)
    await panes.activate(paneFor(panes, '/dashboard/streams'))

    expect(router.currentRoute.value.fullPath).toBe('/dashboard/streams?date=2025-02-02')
  })
})
