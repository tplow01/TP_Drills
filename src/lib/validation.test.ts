import { describe, expect, it } from 'vitest'
import type { DrillInput } from './types'
import { fieldLabel, invalidFields, invalidLabel, isComplete, missingFields } from './validation'

function input(over: Partial<DrillInput> = {}): DrillInput {
  return {
    library: 'outfield', name: 'Four-Goal Rondo', type: 'possession_rondo',
    age_band: 'U9-U11', suitable_from: null, duration_mins: 12,
    players_min: 8, players_max: 12, goals_needed: 4, cones_needed: 12,
    bibs_needed: true, image_url: null, setup: ['30x20 grid'],
    how_it_works: ['5v3 possession'], coaching_points: ['Scan before receiving'],
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

  it('rejects a stale age band left over from switching to goalkeeping', () => {
    const gk = input({ library: 'goalkeeping', type: 'shot_stopping', age_band: 'U9-U11' })
    expect(missingFields(gk)).toContain('age_band')
  })

  it('requires name, setup and how_it_works to be non-blank', () => {
    const got = missingFields(input({ name: '  ', setup: [], how_it_works: ['   '] }))
    expect(got).toContain('name')
    expect(got).toContain('setup')
    expect(got).toContain('how_it_works')
  })

  it('requires duration and minimum players', () => {
    const got = missingFields(input({ duration_mins: null, players_min: null }))
    expect(got).toContain('duration_mins')
    expect(got).toContain('players_min')
  })

  it('accepts a null maximum as no upper limit', () => {
    expect(missingFields(input({ players_max: null }))).toEqual([])
  })

  it('does not call a present-but-impossible number missing', () => {
    // "Missing" and "invalid" are different states, and the coach is told
    // which. A zero duration is supplied, just unusable.
    const got = missingFields(input({ duration_mins: 0, players_min: 0 }))
    expect(got).not.toContain('duration_mins')
    expect(got).not.toContain('players_min')
  })

  it('reports the same gaps whether or not the drill is flagged draft', () => {
    // is_draft records intent to finish later; it does not change what is missing.
    const a = missingFields(input({ coaching_points: [], is_draft: true }))
    const b = missingFields(input({ coaching_points: [], is_draft: false }))
    expect(a).toEqual(b)
  })
})

describe('invalidFields', () => {
  // These mirror the positive_numbers and players_range_sane CHECK
  // constraints, which apply to every row including drafts. Anything this
  // function misses reaches the coach as a raw Postgres error.
  it('finds nothing wrong with a complete drill', () => {
    expect(invalidFields(input())).toEqual([])
  })

  it('rejects a zero or negative duration', () => {
    expect(invalidFields(input({ duration_mins: 0 }))).toContain('duration_mins')
    expect(invalidFields(input({ duration_mins: -5 }))).toContain('duration_mins')
  })

  it('rejects a zero or negative minimum players', () => {
    expect(invalidFields(input({ players_min: 0, players_max: null }))).toContain('players_min')
    expect(invalidFields(input({ players_min: -2, players_max: null }))).toContain('players_min')
  })

  it('rejects negative equipment counts', () => {
    expect(invalidFields(input({ goals_needed: -1 }))).toContain('goals_needed')
    expect(invalidFields(input({ cones_needed: -1 }))).toContain('cones_needed')
  })

  it('accepts zero equipment counts', () => {
    expect(invalidFields(input({ goals_needed: 0, cones_needed: 0 }))).toEqual([])
  })

  it('rejects a maximum below the minimum', () => {
    expect(invalidFields(input({ players_min: 12, players_max: 8 }))).toContain('players_max')
  })

  it('accepts a null maximum as no upper limit', () => {
    expect(invalidFields(input({ players_max: null }))).toEqual([])
  })

  it('treats a null duration or minimum as missing, not invalid', () => {
    expect(invalidFields(input({ duration_mins: null, players_min: null }))).toEqual([])
  })

  it('applies to drafts exactly as to finished drills', () => {
    // Unlike a missing field, an invalid one cannot be deferred: the CHECK
    // constraint fires whatever is_draft says.
    const a = invalidFields(input({ duration_mins: 0, is_draft: true }))
    const b = invalidFields(input({ duration_mins: 0, is_draft: false }))
    expect(a).toEqual(b)
    expect(a).toEqual(['duration_mins'])
  })
})

describe('invalidLabel', () => {
  it('names the problem for every invalid field', () => {
    const all = invalidFields(input({
      duration_mins: 0, players_min: 0, players_max: -1,
      goals_needed: -1, cones_needed: -1,
    }))
    expect(all).toHaveLength(5)
    for (const f of all) expect(invalidLabel(f).length).toBeGreaterThan(0)
    expect(invalidLabel('duration_mins')).toBe('Duration must be at least 1 minute')
  })
})

describe('isComplete', () => {
  it('is false whenever anything is missing', () => {
    expect(isComplete(input({ coaching_points: [] }))).toBe(false)
  })

  it('is false whenever anything is invalid', () => {
    expect(isComplete(input({ duration_mins: 0 }))).toBe(false)
  })
})

describe('fieldLabel', () => {
  it('gives every required field a human label', () => {
    for (const f of missingFields(input({
      name: '', setup: [], how_it_works: [], age_band: null,
      duration_mins: null, players_min: null, coaching_points: [],
    }))) {
      expect(fieldLabel(f).length).toBeGreaterThan(0)
    }
    expect(fieldLabel('coaching_points')).toBe('At least one coaching point')
  })
})
