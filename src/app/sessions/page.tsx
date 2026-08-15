import Link from 'next/link'
import { TeamFilterChips } from '@/components/sessions/TeamFilterChips'
import { SessionsTimeline } from '@/components/sessions/SessionsTimeline'
import { MonthOverview } from '@/components/sessions/MonthOverview'
import { ViewToggle } from '@/components/sessions/ViewToggle'
import {
  drillCountsBySession, listSessions, listSessionsInWindow, listTeams, plannedMinutesBySession,
} from '@/lib/sessions-server'
import { scheduleSessions } from '@/lib/session-groups'
import { monthGrid, today as todayISO, yearMonthOf } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; view?: string; month?: string }>
}) {
  const { team: teamId, view, month } = await searchParams
  const selectedTeamId = typeof teamId === 'string' && teamId !== '' ? teamId : null
  const activeView = view === 'month' ? 'month' : 'agenda'
  const today = todayISO()
  const yearMonth = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : yearMonthOf(today)

  const teams = await listTeams()

  return (
    <main>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <ViewToggle activeView={activeView} yearMonth={yearMonth} selectedTeamId={selectedTeamId} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/teams/new" className="header-cta" data-variant="secondary">+ Team</Link>
          <Link href="/sessions/new" className="header-cta">+ Session</Link>
        </div>
      </div>
      <TeamFilterChips teams={teams} selectedTeamId={selectedTeamId} activeView={activeView} yearMonth={yearMonth} />
      {activeView === 'month' ? (
        <MonthOverviewView
          yearMonth={yearMonth}
          today={today}
          selectedTeamId={selectedTeamId}
        />
      ) : (
        <AgendaView selectedTeamId={selectedTeamId} today={today} />
      )}
    </main>
  )
}

async function MonthOverviewView({
  yearMonth,
  today,
  selectedTeamId,
}: {
  yearMonth: string
  today: string
  selectedTeamId: string | null
}) {
  const weeks = monthGrid(yearMonth)
  const from = weeks[0][0].date
  const to = weeks[weeks.length - 1][6].date

  const allSessions = await listSessionsInWindow(from, to)
  const sessions = selectedTeamId
    ? allSessions.filter((s) => s.team_id === selectedTeamId)
    : allSessions

  return (
    <MonthOverview
      yearMonth={yearMonth}
      sessions={sessions}
      today={today}
      selectedTeamId={selectedTeamId}
    />
  )
}

async function AgendaView({
  selectedTeamId,
  today,
}: {
  selectedTeamId: string | null
  today: string
}) {
  const [allSessions, drillCounts, plannedMinutes] = await Promise.all([
    listSessions(),
    drillCountsBySession(),
    plannedMinutesBySession(),
  ])
  const sessions = selectedTeamId
    ? allSessions.filter((s) => s.team_id === selectedTeamId)
    : allSessions

  const schedule = scheduleSessions(sessions, today)

  return <SessionsTimeline schedule={schedule} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
}
