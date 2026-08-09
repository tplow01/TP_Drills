import { describe, expect, it } from 'vitest'
import type { Drill, SessionDrillWithDrill } from './types'
import { effectiveDuration, plannedMinutes, timingSummary } from './session-timing'

function drill(over: Partial<Drill> = {}): Drill {
  return {
    id: 'd1', library: 'outfield', name: 'Rondo', type: 'possession_rondo',
    age_band: 'U9-U11', suitable_from: null, duration_mins: 12,
    players_min: 8, players_max: 12, goals_needed: 0, cones_needed: 0,
    bibs_needed: false, image_url: null, setup: '', how_it_works: '',
    coaching_points: ['x'], progressions: null, source: null, tags: [],
    is_draft: false, deleted_at: null, created_at: '', updated_at: '',
    ...over,
  }
}

function sd(over: Partial<SessionDrillWithDrill> = {}): SessionDrillWithDrill {
  return {
    id: 'sd1', session_id: 's1', drill_id: 'd1', position: 0,
    duration_override: null, rating: null, note: null, drill: drill(),
    ...over,
  }
}

describe('effectiveDuration', () => {
  it("uses the drill's own duration when there is no override", () => {
    expect(effectiveDuration(sd())).toBe(12)
  })

  it('prefers the override when one is set', () => {
    expect(effectiveDuration(sd({ duration_override: 20 }))).toBe(20)
  })

  it('never mutates the drill it read from', () => {
    const item = sd({ duration_override: 20 })
    effectiveDuration(item)
    expect(item.drill.duration_mins).toBe(12)
  })

  it('is 0 when a draft drill has no duration and no override', () => {
    expect(effectiveDuration(sd({ drill: drill({ duration_mins: null }) }))).toBe(0)
  })

  it('uses the override even when the drill has no duration of its own', () => {
    const item = sd({ duration_override: 9, drill: drill({ duration_mins: null }) })
    expect(effectiveDuration(item)).toBe(9)
  })
})

describe('plannedMinutes', () => {
  it('sums effective durations', () => {
    expect(plannedMinutes([sd(), sd({ id: 'sd2', duration_override: 8 })])).toBe(20)
  })

  it('is 0 for an empty session', () => {
    expect(plannedMinutes([])).toBe(0)
  })
})

describe('timingSummary', () => {
  it('reports remaining time against the target', () => {
    expect(timingSummary([sd()], 45)).toEqual({
      planned: 12, target: 45, remaining: 33, isOver: false,
    })
  })

  it('flags going over and reports the overshoot as a negative remainder', () => {
    const items = [sd({ duration_override: 30 }), sd({ id: 'b', duration_override: 25 })]
    expect(timingSummary(items, 45)).toEqual({
      planned: 55, target: 45, remaining: -10, isOver: true,
    })
  })

  it('does not flag exactly hitting the target', () => {
    expect(timingSummary([sd({ duration_override: 45 })], 45).isOver).toBe(false)
  })
})
