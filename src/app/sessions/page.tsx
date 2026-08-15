import Link from 'next/link'
import { TeamFilterChips } from '@/components/sessions/TeamFilterChips'
import { SessionsTimeline } from '@/components/sessions/SessionsTimeline'
import {
  drillCountsBySession, listSessions, listTeams, plannedMinutesBySession,
} from '@/lib/sessions-server'
import { groupSessionsByDate } from '@/lib/session-groups'
import { today as todayISO } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team: teamId } = await searchParams
  const selectedTeamId = typeof teamId === 'string' && teamId !== '' ? teamId : null

  const [allSessions, teams, drillCounts, plannedMinutes] = await Promise.all([
    listSessions(),
    listTeams(),
    drillCountsBySession(),
    plannedMinutesBySession(),
  ])

  const sessions = selectedTeamId
    ? allSessions.filter((s) => s.team_id === selectedTeamId)
    : allSessions

  const groups = groupSessionsByDate(sessions, todayISO())

  return (
    <main>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Link href="/teams/new" className="header-cta" data-variant="secondary">+ Team</Link>
        <Link href="/sessions/new" className="header-cta">+ Session</Link>
      </div>
      <TeamFilterChips teams={teams} selectedTeamId={selectedTeamId} />
      <SessionsTimeline groups={groups} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </main>
  )
}
