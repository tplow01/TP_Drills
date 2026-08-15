import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatLongDate, isoPlusDays } from '@/lib/dates'
import { sessionsHref } from '@/lib/schedule-href'
import { SessionRow } from './SessionRow'
import { DateSection } from './DateSection'

/**
 * One day at a time — the Schedule's default view (spec 2026-08-15): step
 * to any day ahead or behind, with the date itself as the nav header so the
 * body doesn't need to repeat it.
 */
export function DayView({
  date,
  today,
  sessions,
  unscheduled,
  selectedTeamId,
  drillCounts,
  plannedMinutes,
  teamColors,
  nextDate,
}: {
  date: string
  today: string
  sessions: Session[]
  unscheduled: Session[]
  selectedTeamId: string | null
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
  teamColors: Map<string, string>
  nextDate: string | null
}) {
  const isToday = date === today

  return (
    <div style={{ padding: '0 18px 32px' }}>
      <div className="calendar-nav">
        <Link
          href={sessionsHref({ view: 'day', date: isoPlusDays(date, -1), teamId: selectedTeamId })}
          className="calendar-nav-btn"
          aria-label="Previous day"
        >
          ‹
        </Link>
        <div className="hl calendar-month-label" style={{ minWidth: 220 }}>
          {isToday ? `Today · ${formatLongDate(date)}` : formatLongDate(date)}
        </div>
        <Link
          href={sessionsHref({ view: 'day', date: isoPlusDays(date, 1), teamId: selectedTeamId })}
          className="calendar-nav-btn"
          aria-label="Next day"
        >
          ›
        </Link>
      </div>

      {!isToday && (
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <Link
            href={sessionsHref({ view: 'day', teamId: selectedTeamId })}
            className="bd"
            style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}
          >
            Jump to today
          </Link>
        </div>
      )}

      {sessions.length === 0 ? (
        <div style={{ padding: '12px 4px' }}>
          <div className="bd" style={{ fontSize: 13, color: 'var(--ink-45)' }}>
            Nothing planned this day.
          </div>
          {nextDate && (
            <Link
              href={sessionsHref({ view: 'day', date: nextDate, teamId: selectedTeamId })}
              className="bd"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'inline-block', marginTop: 8 }}
            >
              Skip to next session →
            </Link>
          )}
        </div>
      ) : (
        sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            drillCount={drillCounts[session.id] ?? 0}
            plannedMinutes={plannedMinutes[session.id]}
            href={`/sessions/${session.id}`}
            color={session.team_id ? teamColors.get(session.team_id) : undefined}
          />
        ))
      )}

      <DateSection label="Unscheduled" sessions={unscheduled} drillCounts={drillCounts} plannedMinutes={plannedMinutes} teamColors={teamColors} />
    </div>
  )
}
