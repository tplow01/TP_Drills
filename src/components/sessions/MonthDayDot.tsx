import Link from 'next/link'

/**
 * One month-grid cell: date number, plus a dot if anything's scheduled that
 * day — never names or times (spec 2026-08-15: a cell that never renders
 * session text is what keeps a multi-session day from becoming a layout
 * problem, not a stacking trick). The whole cell is one link, so it's a
 * single full-size tap target on phone.
 */
export function MonthDayDot({
  date,
  dayNumber,
  inMonth,
  isToday,
  hasSessions,
  dayHref,
  newSessionHref,
}: {
  date: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
  hasSessions: boolean
  dayHref: string
  newSessionHref: string
}) {
  return (
    <Link
      href={hasSessions ? dayHref : newSessionHref}
      className="month-day-cell"
      data-in-month={inMonth ? 'true' : 'false'}
      data-today={isToday ? 'true' : 'false'}
      aria-label={hasSessions ? `View sessions on ${date}` : `Plan a session on ${date}`}
    >
      <span className="month-day-number">{dayNumber}</span>
      {hasSessions && <span className="month-day-dot" aria-hidden="true" />}
    </Link>
  )
}
