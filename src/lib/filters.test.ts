import { describe, expect, it } from 'vitest'
import type { Drill } from './types'
import {
  EMPTY_FILTER, activeFilterCount, describeFilter, filterDrills,
  matchesDuration, matchesPlayers, matchesSearch, mostRestrictiveAxis, sortDrills,
} from './filters'

function drill(over: Partial<Drill> = {}): Drill {
  return {
    id: 'id', library: 'outfield', name: 'Four-Goal Rondo',
    type: 'possession_rondo', age_band: 'U9-U11', suitable_from: null,
    duration_mins: 12, players_min: 8, players_max: 12,
    goals_needed: 4, cones_needed: 12, bibs_needed: true,
    image_url: null, setup: '30x20 grid', how_it_works: '5v3 possession',
    coaching_points: ['Scan before receiving'], progressions: null,
    source: null, tags: ['rondo', 'possession'], is_draft: false,
    deleted_at: null, created_at: '', updated_at: '',
    ...over,
  }
}

describe('matchesDuration', () => {
  it('treats 10 as the top of the short bucket', () => {
    expect(matchesDuration(10, 'lte10')).toBe(true)
    expect(matchesDuration(10, '10to20')).toBe(false)
  })

  it('treats 20 as the top of the middle bucket', () => {
    expect(matchesDuration(20, '10to20')).toBe(true)
    expect(matchesDuration(20, 'gte20')).toBe(false)
    expect(matchesDuration(21, 'gte20')).toBe(true)
  })

  it('excludes drafts with no duration from every bucket', () => {
    expect(matchesDuration(null, 'lte10')).toBe(false)
    expect(matchesDuration(null, 'gte20')).toBe(false)
  })
})

describe('matchesPlayers', () => {
  // This is the PRD bug. players_min <= N alone shows a drill capped at 12
  // when you have 20 players in front of you.
  it('excludes a drill whose maximum is below the players you have', () => {
    expect(matchesPlayers(drill({ players_min: 8, players_max: 12 }), 20)).toBe(false)
  })

  it('includes a drill whose range spans the players you have', () => {
    expect(matchesPlayers(drill({ players_min: 8, players_max: 12 }), 10)).toBe(true)
  })

  it('treats both bounds as inclusive', () => {
    const d = drill({ players_min: 8, players_max: 12 })
    expect(matchesPlayers(d, 8)).toBe(true)
    expect(matchesPlayers(d, 12)).toBe(true)
    expect(matchesPlayers(d, 7)).toBe(false)
    expect(matchesPlayers(d, 13)).toBe(false)
  })

  it('treats a null maximum as no upper limit', () => {
    expect(matchesPlayers(drill({ players_min: 9, players_max: null }), 40)).toBe(true)
    expect(matchesPlayers(drill({ players_min: 9, players_max: null }), 8)).toBe(false)
  })

  it('matches everything when no player count is entered', () => {
    expect(matchesPlayers(drill(), null)).toBe(true)
  })

  it('excludes drafts with no minimum once a count is entered', () => {
    expect(matchesPlayers(drill({ players_min: null }), 10)).toBe(false)
  })
})

describe('matchesSearch', () => {
  it('searches name, tags, setup and how_it_works case-insensitively', () => {
    const d = drill()
    expect(matchesSearch(d, 'RONDO')).toBe(true)      // name
    expect(matchesSearch(d, 'possession')).toBe(true) // tag and how_it_works
    expect(matchesSearch(d, '30x20')).toBe(true)      // setup
    expect(matchesSearch(d, 'crosses')).toBe(false)
  })

  it('ignores surrounding whitespace and matches empty queries', () => {
    expect(matchesSearch(drill(), '   ')).toBe(true)
    expect(matchesSearch(drill(), '  rondo  ')).toBe(true)
  })

  it('does not search coaching points', () => {
    // Spec 7.1 lists name, tags, setup, how_it_works. Nothing else.
    expect(matchesSearch(drill({ coaching_points: ['Zonal marking'] }), 'zonal')).toBe(false)
  })
})

