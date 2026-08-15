import Link from 'next/link'
import { DayView } from '@/components/sessions/DayView'
import { WeekView } from '@/components/sessions/WeekView'
import { MonthOverview } from '@/components/sessions/MonthOverview'
import { ViewToggle } from '@/components/sessions/ViewToggle'
import { ScheduleSidebar } from '@/components/sessions/ScheduleSidebar'
import { ScheduleMobileTeamsTrigger } from '@/components/sessions/ScheduleMobileTeamsTrigger'
import type { ScheduleView } from '@/lib/schedule-href'
import {
  drillCountsBySession, listSessions, listSessionsInWindow, listTeams, plannedMinutesBySession, nextSessionDate,
} from '@/lib/sessions-server'
import {
  monthGrid, startOfWeek, today as todayISO, weekDates, yearMonthOf,
} from '@/lib/dates'
import { teamColorMap } from '@/lib/team-colors'
import type { Session } from '@/lib/types'

export const dynamic = 'force-dynamic'

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function filterByTeam(sessions: Session[], selectedTeamId: string | null): Session[] {
  return selectedTeamId ? sessions.filter((s) => s.team_id === selectedTeamId) : sessions
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; view?: string; date?: string; week?: string; month?: string }>
}) {
  const { team: teamId, view, date: dateParam, week: weekParam, month } = await searchParams
  const selectedTeamId = typeof teamId === 'string' && teamId !== '' ? teamId : null
  const activeView: ScheduleView = view === 'week' ? 'week' : view === 'month' ? 'month' : 'day'
  const today = todayISO()

  const date = isIsoDate(dateParam) ? dateParam : today
  const weekStart = isIsoDate(weekParam) ? startOfWeek(weekParam) : startOfWeek(today)
  const yearMonth = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : yearMonthOf(today)

  const teams = await listTeams()
  const teamColors = teamColorMap(teams)

  const sidebarContent = (
    <ScheduleSidebar
      activeView={activeView}
      date={date}
      weekStart={weekStart}
      yearMonth={yearMonth}
      teams={teams}
      selectedTeamId={selectedTeamId}
    />
  )

  return (
    <main>
      <div className="schedule-layout" style={{ display: 'flex', alignItems: 'stretch' }}>
        <aside
          className="filter-sidebar"
          style={{ width: 190, flex: 'none', borderRight: '1px solid var(--hairline)', padding: '14px 18px 28px' }}
        >
          {sidebarContent}
        </aside>

        <div style={{ flex: 1, minWidth: 0, padding: '14px 18px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ViewToggle
              activeView={activeView}
              date={date}
              weekStart={weekStart}
              yearMonth={yearMonth}
              selectedTeamId={selectedTeamId}
            />
            <Link href="/sessions/new" className="header-cta">+ Session</Link>
          </div>

          <ScheduleMobileTeamsTrigger>{sidebarContent}</ScheduleMobileTeamsTrigger>

          {activeView === 'month' ? (
            <MonthOverviewView yearMonth={yearMonth} today={today} selectedTeamId={selectedTeamId} teamColors={teamColors} />
          ) : activeView === 'week' ? (
            <WeekOverviewView weekStart={weekStart} today={today} selectedTeamId={selectedTeamId} teamColors={teamColors} />
          ) : (
            <DayOverviewView date={date} today={today} selectedTeamId={selectedTeamId} teamColors={teamColors} />
          )}
        </div>
      </div>
    </main>
  )
}

async function MonthOverviewView({
  yearMonth,
  today,
  selectedTeamId,
  teamColors,
}: {
  yearMonth: string
  today: string
  selectedTeamId: string | null
  teamColors: Map<string, string>
}) {
  const weeks = monthGrid(yearMonth)
  const from = weeks[0][0].date
  const to = weeks[weeks.length - 1][6].date

  const allSessions = await listSessionsInWindow(from, to)
  const sessions = filterByTeam(allSessions, selectedTeamId)

  return (
    <MonthOverview
      yearMonth={yearMonth}
      sessions={sessions}
      today={today}
      selectedTeamId={selectedTeamId}
      teamColors={teamColors}
    />
  )
}

async function WeekOverviewView({
  weekStart,
  today,
  selectedTeamId,
  teamColors,
}: {
  weekStart: string
  today: string
  selectedTeamId: string | null
  teamColors: Map<string, string>
}) {
  const dates = weekDates(weekStart)
  const [windowSessions, allSessions, drillCounts, plannedMinutes] = await Promise.all([
    listSessionsInWindow(dates[0], dates[6]),
    listSessions(),
    drillCountsBySession(),
    plannedMinutesBySession(),
  ])
  const sessions = filterByTeam(windowSessions, selectedTeamId)
  const unscheduled = filterByTeam(allSessions.filter((s) => s.date === null), selectedTeamId)

  return (
    <WeekView
      weekStart={weekStart}
      today={today}
      sessions={sessions}
      unscheduled={unscheduled}
      selectedTeamId={selectedTeamId}
      drillCounts={drillCounts}
      plannedMinutes={plannedMinutes}
      teamColors={teamColors}
    />
  )
}

async function DayOverviewView({
  date,
  today,
  selectedTeamId,
  teamColors,
}: {
  date: string
  today: string
  selectedTeamId: string | null
  teamColors: Map<string, string>
}) {
  const [windowSessions, allSessions, drillCounts, plannedMinutes] = await Promise.all([
    listSessionsInWindow(date, date),
    listSessions(),
    drillCountsBySession(),
    plannedMinutesBySession(),
  ])
  const sessions = filterByTeam(windowSessions, selectedTeamId)
  const unscheduled = filterByTeam(allSessions.filter((s) => s.date === null), selectedTeamId)
  const nextDate = sessions.length === 0 ? await nextSessionDate(date, selectedTeamId) : null

  return (
    <DayView
      date={date}
      today={today}
      sessions={sessions}
      unscheduled={unscheduled}
      selectedTeamId={selectedTeamId}
      drillCounts={drillCounts}
      plannedMinutes={plannedMinutes}
      teamColors={teamColors}
      nextDate={nextDate}
    />
  )
}
