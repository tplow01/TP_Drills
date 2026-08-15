import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatDayMarker, formatWeekRangeLabel, isoPlusWeeks, weekDates } from '@/lib/dates'
import { sessionsByDate } from '@/lib/session-groups'
import { sessionsHref } from '@/lib/schedule-href'
import { DateSection } from './DateSection'

/** Seven days at a time, each as its own mini-agenda section (spec 2026-08-15). */
export function WeekView({
  weekStart,
  today,
  sessions,
  unscheduled,
  selectedTeamId,
  drillCounts,
  plannedMinutes,
  teamColors,
}: {
  weekStart: string
  today: string
  sessions: Session[]
  unscheduled: Session[]
  selectedTeamId: string | null
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
  teamColors: Map<string, string>
}) {
  const byDate = sessionsByDate(sessions)

  return (
    <div style={{ padding: '0 18px 32px' }}>
      <div className="calendar-nav">
        <Link
          href={sessionsHref({ view: 'week', weekStart: isoPlusWeeks(weekStart, -1), teamId: selectedTeamId })}
          className="calendar-nav-btn"
          aria-label="Previous week"
        >
          ‹
        </Link>
        <div className="hl calendar-month-label">{formatWeekRangeLabel(weekStart)}</div>
        <Link
          href={sessionsHref({ view: 'week', weekStart: isoPlusWeeks(weekStart, 1), teamId: selectedTeamId })}
          className="calendar-nav-btn"
          aria-label="Next week"
        >
          ›
        </Link>
      </div>

      {weekDates(weekStart).map((date) => (
        <DateSection
          key={date}
          id={`date-${date}`}
          label={date === today ? `Today · ${formatDayMarker(date)}` : formatDayMarker(date)}
          sessions={byDate.get(date) ?? []}
          emptyLabel="Nothing planned."
          drillCounts={drillCounts}
          plannedMinutes={plannedMinutes}
          teamColors={teamColors}
        />
      ))}

      <DateSection label="Unscheduled" sessions={unscheduled} drillCounts={drillCounts} plannedMinutes={plannedMinutes} teamColors={teamColors} />
    </div>
  )
}