describe('filterDrills', () => {
  const rondo = drill({ id: 'a', type: 'possession_rondo', duration_mins: 12, players_min: 8, players_max: 12 })
  const warmup = drill({ id: 'b', type: 'warm_up', duration_mins: 8, players_min: 4, players_max: null, name: 'Diamond Passing', tags: [] })
  const u6 = drill({ id: 'c', type: 'passing', age_band: 'U6-U8', duration_mins: 25, players_min: 6, players_max: null, name: 'Gates', tags: [] })

  it('returns everything on an empty filter', () => {
    expect(filterDrills([rondo, warmup, u6], EMPTY_FILTER)).toHaveLength(3)
  })

  it('ORs within the type axis', () => {
    const got = filterDrills([rondo, warmup, u6], { ...EMPTY_FILTER, types: ['possession_rondo', 'warm_up'] })
    expect(got.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('ANDs across axes', () => {
    const got = filterDrills([rondo, warmup, u6], {
      ...EMPTY_FILTER,
      types: ['possession_rondo', 'warm_up'],
      durations: ['lte10'],
    })
    expect(got.map((d) => d.id)).toEqual(['b'])
  })

  it('combines age band, duration and player count', () => {
    const got = filterDrills([rondo, warmup, u6], {
      ...EMPTY_FILTER,
      ageBands: ['U9-U11'],
      playersToday: 10,
    })
    expect(got.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('never returns soft-deleted drills', () => {
    const gone = drill({ id: 'z', deleted_at: '2026-01-01T00:00:00Z' })
    expect(filterDrills([rondo, gone], EMPTY_FILTER).map((d) => d.id)).toEqual(['a'])
  })
})

describe('sortDrills', () => {
  const a = drill({ id: 'a', duration_mins: 20, players_min: 4 })
  const b = drill({ id: 'b', duration_mins: 8, players_min: 12 })
  const c = drill({ id: 'c', duration_mins: null, players_min: null })

  it('sorts by duration in both directions', () => {
    expect(sortDrills([a, b], 'duration', 'asc').map((d) => d.id)).toEqual(['b', 'a'])
    expect(sortDrills([a, b], 'duration', 'desc').map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('sorts by minimum players', () => {
    expect(sortDrills([a, b], 'players_min', 'asc').map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('always sinks nulls to the bottom, whichever direction', () => {
    expect(sortDrills([c, a, b], 'duration', 'asc').map((d) => d.id)).toEqual(['b', 'a', 'c'])
    expect(sortDrills([c, a, b], 'duration', 'desc').map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate its input', () => {
    const input = [a, b]
    sortDrills(input, 'duration', 'asc')
    expect(input.map((d) => d.id)).toEqual(['a', 'b'])
  })
})

describe('activeFilterCount and describeFilter', () => {
  it('counts each populated axis once', () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0)
    expect(activeFilterCount({
      ...EMPTY_FILTER,
      types: ['passing', 'shooting'],
      durations: ['lte10'],
      playersToday: 14,
    })).toBe(3)
  })

  it('does not count search as a filter axis', () => {
    // Search has its own visible field; counting it would double-report.
    expect(activeFilterCount({ ...EMPTY_FILTER, search: 'rondo' })).toBe(0)
  })

  it('describes the active filters as one readable line', () => {
    expect(describeFilter({
      ...EMPTY_FILTER,
      types: ['passing', 'possession_rondo'],
      ageBands: ['U9-U11'],
      durations: ['10to20'],
      playersToday: 14,
    })).toBe('Passing, Possession / Rondo · U9-U11 · 10–20 min · fits 14')
  })

  it('describes an empty filter as no filters', () => {
    expect(describeFilter(EMPTY_FILTER)).toBe('No filters')
  })
})

describe('mostRestrictiveAxis', () => {
  const rondo = drill({ id: 'a', type: 'possession_rondo', duration_mins: 12, players_min: 8, players_max: 12 })

  it('names the axis whose removal recovers the most drills', () => {
    // players 30 excludes everything; type alone would have matched.
    const axis = mostRestrictiveAxis([rondo], {
      ...EMPTY_FILTER,
      types: ['possession_rondo'],
      playersToday: 30,
    })
    expect(axis).toBe('playersToday')
  })

  it('returns null when the filter is empty', () => {
    expect(mostRestrictiveAxis([rondo], EMPTY_FILTER)).toBeNull()
  })
})
