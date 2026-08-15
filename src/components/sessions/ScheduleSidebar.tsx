import Link from 'next/link'
import type { Session, Team } from '@/lib/types'
import { sessionsHref } from '@/lib/schedule-href'
import type { ScheduleView } from '@/lib/schedule-href'
import { MiniMonthCalendar } from './MiniMonthCalendar'

/** Sidebar for the Schedule screen — mini-calendar navigator plus a team filter, mirroring Drills' filter sidebar (spec 2026-08-15). */
export function ScheduleSidebar({
  navMonth,
  monthSessions,
  today,
  activeView,
  date,
  weekStart,
  yearMonth,
  teams,
  selectedTeamId,
}: {
  navMonth: string
  monthSessions: Session[]
  today: string
  activeView: ScheduleView
  date: string
  weekStart: string
  yearMonth: string
  teams: Team[]
  selectedTeamId: string | null
}) {
  const teamHref = (teamId: string | null) =>
    sessionsHref({ view: activeView, date, weekStart, yearMonth, navMonth, teamId })

  return (
    <div>
      <MiniMonthCalendar
        navMonth={navMonth}
        sessions={monthSessions}
        today={today}
        activeView={activeView}
        date={date}
        weekStart={weekStart}
        yearMonth={yearMonth}
        selectedTeamId={selectedTeamId}
      />

      {teams.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Teams</div>
          <Link href={teamHref(null)} className="sidebar-team-link" data-selected={selectedTeamId === null ? 'true' : 'false'}>
            All teams
          </Link>
          {teams.map((team) => (
            <Link
              key={team.id}
              href={teamHref(team.id)}
              className="sidebar-team-link"
              data-selected={selectedTeamId === team.id ? 'true' : 'false'}
            >
              {team.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
