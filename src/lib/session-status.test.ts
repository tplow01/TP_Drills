import { describe, expect, it } from 'vitest'
import type { Session } from './types'
import {
  deriveStatus, isActionable, sortSessionsForPlanner, statusLabel,
} from './session-status'

const TODAY = '2026-08-11'

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'a', team_id: null, name: 'Lions U10 · Session 3', library: 'outfield',
    date: '2026-08-12', start_time: '17:30:00', location: 'Hyde Park',
    target_minutes: 45, age_band: 'U9-U11', session_notes: null, external_uid: null,
    reflected_at: null, created_at: '', updated_at: '', themes: [],
    ...over,
  }
}

describe('deriveStatus', () => {
  it('is no_date when the session has no date, whatever else is true', () => {
    expect(deriveStatus(session({ date: null }), 0, TODAY)).toBe('no_date')
    expect(deriveStatus(session({ date: null }), 5, TODAY)).toBe('no_date')
    // An undated session never auto-completes, however old it is.
    expect(deriveStatus(session({ date: null, reflected_at: null }), 5, TODAY)).toBe('no_date')
  })

  it('is plan_it when dated in the future with no drills', () => {
    expect(deriveStatus(session({ date: '2026-08-12' }), 0, TODAY)).toBe('plan_it')
  })

  it('is ready when dated in the future with drills', () => {
    expect(deriveStatus(session({ date: '2026-08-12' }), 3, TODAY)).toBe('ready')
  })

  it('treats today as not yet past', () => {
    // A session happening this evening is still Ready, not Reflect.
    expect(deriveStatus(session({ date: TODAY }), 3, TODAY)).toBe('ready')
    expect(deriveStatus(session({ date: TODAY }), 0, TODAY)).toBe('plan_it')
  })

  it('is reflect once the date has passed and nothing was reflected', () => {
    expect(deriveStatus(session({ date: '2026-08-05' }), 3, TODAY)).toBe('reflect')
  })

  it('is reflect for a past session even if it had no drills', () => {
    // It still happened. Asking about it is more useful than hiding it.
    expect(deriveStatus(session({ date: '2026-08-05' }), 0, TODAY)).toBe('reflect')
  })

  it('is done once reflected', () => {
    const s = session({ date: '2026-08-05', reflected_at: '2026-08-06T09:00:00Z' })
    expect(deriveStatus(s, 3, TODAY)).toBe('done')
  })

  it('ignores reflected_at on a future session', () => {
    // Reflecting early then moving the date later should not read as done.
    const s = session({ date: '2026-08-20', reflected_at: '2026-08-06T09:00:00Z' })
    expect(deriveStatus(s, 3, TODAY)).toBe('ready')
  })
})

describe('statusLabel', () => {
  it('labels every status', () => {
    expect(statusLabel('ready')).toBe('Ready')
    expect(statusLabel('plan_it')).toBe('Plan it')
    expect(statusLabel('reflect')).toBe('Reflect')
    expect(statusLabel('no_date')).toBe('No date')
    expect(statusLabel('done')).toBe('Done')
  })
})

describe('isActionable', () => {
  it('marks the statuses that want something from the coach', () => {
    expect(isActionable('plan_it')).toBe(true)
    expect(isActionable('reflect')).toBe(true)
    expect(isActionable('ready')).toBe(false)
    expect(isActionable('done')).toBe(false)
    expect(isActionable('no_date')).toBe(false)
  })
})

describe('sortSessionsForPlanner', () => {
  // Spec 7.4: unplanned first, then planned, then past.
  const unplanned = session({ id: 'u', date: '2026-08-14' })
  const planned = session({ id: 'p', date: '2026-08-12' })
  const past = session({ id: 'x', date: '2026-08-05' })
  const undated = session({ id: 'n', date: null })
  const counts = { u: 0, p: 3, x: 3, n: 4 }

  it('puts sessions needing a plan first, then ready, then undated, then past', () => {
    const got = sortSessionsForPlanner([past, planned, undated, unplanned], counts, TODAY)
    expect(got.map((s) => s.id)).toEqual(['u', 'p', 'n', 'x'])
  })

  it('orders within a group by date, soonest first', () => {
    const soon = session({ id: 'soon', date: '2026-08-12' })
    const later = session({ id: 'later', date: '2026-08-20' })
    const got = sortSessionsForPlanner([later, soon], { soon: 0, later: 0 }, TODAY)
    expect(got.map((s) => s.id)).toEqual(['soon', 'later'])
  })

  it('orders past sessions most recent first', () => {
    const old = session({ id: 'old', date: '2026-07-01' })
    const recent = session({ id: 'recent', date: '2026-08-05' })
    const got = sortSessionsForPlanner([old, recent], { old: 3, recent: 3 }, TODAY)
    expect(got.map((s) => s.id)).toEqual(['recent', 'old'])
  })

  it('does not mutate its input', () => {
    const input = [past, planned]
    sortSessionsForPlanner(input, counts, TODAY)
    expect(input.map((s) => s.id)).toEqual(['x', 'p'])
  })
})
