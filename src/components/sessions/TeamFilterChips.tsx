'use client'

import Link from 'next/link'
import type { Team } from '@/lib/types'

function href(teamId: string | null, activeView: 'agenda' | 'month', yearMonth: string): string {
  const params = new URLSearchParams()
  if (activeView === 'month') {
    params.set('view', 'month')
    params.set('month', yearMonth)
  }
  if (teamId) params.set('team', teamId)
  const query = params.toString()
  return query === '' ? '/sessions' : `/sessions?${query}`
}

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
        href={href(null, activeView, yearMonth)}
        className="team-chip"
        data-selected={selectedTeamId === null ? 'true' : 'false'}
      >
        All teams
      </Link>
      {teams.map((team) => (
        <Link
          key={team.id}
          href={href(team.id, activeView, yearMonth)}
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
