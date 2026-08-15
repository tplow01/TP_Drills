import Link from 'next/link'
import { DayView } from '@/components/sessions/DayView'
import { WeekView } from '@/components/sessions/WeekView'
import { MonthOverview } from '@/components/sessions/MonthOverview'
import { ViewToggle } from '@/components/sessions/ViewToggle'
import type { ScheduleView } from '@/lib/schedule-href'
import {
  drillCountsBySession, listSessions, listSessionsInWindow, plannedMinutesBySession,
} from '@/lib/sessions-server'
import {
  monthGrid, startOfWeek, today as todayISO, weekDates, yearMonthOf,
} from '@/lib/dates'
import type { Session } from '@/lib/types'

export const dynamic = 'force-dynamic'

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
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

  return (
    <main>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <ViewToggle
          activeView={activeView}
          date={date}
          weekStart={weekStart}
          yearMonth={yearMonth}
          selectedTeamId={selectedTeamId}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/teams/new" className="header-cta" data-variant="secondary">+ Team</Link>
          <Link href="/sessions/new" className="header-cta">+ Session</Link>
        </div>
      </div>
      {activeView === 'month' ? (
        <MonthOverviewView yearMonth={yearMonth} today={today} selectedTeamId={selectedTeamId} />
      ) : activeView === 'week' ? (
        <WeekOverviewView weekStart={weekStart} today={today} selectedTeamId={selectedTeamId} />
      ) : (
        <DayOverviewView date={date} today={today} selectedTeamId={selectedTeamId} />
      )}
    </main>
  )
}

function filterByTeam(sessions: Session[], selectedTeamId: string | null): Session[] {
  return selectedTeamId ? sessions.filter((s) => s.team_id === selectedTeamId) : sessions
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
  const sessions = filterByTeam(allSessions, selectedTeamId)

  return (
    <MonthOverview
      yearMonth={yearMonth}
      sessions={sessions}
      today={today}
      selectedTeamId={selectedTeamId}
    />
  )
}

async function WeekOverviewView({
  weekStart,
  today,
  selectedTeamId,
}: {
  weekStart: string
  today: string
  selectedTeamId: string | null
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
    />
  )
}

async function DayOverviewView({
  date,
  today,
  selectedTeamId,
}: {
  date: string
  today: string
  selectedTeamId: string | null
}) {
  const [windowSessions, allSessions, drillCounts, plannedMinutes] = await Promise.all([
    listSessionsInWindow(date, date),
    listSessions(),
    drillCountsBySession(),
    plannedMinutesBySession(),
  ])
  const sessions = filterByTeam(windowSessions, selectedTeamId)
  const unscheduled = filterByTeam(allSessions.filter((s) => s.date === null), selectedTeamId)

  return (
    <DayView
      date={date}
      today={today}
      sessions={sessions}
      unscheduled={unscheduled}
      selectedTeamId={selectedTeamId}
      drillCounts={drillCounts}
      plannedMinutes={plannedMinutes}
    />
  )
}
