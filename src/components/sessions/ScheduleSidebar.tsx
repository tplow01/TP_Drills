import Link from 'next/link'
import type { Team } from '@/lib/types'
import { sessionsHref } from '@/lib/schedule-href'
import type { ScheduleView } from '@/lib/schedule-href'
import { teamColor } from '@/lib/team-colors'

/**
 * The Schedule sidebar: a key to the schedule's team colors, not a
 * calendar — each team's swatch is the same color used on its session rows
 * and month dots, so the list doubles as a legend for what's on screen
 * (spec 2026-08-15). Clicking a team filters the schedule to it.
 */
export function ScheduleSidebar({
  activeView,
  date,
  weekStart,
  yearMonth,
  teams,
  selectedTeamId,
}: {
  activeView: ScheduleView
  date: string
  weekStart: string
  yearMonth: string
  teams: Team[]
  selectedTeamId: string | null
}) {
  const teamHref = (teamId: string | null) =>
    sessionsHref({ view: activeView, date, weekStart, yearMonth, teamId })

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Teams</div>

      {teams.length === 0 ? (
        <div className="bd" style={{ fontSize: 12, color: 'var(--ink-45)', lineHeight: 1.5 }}>
          No teams yet.{' '}
          <Link href="/teams/new" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            + Add one
          </Link>
        </div>
      ) : (
        <>
          <Link href={teamHref(null)} className="sidebar-team-link" data-selected={selectedTeamId === null ? 'true' : 'false'}>
            <span className="team-swatch" style={{ background: 'var(--ink-30)' }} aria-hidden="true" />
            All teams
          </Link>
          {teams.map((team, i) => (
            <Link
              key={team.id}
              href={teamHref(team.id)}
              className="sidebar-team-link"
              data-selected={selectedTeamId === team.id ? 'true' : 'false'}
            >
              <span className="team-swatch" style={{ background: teamColor(i) }} aria-hidden="true" />
              {team.name}
            </Link>
          ))}
        </>
      )}
    </div>
  )
}
