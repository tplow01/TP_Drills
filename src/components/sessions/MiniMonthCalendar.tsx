import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatMonthLabel, monthGrid, yearMonthPlusMonths } from '@/lib/dates'
import { sessionsByDate } from '@/lib/session-groups'
import { sessionsHref } from '@/lib/schedule-href'
import type { ScheduleView } from '@/lib/schedule-href'

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/**
 * A compact always-visible month navigator in the sidebar (spec 2026-08-15)
 * — the standard calendar-app pattern of a small month grid you can page
 * and tap without leaving whatever the main pane is showing. Paging it only
 * changes `nav`, never `view`, so browsing ahead in the mini-calendar can't
 * accidentally kick you out of Day/Week into the full Month tab. Tapping a
 * date always jumps straight into Day view for that date.
 */
export function MiniMonthCalendar({
  navMonth,
  sessions,
  today,
  activeView,
  date,
  weekStart,
  yearMonth,
  selectedTeamId,
}: {
  navMonth: string
  sessions: Session[]
  today: string
  activeView: ScheduleView
  date: string
  weekStart: string
  yearMonth: string
  selectedTeamId: string | null
}) {
  const weeks = monthGrid(navMonth)
  const byDate = sessionsByDate(sessions)

  const pageHref = (targetMonth: string) =>
    sessionsHref({ view: activeView, date, weekStart, yearMonth, teamId: selectedTeamId, navMonth: targetMonth })

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-nav">
        <Link href={pageHref(yearMonthPlusMonths(navMonth, -1))} className="mini-calendar-nav-btn" aria-label="Previous month">
          ‹
        </Link>
        <span className="lbl">{formatMonthLabel(navMonth)}</span>
        <Link href={pageHref(yearMonthPlusMonths(navMonth, 1))} className="mini-calendar-nav-btn" aria-label="Next month">
          ›
        </Link>
      </div>

      <div className="mini-calendar-grid">
        {WEEKDAY_INITIALS.map((label, i) => (
          <div key={i} className="mini-calendar-weekday">{label}</div>
        ))}
        {weeks.flat().map(({ date: cellDate, inMonth }) => {
          const hasSessions = byDate.has(cellDate)
          return (
            <Link
              key={cellDate}
              href={sessionsHref({ view: 'day', date: cellDate, teamId: selectedTeamId })}
              className="mini-calendar-day"
              data-in-month={inMonth ? 'true' : 'false'}
              data-today={cellDate === today ? 'true' : 'false'}
              data-current={cellDate === date ? 'true' : 'false'}
              aria-label={hasSessions ? `View sessions on ${cellDate}` : `View ${cellDate}`}
            >
              {Number(cellDate.slice(8, 10))}
              {hasSessions && <span className="mini-calendar-dot" aria-hidden="true" />}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
