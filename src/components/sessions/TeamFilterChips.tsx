'use client'

import Link from 'next/link'
import type { Team } from '@/lib/types'

export function TeamFilterChips({
  teams,
  selectedTeamId,
}: {
  teams: Team[]
  selectedTeamId: string | null
}) {
  return (
    <div className="team-chip-row">
      <Link
        href="/sessions"
        className="team-chip"
        data-selected={selectedTeamId === null ? 'true' : 'false'}
      >
        All teams
      </Link>
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/sessions?team=${team.id}`}
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
