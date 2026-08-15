import type { Session } from './types'

/**
 * Every dated session, grouped by exact calendar date and sorted by start
 * time within each date — the level of detail the coarse Past/Today/
 * Upcoming buckets above don't give you. Dateless sessions are simply
 * absent from the map.
 */
export function sessionsByDate(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>()
  for (const session of sessions) {
    if (session.date === null) continue
    const list = map.get(session.date) ?? []
    list.push(session)
    map.set(session.date, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.start_time ?? '99:99:99').localeCompare(b.start_time ?? '99:99:99'))
  }
  return map
}

export interface DateGroup {
  date: string
  sessions: Session[]
}

export interface SessionSchedule {
  /** Most recent first — the natural reading order once "Past" is expanded. */
  pastGroups: DateGroup[]
  todayGroup: DateGroup | null
  /** Soonest first. */
  upcomingGroups: DateGroup[]
  unscheduled: Session[]
}

/**
 * The Schedule's organizing principle: a chronological timeline, not status
 * buckets (spec 2026-08-14: an earlier draft grouped by "Needs a plan /
 * Ready / Reflect" and it was explicitly rejected — reflection isn't a
 * workflow step the coach wants surfaced). Spec 2026-08-15 refines this
 * further: one section per calendar date, not the coarse Past/Today/
 * Upcoming buckets `groupSessionsByDate` used — a date header per day is
 * what lets any number of sessions land on one day without a layout
 * problem.
 */
export function scheduleSessions(sessions: Session[], today: string): SessionSchedule {
  const byDate = sessionsByDate(sessions)
  const unscheduled = sessions.filter((s) => s.date === null)
  const dates = [...byDate.keys()].sort()

  const pastGroups: DateGroup[] = dates
    .filter((d) => d < today)
    .map((date) => ({ date, sessions: byDate.get(date)! }))
    .reverse()

  const todayDate = dates.find((d) => d === today) ?? null
  const todayGroup: DateGroup | null = todayDate ? { date: todayDate, sessions: byDate.get(todayDate)! } : null

  const upcomingGroups: DateGroup[] = dates
    .filter((d) => d > today)
    .map((date) => ({ date, sessions: byDate.get(date)! }))

  return { pastGroups, todayGroup, upcomingGroups, unscheduled }
}
