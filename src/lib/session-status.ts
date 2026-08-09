import type { Session } from './types'

/**
 * Derived, never stored. Spec 7.8: sessions auto-complete when their date
 * passes — there is no "mark complete" button to forget on a cold pitch, and
 * no session silently stuck in "planned" forever.
 */
export type SessionStatus = 'no_date' | 'plan_it' | 'ready' | 'reflect' | 'done'

const LABELS: Record<SessionStatus, string> = {
  no_date: 'No date',
  plan_it: 'Plan it',
  ready: 'Ready',
  reflect: 'Reflect',
  done: 'Done',
}

/**
 * `today` and `session.date` are both 'YYYY-MM-DD', which sorts and compares
 * correctly as a string — no Date parsing, no timezone to get wrong.
 */
export function deriveStatus(
  session: Session,
  drillCount: number,
  today: string,
): SessionStatus {
  // An undated session never auto-completes, however old (spec 11).
  if (session.date === null) return 'no_date'

  // Today is not yet past: a session happening this evening is still Ready.
  if (session.date >= today) {
    return drillCount === 0 ? 'plan_it' : 'ready'
  }

  return session.reflected_at === null ? 'reflect' : 'done'
}

export function statusLabel(status: SessionStatus): string {
  return LABELS[status]
}

/** Whether this status is asking the coach for something. */
export function isActionable(status: SessionStatus): boolean {
  return status === 'plan_it' || status === 'reflect'
}

const GROUP: Record<SessionStatus, number> = {
  plan_it: 0,   // needs a plan — most urgent
  ready: 1,     // planned and coming up
  no_date: 2,   // parked
  reflect: 3,   // behind you
  done: 4,
}

/** Spec 7.4: unplanned first, then planned, then past. */
export function sortSessionsForPlanner(
  sessions: Session[],
  drillCounts: Record<string, number>,
  today: string,
): Session[] {
  return [...sessions].sort((a, b) => {
    const sa = deriveStatus(a, drillCounts[a.id] ?? 0, today)
    const sb = deriveStatus(b, drillCounts[b.id] ?? 0, today)
    if (GROUP[sa] !== GROUP[sb]) return GROUP[sa] - GROUP[sb]

    if (a.date === null && b.date === null) return a.name.localeCompare(b.name)
    if (a.date === null) return 1
    if (b.date === null) return -1

    // Upcoming: soonest first. Behind you: most recent first.
    const behind = GROUP[sa] >= GROUP.reflect
    return behind ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  })
}
