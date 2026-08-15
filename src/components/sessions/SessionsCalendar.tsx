import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatMonthLabel, monthGrid, yearMonthPlusMonths } from '@/lib/dates'
import { CalendarDayCell } from './CalendarDayCell'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthHref(yearMonth: string, teamId: string | null): string {
  const params = new URLSearchParams({ view: 'month', month: yearMonth })
  if (teamId) params.set('team', teamId)
  return `/sessions?${params.toString()}`
}

function newSessionHref(date: string, teamId: string | null): string {
  const params = new URLSearchParams({ date })
  if (teamId) params.set('team', teamId)
  return `/sessions/new?${params.toString()}`
}

export function SessionsCalendar({
  yearMonth,
  sessions,
  drillCounts,
  today,
  selectedTeamId,
}: {
  yearMonth: string
  sessions: Session[]
  drillCounts: Record<string, number>
  today: string
  selectedTeamId: string | null
}) {
  const weeks = monthGrid(yearMonth)

  const sessionsByDate = new Map<string, Session[]>()
  for (const session of sessions) {
    if (!session.date) continue
    const existing = sessionsByDate.get(session.date) ?? []
    existing.push(session)
    sessionsByDate.set(session.date, existing)
  }

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
          <CalendarDayCell
            key={date}
            date={date}
            dayNumber={Number(date.slice(8, 10))}
            inMonth={inMonth}
            isToday={date === today}
            sessions={sessionsByDate.get(date) ?? []}
            drillCounts={drillCounts}
            newSessionHref={newSessionHref(date, selectedTeamId)}
          />
        ))}
      </div>
    </div>
  )
}
