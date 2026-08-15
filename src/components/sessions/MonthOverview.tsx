import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatMonthLabel, monthGrid, yearMonthPlusMonths } from '@/lib/dates'
import { sessionsByDate } from '@/lib/session-groups'
import { sessionsHref } from '@/lib/schedule-href'
import { MonthDayDot } from './MonthDayDot'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const NEUTRAL_DOT_COLOR = 'var(--ink-30)'
const MAX_DOTS = 3

function newSessionHref(date: string, teamId: string | null): string {
  const params = new URLSearchParams({ date })
  if (teamId) params.set('team', teamId)
  return `/sessions/new?${params.toString()}`
}

/** One dot per distinct team represented that day (capped), a session with no team falls back to a neutral dot. */
function dotColorsForDate(sessions: Session[], teamColors: Map<string, string>): string[] {
  const colors = new Set<string>()
  for (const session of sessions) {
    colors.add(session.team_id ? (teamColors.get(session.team_id) ?? NEUTRAL_DOT_COLOR) : NEUTRAL_DOT_COLOR)
  }
  return [...colors].slice(0, MAX_DOTS)
}

/** Month glance-and-jump (spec 2026-08-15): a dot per team with anything scheduled that day, tap to jump into Day view for that date. */
export function MonthOverview({
  yearMonth,
  sessions,
  today,
  selectedTeamId,
  teamColors,
}: {
  yearMonth: string
  sessions: Session[]
  today: string
  selectedTeamId: string | null
  teamColors: Map<string, string>
}) {
  const weeks = monthGrid(yearMonth)
  const byDate = sessionsByDate(sessions)

  return (
    <div className="calendar" style={{ padding: '0 18px 32px' }}>
      <div className="calendar-nav">
        <Link href={sessionsHref({ view: 'month', yearMonth: yearMonthPlusMonths(yearMonth, -1), teamId: selectedTeamId })} className="calendar-nav-btn" aria-label="Previous month">
          ‹
        </Link>
        <div className="hl calendar-month-label">{formatMonthLabel(yearMonth)}</div>
        <Link href={sessionsHref({ view: 'month', yearMonth: yearMonthPlusMonths(yearMonth, 1), teamId: selectedTeamId })} className="calendar-nav-btn" aria-label="Next month">
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
            dotColors={dotColorsForDate(byDate.get(date) ?? [], teamColors)}
            dayHref={sessionsHref({ view: 'day', date, teamId: selectedTeamId })}
            newSessionHref={newSessionHref(date, selectedTeamId)}
          />
        ))}
      </div>
    </div>
  )
}
