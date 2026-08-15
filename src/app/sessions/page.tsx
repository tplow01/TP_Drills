import Link from 'next/link'
import { DayView } from '@/components/sessions/DayView'
import { WeekView } from '@/components/sessions/WeekView'
import { MonthOverview } from '@/components/sessions/MonthOverview'
import { ViewToggle } from '@/components/sessions/ViewToggle'
import { ScheduleSidebar } from '@/components/sessions/ScheduleSidebar'
import type { ScheduleView } from '@/lib/schedule-href'
import {
  drillCountsBySession, listSessions, listSessionsInWindow, listTeams, plannedMinutesBySession,
} from '@/lib/sessions-server'
import {
  monthGrid, startOfWeek, today as todayISO, weekDates, yearMonthOf,
} from '@/lib/dates'
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
  searchParams: Promise<{ team?: string; view?: string; date?: string; week?: string; month?: string; nav?: string }>
}) {
  const { team: teamId, view, date: dateParam, week: weekParam, month, nav } = await searchParams
  const selectedTeamId = typeof teamId === 'string' && teamId !== '' ? teamId : null
  const activeView: ScheduleView = view === 'week' ? 'week' : view === 'month' ? 'month' : 'day'
  const today = todayISO()

  const date = isIsoDate(dateParam) ? dateParam : today
  const weekStart = isIsoDate(weekParam) ? startOfWeek(weekParam) : startOfWeek(today)
  const yearMonth = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : yearMonthOf(today)

  // The sidebar mini-calendar's own displayed month — independent of
  // `view`/`yearMonth` so paging it never switches the main pane out of
  // Day/Week. Defaults off whichever date is actually in view.
  const navMonth = typeof nav === 'string' && /^\d{4}-\d{2}$/.test(nav)
    ? nav
    : activeView === 'week' ? yearMonthOf(weekStart) : activeView === 'month' ? yearMonth : yearMonthOf(date)

  const navWeeks = monthGrid(navMonth)
  const [teams, navMonthSessions] = await Promise.all([
    listTeams(),
    listSessionsInWindow(navWeeks[0][0].date, navWeeks[navWeeks.length - 1][6].date),
  ])
  const sidebarSessions = filterByTeam(navMonthSessions, selectedTeamId)

  return (
    <main>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <aside
          className="filter-sidebar"
          style={{ width: 190, flex: 'none', borderRight: '1px solid var(--hairline)', padding: '14px 18px 28px' }}
        >
          <ScheduleSidebar
            navMonth={navMonth}
            monthSessions={sidebarSessions}
            today={today}
            activeView={activeView}
            date={date}
            weekStart={weekStart}
            yearMonth={yearMonth}
            teams={teams}
            selectedTeamId={selectedTeamId}
          />
        </aside>

        <div style={{ flex: 1, minWidth: 0, padding: '14px 18px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <ViewToggle
              activeView={activeView}
              date={date}
              weekStart={weekStart}
              yearMonth={yearMonth}
              navMonth={navMonth}
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
        </div>
      </div>
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
