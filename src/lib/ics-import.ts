// src/lib/ics-import.ts
import type { VEvent } from 'node-ical'
import type { SessionInput, Team } from './types'

const DEFAULT_TARGET_MINUTES = 60

/** node-ical returns some string fields as either a plain string or a
    `{ val, params }` object when the ICS property has parameters (e.g.
    `LOCATION;LANGUAGE=en:Pitch 3`) — this unwraps either shape to a plain
    string, or null if the field wasn't present at all. */
function unwrapText(value: string | { val: string } | undefined): string | null {
  if (value === undefined) return null
  return typeof value === 'string' ? value : value.val
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/**
 * Turns one parsed ICS VEVENT into the shape `createSession` needs, for a
 * given team (design doc, 2026-08-15 — BYGA calendar import). Pure and
 * synchronous: no network, no Supabase — the caller (the sync Route
 * Handler) is responsible for fetching/parsing the feed and for persisting
 * the result. `event.uid` becomes `external_uid`, the field a repeat sync
 * uses to skip fixtures it has already imported.
 *
 * Timezone note: node-ical resolves each event's start/end to a native
 * `Date`; this reads its local (server) time-of-day components rather than
 * doing explicit timezone conversion, matching the level of timezone
 * handling already present elsewhere in this codebase (plain ISO date
 * strings throughout, no per-user timezone concept).
 */
export function mapIcsEventToSessionInput(event: VEvent, team: Team): SessionInput {
  const start = event.start
  const end = event.end
  const isAllDay = event.datetype === 'date'

  const rawMinutes = end ? Math.round((end.getTime() - start.getTime()) / 60000) : DEFAULT_TARGET_MINUTES
  const targetMinutes = rawMinutes > 0 ? rawMinutes : DEFAULT_TARGET_MINUTES

  return {
    team_id: team.id,
    name: unwrapText(event.summary) ?? team.name,
    library: team.library,
    date: isoDate(start),
    start_time: isAllDay ? null : isoTime(start),
    location: unwrapText(event.location),
    target_minutes: targetMinutes,
    age_band: team.age_band,
    session_notes: null,
    themes: [],
    external_uid: event.uid,
  }
}
