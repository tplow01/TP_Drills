import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatMonthLabel, monthGrid, yearMonthPlusMonths } from '@/lib/dates'
import { sessionsByDate } from '@/lib/session-groups'
import { MonthDayDot } from './MonthDayDot'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthHref(yearMonth: string, teamId: string | null): string {
  const params = new URLSearchParams({ view: 'month', month: yearMonth })
  if (teamId) params.set('team', teamId)
  return `/sessions?${params.toString()}`
}

/** Jumps into the agenda (always default view) at the given date's section. */
function agendaHref(date: string, teamId: string | null): string {
  const params = new URLSearchParams()
  if (teamId) params.set('team', teamId)
  const query = params.toString()
  return `/sessions${query ? `?${query}` : ''}#date-${date}`
}

function newSessionHref(date: string, teamId: string | null): string {
  const params = new URLSearchParams({ date })
  if (teamId) params.set('team', teamId)
  return `/sessions/new?${params.toString()}`
}

/** Month glance-and-jump (spec 2026-08-15): a dot per day with anything scheduled, tap to jump into the agenda at that date. */
export function MonthOverview({
  yearMonth,
  sessions,
  today,
  selectedTeamId,
}: {
  yearMonth: string
  sessions: Session[]
  today: string
  selectedTeamId: string | null
}) {
  const weeks = monthGrid(yearMonth)
  const byDate = sessionsByDate(sessions)

  return (
    <div className="calendar" style={{ padding: '0 18px 32px' }}>
      <div className="calendar-nav">
        <Link href={monthHref(yearMonthPlusMonths(yearMonth, -1), selectedTeamId)} className="calendar-nav-btn" aria-label="Previous month">
          ‹
        </Link>
        <div className="hl calendar-month-label">{formatMonthLabel(yearMonth)}</div>
        <Link href={monthHref(yearMonthPlusMonths(yearMonth, 1), selectedTeamId)} className="calendar-nav-btn" aria-label="Next month">
          ›
        </Link>
      </div>

      <div className="calendar-weekday-row">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="lbl calendar-weekday-label">{label}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {weeks.flat().map(({ date, inMonth }) => (
          <MonthDayDot
            key={date}
            date={date}
            dayNumber={Number(date.slice(8, 10))}
            inMonth={inMonth}
            isToday={date === today}
            hasSessions={byDate.has(date)}
            agendaHref={agendaHref(date, selectedTeamId)}
            newSessionHref={newSessionHref(date, selectedTeamId)}
          />
        ))}
      </div>
    </div>
  )
}
