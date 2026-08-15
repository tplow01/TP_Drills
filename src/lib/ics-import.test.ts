// src/lib/ics-import.test.ts
import { describe, expect, it } from 'vitest'
import { mapIcsEventToSessionInput } from './ics-import'
import type { VEvent } from 'node-ical'
import type { Team } from './types'

const team: Team = {
  id: 'team-1',
  name: 'U9s',
  library: 'outfield',
  age_band: 'U9-U11',
  color: '#39d97a',
  byga_url: null,
  calendar_url: 'webcal://example.com/feed.ics',
  calendar_synced_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

function makeEvent(overrides: Partial<VEvent>): VEvent {
  return {
    type: 'VEVENT',
    uid: 'event-1',
    dtstamp: new Date('2026-01-01T00:00:00.000Z'),
    start: new Date('2026-03-14T15:30:00.000Z'),
    datetype: 'date-time',
    summary: 'Training',
    ...overrides,
  } as VEvent
}

describe('mapIcsEventToSessionInput', () => {
  it('maps summary, uid, and team fields', () => {
    const result = mapIcsEventToSessionInput(makeEvent({}), team)
    expect(result.name).toBe('Training')
    expect(result.external_uid).toBe('event-1')
    expect(result.team_id).toBe('team-1')
    expect(result.library).toBe('outfield')
    expect(result.age_band).toBe('U9-U11')
    expect(result.themes).toEqual([])
  })

  it('unwraps a parameterized summary value', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ summary: { val: 'Match Day' } as never }), team)
    expect(result.name).toBe('Match Day')
  })

  it('falls back to the team name when summary is missing', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ summary: undefined as never }), team)
    expect(result.name).toBe('U9s')
  })

  it('computes target_minutes from start/end', () => {
    const result = mapIcsEventToSessionInput(
      makeEvent({ start: new Date('2026-03-14T15:00:00.000Z'), end: new Date('2026-03-14T16:30:00.000Z') }),
      team,
    )
    expect(result.target_minutes).toBe(90)
  })

  it('falls back to 60 minutes when there is no end time', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ end: undefined }), team)
    expect(result.target_minutes).toBe(60)
  })

  it('sets start_time to null for an all-day event', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ datetype: 'date' }), team)
    expect(result.start_time).toBeNull()
  })

  it('unwraps location, or leaves it null when absent', () => {
    const withLocation = mapIcsEventToSessionInput(makeEvent({ location: 'Pitch 3' }), team)
    expect(withLocation.location).toBe('Pitch 3')
    const without = mapIcsEventToSessionInput(makeEvent({}), team)
    expect(without.location).toBeNull()
  })
})
