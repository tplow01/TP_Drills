'use client'

import Link from 'next/link'
import type { Team } from '@/lib/types'
import { sessionsHref } from '@/lib/schedule-href'

export function TeamFilterChips({
  teams,
  selectedTeamId,
  activeView,
  yearMonth,
}: {
  teams: Team[]
  selectedTeamId: string | null
  activeView: 'agenda' | 'month'
  yearMonth: string
}) {
  return (
    <div className="team-chip-row">
      <Link
        href={sessionsHref({ view: activeView, yearMonth, teamId: null })}
        className="team-chip"
        data-selected={selectedTeamId === null ? 'true' : 'false'}
      >
        All teams
      </Link>
      {teams.map((team) => (
        <Link
          key={team.id}
          href={sessionsHref({ view: activeView, yearMonth, teamId: team.id })}
          className="team-chip"
          data-selected={selectedTeamId === team.id ? 'true' : 'false'}
        >
          {team.name}
        </Link>
      ))}
      <Link href="/teams/new" className="team-chip team-chip-add">
        + Team
      </Link>
    </div>
  )
}
