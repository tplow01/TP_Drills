import { describe, expect, it } from 'vitest'
import type { DrillInput } from './types'
import { fieldLabel, isComplete, missingFields } from './validation'

function input(over: Partial<DrillInput> = {}): DrillInput {
  return {
    library: 'outfield', name: 'Four-Goal Rondo', type: 'possession_rondo',
    age_band: 'U9-U11', suitable_from: null, duration_mins: 12,
    players_min: 8, players_max: 12, goals_needed: 4, cones_needed: 12,
    bibs_needed: true, image_url: null, setup: '30x20 grid',
    how_it_works: '5v3 possession', coaching_points: ['Scan before receiving'],
    progressions: null, source: null, tags: [], is_draft: false,
    ...over,
  }
}

describe('missingFields', () => {
  it('finds nothing missing on a complete outfield drill', () => {
    expect(missingFields(input())).toEqual([])
    expect(isComplete(input())).toBe(true)
  })

  it('requires at least one coaching point', () => {
    // The one deliberately opinionated constraint (spec 7.2).
    expect(missingFields(input({ coaching_points: [] }))).toContain('coaching_points')
  })

  it('ignores blank coaching points', () => {
    expect(missingFields(input({ coaching_points: ['   ', ''] }))).toContain('coaching_points')
  })

  it('requires an age band for outfield drills', () => {
    expect(missingFields(input({ age_band: null }))).toContain('age_band')
  })

  it('never requires an age band for goalkeeping drills', () => {
    const gk = input({ library: 'goalkeeping', type: 'shot_stopping', age_band: null })
    expect(missingFields(gk)).toEqual([])
  })

  it('requires name, setup and how_it_works to be non-blank', () => {
    const got = missingFields(input({ name: '  ', setup: '', how_it_works: '   ' }))
    expect(got).toContain('name')
    expect(got).toContain('setup')
    expect(got).toContain('how_it_works')
  })

  it('requires duration and minimum players', () => {
    const got = missingFields(input({ duration_mins: null, players_min: null }))
    expect(got).toContain('duration_mins')
    expect(got).toContain('players_min')
  })

  it('rejects a maximum below the minimum', () => {
    expect(missingFields(input({ players_min: 12, players_max: 8 }))).toContain('players_max')
  })

  it('accepts a null maximum as no upper limit', () => {
    expect(missingFields(input({ players_max: null }))).toEqual([])
  })

  it('reports the same gaps whether or not the drill is flagged draft', () => {
    // is_draft records intent to finish later; it does not change what is missing.
    const a = missingFields(input({ coaching_points: [], is_draft: true }))
    const b = missingFields(input({ coaching_points: [], is_draft: false }))
    expect(a).toEqual(b)
  })
})

describe('isComplete', () => {
  it('is false whenever anything is missing', () => {
    expect(isComplete(input({ coaching_points: [] }))).toBe(false)
  })
})

describe('fieldLabel', () => {
  it('gives every required field a human label', () => {
    for (const f of missingFields(input({
      name: '', setup: '', how_it_works: '', age_band: null,
      duration_mins: null, players_min: null, coaching_points: [],
    }))) {
      expect(fieldLabel(f).length).toBeGreaterThan(0)
    }
    expect(fieldLabel('coaching_points')).toBe('At least one coaching point')
  })
})
