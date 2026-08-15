import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BROWSE_STATE, backToDrillsHref, browseStateToQuery, drillHref,
  drillsHref, parseBrowseState,
} from './drill-query'
import type { DrillBrowseState } from './drill-query'
import { EMPTY_FILTER } from './filters'

const parse = (query: string) => parseBrowseState(new URLSearchParams(query))

const busy: DrillBrowseState = {
  library: 'goalkeeping',
  filter: {
    types: ['shot_stopping', 'crosses'],
    ageBands: [],
    durations: ['10to20'],
    playersToday: 6,
    tags: ['wet-weather', 'u9s'],
    search: 'diving',
  },
  sortKey: 'players_min',
  sortDir: 'desc',
  session: null,
}

describe('parseBrowseState', () => {
  it('opens a bare /drills on Outfield with no filters', () => {
    // Spec 5.1: the segment never persists across a fresh visit.
    expect(parse('')).toEqual(DEFAULT_BROWSE_STATE)
    expect(parse('').library).toBe('outfield')
    expect(parse('').filter).toEqual(EMPTY_FILTER)
  })

  it('reads every axis back', () => {
    expect(parse('lib=goalkeeping&type=shot_stopping,crosses&dur=10to20&players=6&tag=wet-weather,u9s&q=diving&sort=players_min:desc'))
      .toEqual(busy)
  })

  it('reads tags as free text, trimmed and de-duplicated, no allowlist', () => {
    expect(parse('tag= wet-weather ,u9s,wet-weather').filter.tags).toEqual(['wet-weather', 'u9s'])
    expect(parse('tag=').filter.tags).toEqual([])
  })

  it('accepts repeated params as well as comma-separated ones', () => {
    expect(parse('type=passing&type=shooting').filter.types).toEqual(['passing', 'shooting'])
  })

  it('drops unknown values rather than filtering on nonsense', () => {
    expect(parse('type=passing,not_a_type').filter.types).toEqual(['passing'])
    expect(parse('age=U9-U11,U99').filter.ageBands).toEqual(['U9-U11'])
    expect(parse('dur=lte10,forever').filter.durations).toEqual(['lte10'])
  })

  it('de-duplicates repeated values', () => {
    expect(parse('type=passing,passing').filter.types).toEqual(['passing'])
  })

  it('ignores a player count that is not a positive whole number', () => {
    for (const raw of ['0', '-3', 'abc', '2.5', '']) {
      expect(parse(`players=${raw}`).filter.playersToday).toBeNull()
    }
    expect(parse('players=12').filter.playersToday).toBe(12)
  })

  it('falls back to the default sort on a bad sort param', () => {
    expect(parse('sort=colour:sideways')).toMatchObject({ sortKey: 'duration', sortDir: 'asc' })
  })

  it('treats any library other than goalkeeping as outfield', () => {
    expect(parse('lib=martian').library).toBe('outfield')
    expect(parse('lib=goalkeeping').library).toBe('goalkeeping')
  })

  it('reads a session id, and treats a blank one as absent', () => {
    expect(parse('session=abc-123').session).toBe('abc-123')
    expect(parse('session=').session).toBeNull()
    expect(parse('').session).toBeNull()
  })
})

describe('browseStateToQuery', () => {
  it('is empty for the default state, so the clean URL is a bare /drills', () => {
    expect(browseStateToQuery(DEFAULT_BROWSE_STATE)).toBe('')
    expect(drillsHref(DEFAULT_BROWSE_STATE)).toBe('/drills')
  })

  it('stays readable — no percent-encoded commas or colons', () => {
    const query = browseStateToQuery(busy)
    expect(query).toContain('type=shot_stopping,crosses')
    expect(query).toContain('sort=players_min:desc')
    expect(query).not.toContain('%2C')
    expect(query).not.toContain('%3A')
  })

  it('omits a blank search', () => {
    expect(browseStateToQuery({ ...DEFAULT_BROWSE_STATE, filter: { ...EMPTY_FILTER, search: '  ' } }))
      .toBe('')
  })

  it('round-trips any state', () => {
    expect(parse(browseStateToQuery(busy))).toEqual(busy)
    expect(parse(browseStateToQuery(DEFAULT_BROWSE_STATE))).toEqual(DEFAULT_BROWSE_STATE)
  })

  it('carries a session id through the query, and drops it when absent', () => {
    const withSession: DrillBrowseState = { ...DEFAULT_BROWSE_STATE, session: 'sess-1' }
    expect(browseStateToQuery(withSession)).toBe('session=sess-1')
    expect(drillsHref(withSession)).toBe('/drills?session=sess-1')
    expect(parse(browseStateToQuery(withSession))).toEqual(withSession)
  })
})

describe('drillHref and backToDrillsHref', () => {
  it('carries the browse state into the drill and back out again', () => {
    const href = drillHref('abc', busy)
    expect(href.startsWith('/drills/abc?back=')).toBe(true)

    const back = new URLSearchParams(href.split('?')[1]).get('back')
    expect(backToDrillsHref(back!)).toBe(drillsHref(busy))
    expect(parse(backToDrillsHref(back!).split('?')[1])).toEqual(busy)
  })

  it('links plainly when there is nothing to carry', () => {
    expect(drillHref('abc', DEFAULT_BROWSE_STATE)).toBe('/drills/abc')
  })

  it('falls back to a bare /drills when back is absent or unusable', () => {
    expect(backToDrillsHref(undefined)).toBe('/drills')
    expect(backToDrillsHref('')).toBe('/drills')
    expect(backToDrillsHref(['a', 'b'])).toBe('/drills')
  })

  it('can only ever produce a /drills link, whatever back contains', () => {
    // `back` is re-parsed and re-serialised, never used as a URL.
    expect(backToDrillsHref('https://evil.example/x')).toBe('/drills')
    expect(backToDrillsHref('//evil.example')).toBe('/drills')
    expect(backToDrillsHref('lib=goalkeeping&next=//evil.example')).toBe('/drills?lib=goalkeeping')
  })

  it('carries a session id as its own top-level param, not nested inside back', () => {
    const withSession: DrillBrowseState = { ...busy, session: 'sess-1' }
    const href = drillHref('abc', withSession)
    expect(href).toContain('session=sess-1')

    const query = new URLSearchParams(href.split('?')[1])
    expect(query.get('session')).toBe('sess-1')
    // `back` carries the rest of the browse state, minus the session id —
    // the drill detail page (Task 7) reads `session` directly to decide its
    // own back-to-planner control, so it must not be buried in the opaque
    // `back` blob.
    const back = query.get('back')!
    expect(parse(back)).toEqual({ ...busy, session: null })
  })

  it('links with only a session id when there is nothing else to carry', () => {
    expect(drillHref('abc', { ...DEFAULT_BROWSE_STATE, session: 'sess-1' })).toBe('/drills/abc?session=sess-1')
  })

  it('backToDrillsHref never resurrects a session id from back, since drillHref never puts one there', () => {
    const href = drillHref('abc', { ...busy, session: 'sess-1' })
    const back = new URLSearchParams(href.split('?')[1]).get('back')!
    expect(backToDrillsHref(back).includes('session=')).toBe(false)
  })
})
