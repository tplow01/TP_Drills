export type ScheduleView = 'day' | 'week' | 'month'

export interface ScheduleHrefParams {
  view: ScheduleView
  /** Day view's date — omit to mean "today" (the default, so a bare Day link stays clean). */
  date?: string
  /** Week view's Monday — omit to mean "this week". */
  weekStart?: string
  /** Month view's year-month — omit to mean "this month". */
  yearMonth?: string
  teamId?: string | null
}

/**
 * Builds a /sessions URL — one function so every link (view toggle,
 * day/week nav, month-day tap, sidebar team filter) agrees on which params
 * belong to which view, instead of several near-identical hand-rolled
 * builders drifting apart (spec 2026-08-15: an earlier version of this file
 * had exactly that drift, where the month-day jump link silently dropped
 * `month`).
 */
export function sessionsHref({ view, date, weekStart, yearMonth, teamId }: ScheduleHrefParams): string {
  const params = new URLSearchParams()
  if (view !== 'day') params.set('view', view)
  if (view === 'day' && date) params.set('date', date)
  if (view === 'week' && weekStart) params.set('week', weekStart)
  if (view === 'month' && yearMonth) params.set('month', yearMonth)
  if (teamId) params.set('team', teamId)
  const query = params.toString()
  return query ? `/sessions?${query}` : '/sessions'
}
