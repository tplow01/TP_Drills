import Link from 'next/link'

/**
 * One month-grid cell: date number, plus a dot per team with a session that
 * day — never names or times (spec 2026-08-15: a cell that never renders
 * session text is what keeps a multi-session day from becoming a layout
 * problem, not a stacking trick). Each dot's color matches the sidebar's
 * team key, capped at 3 so a very busy day still fits one cell. The whole
 * cell is one link, so it's a single full-size tap target on phone.
 */
export function MonthDayDot({
  date,
  dayNumber,
  inMonth,
  isToday,
  dotColors,
  dayHref,
  newSessionHref,
}: {
  date: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
  /** One color per distinct team with a session this day (from `teamColorMap`); a session with no team contributes a neutral dot. Capped to 3 by the caller. */
  dotColors: string[]
  dayHref: string
  newSessionHref: string
}) {
  const hasSessions = dotColors.length > 0
  return (
    <Link
      href={hasSessions ? dayHref : newSessionHref}
      className="month-day-cell"
      data-in-month={inMonth ? 'true' : 'false'}
      data-today={isToday ? 'true' : 'false'}
      aria-label={hasSessions ? `View sessions on ${date}` : `Plan a session on ${date}`}
    >
      <span className="month-day-number">{dayNumber}</span>
      {hasSessions && (
        <span className="month-day-dots" aria-hidden="true">
          {dotColors.map((color, i) => (
            <span key={i} className="month-day-dot" style={{ background: color }} />
          ))}
        </span>
      )}
    </Link>
  )
}
