import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTeam } from '@/lib/teams-server'
import { listSessions, drillCountsBySession, plannedMinutesBySession } from '@/lib/sessions-server'
import { scheduleSessions } from '@/lib/session-groups'
import { SessionsTimeline } from '@/components/sessions/SessionsTimeline'
import { today as todayISO } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const team = await getTeam(id)
  if (!team) notFound()

  const [allSessions, drillCounts, plannedMinutes] = await Promise.all([
    listSessions(),
    drillCountsBySession(),
    plannedMinutesBySession(),
  ])
  const sessions = allSessions.filter((s) => s.team_id === team.id)
  const schedule = scheduleSessions(sessions, todayISO())

  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      <h1 style={{ fontSize: 20, marginTop: 10 }}>{team.name}</h1>
      <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
        {team.library === 'outfield' ? 'Outfield' : 'Goalkeeping'}
        {team.age_band ? ` · ${team.age_band}` : ''}
      </div>
      <div style={{ marginTop: 16 }}>
        <a href={`/sessions/new?team=${team.id}`} className="header-cta">+ Session</a>
      </div>
      <SessionsTimeline schedule={schedule} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </main>
  )
}
