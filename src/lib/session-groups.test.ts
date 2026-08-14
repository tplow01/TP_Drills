import { describe, expect, it } from 'vitest'
import { groupSessionsByDate } from './session-groups'
import type { Session } from './types'

function makeSession(overrides: Partial<Session>): Session {
  return {
    id: overrides.id ?? 'id',
    team_id: null,
    name: 'Session',
    library: 'outfield',
    date: null,
    start_time: null,
    location: null,
    target_minutes: 60,
    age_band: null,
    session_notes: null,
    themes: [],
    reflected_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('groupSessionsByDate', () => {
  it('sorts a past session into past, most recent first', () => {
    const a = makeSession({ id: 'a', date: '2026-08-10' })
    const b = makeSession({ id: 'b', date: '2026-08-11' })
    const result = groupSessionsByDate([a, b], '2026-08-14')
    expect(result.past.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('puts a session dated today into the today group', () => {
    const s = makeSession({ id: 's', date: '2026-08-14' })
    const result = groupSessionsByDate([s], '2026-08-14')
    expect(result.today.map((x) => x.id)).toEqual(['s'])
    expect(result.past).toHaveLength(0)
    expect(result.upcoming).toHaveLength(0)
  })

  it('sorts upcoming sessions soonest first', () => {
    const a = makeSession({ id: 'a', date: '2026-08-20' })
    const b = makeSession({ id: 'b', date: '2026-08-16' })
    const result = groupSessionsByDate([a, b], '2026-08-14')
    expect(result.upcoming.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('puts a dateless session into unscheduled', () => {
    const s = makeSession({ id: 's', date: null })
    const result = groupSessionsByDate([s], '2026-08-14')
    expect(result.unscheduled.map((x) => x.id)).toEqual(['s'])
  })
})
