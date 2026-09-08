import { describe, expect, it } from 'vitest'
import { omitQueryKey, readPaneHint, withPaneQuery } from '../src/runtime/query'

describe('pane query hint', () => {
  it('1. reads in and new, ignores junk', () => {
    expect(readPaneHint({ tab: 'in' }, 'tab')).toBe('in')
    expect(readPaneHint({ tab: 'new' }, 'tab')).toBe('new')
    expect(readPaneHint({ tab: 'nope' }, 'tab')).toBeNull()
    expect(readPaneHint({ tab: ['in', 'new'] }, 'tab')).toBe('in')
    expect(readPaneHint({}, 'tab')).toBeNull()
  })

  it('2. withPaneQuery keeps path query hash', () => {
    expect(withPaneQuery('/rdc/1/2', 'in', 'tab')).toBe('/rdc/1/2?tab=in')
    expect(withPaneQuery('/rdc/1/2?foo=1', 'in', 'tab')).toBe('/rdc/1/2?foo=1&tab=in')
    expect(withPaneQuery('/rdc/1/2#top', 'new', 'tab')).toBe('/rdc/1/2?tab=new#top')
  })

  it('3. omitQueryKey drops only the hint', () => {
    expect(omitQueryKey({ tab: 'in', foo: '1' }, 'tab')).toEqual({ foo: '1' })
    expect(omitQueryKey({ foo: '1' }, 'tab')).toEqual({ foo: '1' })
  })
})
