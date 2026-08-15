export interface ScheduleHrefParams {
  view?: 'agenda' | 'month'
  yearMonth?: string
  teamId?: string | null
  dateAnchor?: string
}

/**
 * Builds a /sessions URL preserving view/month/team state consistently —
 * one function so every link (view toggle, team chips, month-day jump)
 * agrees on when `view`/`month` appear, instead of three near-identical
 * hand-rolled builders drifting apart (e.g. the month-jump link used to
 * silently drop `month`, landing back on the current month instead of
 * whichever month you were viewing).
 */
export function sessionsHref({ view, yearMonth, teamId, dateAnchor }: ScheduleHrefParams): string {
  const params = new URLSearchParams()
  if (view === 'month') params.set('view', 'month')
  // Carry `month` whenever it targets month view, OR when jumping to a
  // specific date's agenda section — so tapping a date from a non-current
  // month and later returning to Month view lands back on that month
  // instead of falling back to the current one.
  if ((view === 'month' || dateAnchor) && yearMonth) params.set('month', yearMonth)
  if (teamId) params.set('team', teamId)
  const query = params.toString()
  const base = query ? `/sessions?${query}` : '/sessions'
  return dateAnchor ? `${base}#date-${dateAnchor}` : base
}
