import type { Session } from './types'

/**
 * The Sessions screen's organizing principle: a chronological timeline, not
 * status buckets (spec 2026-08-14: an earlier draft grouped by "Needs a
 * plan / Ready / Reflect" and it was explicitly rejected — reflection isn't
 * a workflow step the coach wants surfaced).
 */
export interface SessionGroups {
  past: Session[]
  today: Session[]
  upcoming: Session[]
  unscheduled: Session[]
}

export function groupSessionsByDate(sessions: Session[], today: string): SessionGroups {
  const dated = sessions.filter((s) => s.date !== null)
  const unscheduled = sessions.filter((s) => s.date === null)

  const past = dated
    .filter((s) => (s.date as string) < today)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))

  const todayGroup = dated.filter((s) => s.date === today)

  const upcoming = dated
    .filter((s) => (s.date as string) > today)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string))

  return { past, today: todayGroup, upcoming, unscheduled }
}
