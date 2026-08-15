import { describe, expect, it } from 'vitest'
import { scheduleSessions, sessionsByDate } from './session-groups'
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
    external_uid: null,
    reflected_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('sessionsByDate', () => {
  it('groups sessions under their exact date, sorted by start_time', () => {
    const a = makeSession({ id: 'a', date: '2026-08-20', start_time: '17:30:00' })
    const b = makeSession({ id: 'b', date: '2026-08-20', start_time: '09:00:00' })
    const c = makeSession({ id: 'c', date: '2026-08-21' })
    const map = sessionsByDate([a, b, c])
    expect(map.get('2026-08-20')!.map((s) => s.id)).toEqual(['b', 'a'])
    expect(map.get('2026-08-21')!.map((s) => s.id)).toEqual(['c'])
  })

  it('sinks a session with no start_time to the end of its date', () => {
    const timed = makeSession({ id: 'timed', date: '2026-08-20', start_time: '09:00:00' })
    const untimed = makeSession({ id: 'untimed', date: '2026-08-20', start_time: null })
    const map = sessionsByDate([untimed, timed])
    expect(map.get('2026-08-20')!.map((s) => s.id)).toEqual(['timed', 'untimed'])
  })

  it('omits dateless sessions entirely', () => {
    const s = makeSession({ id: 's', date: null })
    expect(sessionsByDate([s]).size).toBe(0)
  })
})

describe('scheduleSessions', () => {
  it('splits sessions into past (most recent first), today, upcoming (soonest first), and unscheduled', () => {
    const past1 = makeSession({ id: 'past1', date: '2026-08-10' })
    const past2 = makeSession({ id: 'past2', date: '2026-08-12' })
    const todaySession = makeSession({ id: 'today', date: '2026-08-14' })
    const soon = makeSession({ id: 'soon', date: '2026-08-16' })
    const later = makeSession({ id: 'later', date: '2026-08-20' })
    const unscheduled = makeSession({ id: 'unsched', date: null })

    const schedule = scheduleSessions([past1, past2, todaySession, soon, later, unscheduled], '2026-08-14')

    expect(schedule.pastGroups.map((g) => g.date)).toEqual(['2026-08-12', '2026-08-10'])
    expect(schedule.todayGroup?.date).toBe('2026-08-14')
    expect(schedule.todayGroup?.sessions.map((s) => s.id)).toEqual(['today'])
    expect(schedule.upcomingGroups.map((g) => g.date)).toEqual(['2026-08-16', '2026-08-20'])
    expect(schedule.unscheduled.map((s) => s.id)).toEqual(['unsched'])
  })

  it('groups multiple sessions on the same date into one group, not one group per session', () => {
    const a = makeSession({ id: 'a', date: '2026-08-20', start_time: '16:00:00' })
    const b = makeSession({ id: 'b', date: '2026-08-20', start_time: '17:30:00' })
    const schedule = scheduleSessions([a, b], '2026-08-14')
    expect(schedule.upcomingGroups).toHaveLength(1)
    expect(schedule.upcomingGroups[0].sessions.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('has a null todayGroup when nothing is scheduled today', () => {
    const s = makeSession({ id: 's', date: '2026-08-20' })
    expect(scheduleSessions([s], '2026-08-14').todayGroup).toBeNull()
  })
})
