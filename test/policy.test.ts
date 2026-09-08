import { describe, expect, it } from 'vitest'
import { PANES_DEFAULTS, type PanesConfig } from '../src/runtime/options'
import {
  classifyRoute,
  evictExtras,
  intentForPush,
  makePane,
  neighborAfterClose,
  ownerForCanonical,
  paneId,
  pathMatches,
  readStamp,
  resolveRule
} from '../src/runtime/policy'

const config: PanesConfig = {
  ...PANES_DEFAULTS,
  exclude: ['/login', '/']
}

describe('pathMatches', () => {
  it('1. exact and trailing slash', () => {
    expect(pathMatches('/rdc/1/2', '/rdc/1/2/')).toBe(true)
    expect(pathMatches('/rdc/1/2', '/rdc/1/3')).toBe(false)
  })

  it('2. single-segment *', () => {
    expect(pathMatches('/rdc/*/*', '/rdc/1/2')).toBe(true)
    expect(pathMatches('/rdc/*/*', '/rdc/1')).toBe(false)
    expect(pathMatches('/rdc/*/*', '/rdc/1/2/3')).toBe(false)
  })

  it('3. ** matches nested paths', () => {
    expect(pathMatches('/dashboard/**', '/dashboard/pools')).toBe(true)
    expect(pathMatches('/dashboard/**', '/dashboard')).toBe(false)
  })
})

describe('classifyRoute', () => {
  it('1. exclude and layout false are off', () => {
    expect(classifyRoute('/login', {}, config).enabled).toBe(false)
    expect(classifyRoute('/dashboard', { layout: false }, config).enabled).toBe(false)
  })

  it('2. default is one tab per path', () => {
    const a = classifyRoute('/dashboard', { title: 'Dashboard' }, config)
    const b = classifyRoute('/dashboard/streams', { title: 'Streams' }, config)
    expect(a.enabled).toBe(true)
    expect(a.canonicalKey).toBe('/dashboard')
    expect(b.canonicalKey).toBe('/dashboard/streams')
    expect(a.canonicalKey).not.toBe(b.canonicalKey)
  })

  it('3. string meta is a singleton key', () => {
    const classified = classifyRoute('/dashboard/streams', { panes: 'streams', title: 'Streams' }, config)
    expect(classified.canonicalKey).toBe('streams')
  })

  it('4. reuse comes from page meta', () => {
    const classified = classifyRoute('/rdc/1/2', { panes: { reuse: '/rdc/*/*' }, title: 'Race' }, config)
    expect(classified.canonicalKey).toBe('/rdc/1/2')
    expect(classified.reuse).toEqual(['/rdc/*/*'])
  })

  it('5. routeRules beat module rules', () => {
    const local: PanesConfig = {
      ...config,
      rules: [{ pattern: '/app/**', rule: { key: 'from-module' } }],
      nitroRules: [{ pattern: '/app/**', rule: { key: 'from-nitro' } }]
    }
    expect(resolveRule('/app/x', {}, local)).toEqual({ key: 'from-nitro' })
  })

  it('6. page meta beats routeRules', () => {
    const local: PanesConfig = {
      ...config,
      nitroRules: [{ pattern: '/app/**', rule: { key: 'from-nitro' } }]
    }
    expect(resolveRule('/app/x', { panes: { key: 'from-page' } }, local)).toEqual({ key: 'from-page' })
  })
})

describe('intentForPush', () => {
  const raceA = classifyRoute('/rdc/1/2', { panes: { reuse: '/rdc/*/*' } }, config)
  const raceB = classifyRoute('/rdc/1/3', { panes: { reuse: '/rdc/*/*' } }, config)
  const streams = classifyRoute('/dashboard/streams', { title: 'Streams' }, config)

  it('1. new path opens a tab', () => {
    expect(intentForPush({
      to: streams,
      ownerId: null,
      activeId: paneId('/dashboard'),
      reuseGlobs: []
    })).toEqual({ id: paneId('/dashboard/streams'), mode: 'open' })
  })

  it('2. existing canonical focuses that tab', () => {
    expect(intentForPush({
      to: raceA,
      ownerId: 'pane:/rdc/1/2',
      activeId: paneId('/dashboard'),
      reuseGlobs: []
    })).toEqual({ id: 'pane:/rdc/1/2', mode: 'activate' })
  })

  it('3. reuse glob continues the active pane', () => {
    expect(intentForPush({
      to: raceB,
      ownerId: null,
      activeId: paneId('/rdc/1/2'),
      reuseGlobs: raceA.reuse
    })).toEqual({ id: paneId('/rdc/1/2'), mode: 'activate' })
  })

  it('4. reuse does not swallow unrelated paths', () => {
    expect(intentForPush({
      to: streams,
      ownerId: null,
      activeId: paneId('/rdc/1/2'),
      reuseGlobs: raceA.reuse
    })).toEqual({ id: paneId('/dashboard/streams'), mode: 'open' })
  })

  it('5. disabled routes have no intent', () => {
    expect(intentForPush({
      to: classifyRoute('/login', {}, config),
      ownerId: null,
      activeId: null,
      reuseGlobs: []
    })).toBeNull()
  })

  it('6. hint in stays in the active pane', () => {
    expect(intentForPush({
      to: raceB,
      ownerId: null,
      activeId: paneId('/rdc/1/2'),
      reuseGlobs: [],
      hint: 'in'
    })).toEqual({ id: paneId('/rdc/1/2'), mode: 'activate' })
  })

  it('7. hint new skips reuse and opens dest', () => {
    expect(intentForPush({
      to: raceB,
      ownerId: null,
      activeId: paneId('/rdc/1/2'),
      reuseGlobs: raceA.reuse,
      hint: 'new'
    })).toEqual({ id: paneId('/rdc/1/3'), mode: 'open' })
  })

  it('8. dest owner still wins over hint in', () => {
    expect(intentForPush({
      to: raceB,
      ownerId: paneId('/rdc/1/3'),
      activeId: paneId('/rdc/1/2'),
      reuseGlobs: [],
      hint: 'in'
    })).toEqual({ id: paneId('/rdc/1/3'), mode: 'activate' })
  })
})

describe('pane helpers', () => {
  it('1. neighborAfterClose prefers the left tab', () => {
    const panes = [
      makePane(classifyRoute('/a', {}, config)),
      makePane(classifyRoute('/b', {}, config)),
      makePane(classifyRoute('/c', {}, config))
    ]
    expect(neighborAfterClose(panes, panes[1]!.id)?.id).toBe(panes[0]!.id)
  })

  it('2. evictExtras drops oldest closable', () => {
    const panes = Array.from({ length: 4 }, (_, i) =>
      makePane(classifyRoute(`/p/${i}`, {}, config), undefined, i + 1)
    )
    const keep = panes[3]!
    const next = evictExtras(panes, keep.id, 3, [])
    expect(next).toHaveLength(3)
    expect(next.some(pane => pane.id === panes[0]!.id)).toBe(false)
    expect(next.some(pane => pane.id === keep.id)).toBe(true)
  })

  it('3. ownerForCanonical and readStamp', () => {
    const pane = makePane(classifyRoute('/x', {}, config))
    expect(ownerForCanonical([pane], '/x')?.id).toBe(paneId('/x'))
    expect(readStamp({ __nuxtPane: { v: 1, id: 'pane:/x' } }, '__nuxtPane')).toBe('pane:/x')
    expect(readStamp({}, '__nuxtPane')).toBeNull()
  })
})
