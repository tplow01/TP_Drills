import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatTime } from '@/lib/dates'

/**
 * One calendar cell: date number, a chip per session that day (each its own
 * link, so a multi-session day needs no popover), and an add affordance on
 * empty days. The whole cell is the tap target on phone (spec: hover-only
 * "+" icons don't translate to touch).
 */
export function CalendarDayCell({
  date,
  dayNumber,
  inMonth,
  isToday,
  sessions,
  drillCounts,
  newSessionHref,
}: {
  date: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
  sessions: Session[]
  drillCounts: Record<string, number>
  newSessionHref: string
}) {
  // Empty days render as one full-cell link (not a small "+" icon inside a
  // static cell) — hover-only affordances don't translate to touch, and a
  // small nested target is easy to miss on a phone-width grid.
  if (sessions.length === 0) {
    return (
      <Link
        href={newSessionHref}
        className="calendar-day-cell calendar-day-cell-empty"
        data-in-month={inMonth ? 'true' : 'false'}
        data-today={isToday ? 'true' : 'false'}
        aria-label={`Plan a session on ${date}`}
      >
        <div className="calendar-day-number">{dayNumber}</div>
        <div className="calendar-day-add">+</div>
      </Link>
    )
  }

  return (
    <div
      className="calendar-day-cell"
      data-in-month={inMonth ? 'true' : 'false'}
      data-today={isToday ? 'true' : 'false'}
    >
      <div className="calendar-day-number">{dayNumber}</div>

      {sessions.map((session) => {
        const drillCount = drillCounts[session.id] ?? 0
        const needsPlan = drillCount === 0
        return (
          <Link
            key={session.id}
            href={`/sessions/${session.id}`}
            className="calendar-session-chip"
            data-needs-plan={needsPlan ? 'true' : 'false'}
          >
            <span className="calendar-session-chip-name">{session.name}</span>
            {session.start_time && (
              <span className="calendar-session-chip-time">{formatTime(session.start_time)}</span>
            )}
            {needsPlan && <span className="calendar-session-chip-flag">Needs a plan</span>}
          </Link>
        )
      })}
    </div>
  )
}
