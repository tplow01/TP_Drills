# Schedule Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the month-grid-first Sessions screen with an agenda-first Schedule (per-date headers, collapsible Past, unbounded scroll) plus a lightweight dot-only month view as a secondary glance-and-jump toggle.

**Architecture:** Pure grouping logic lives in `src/lib/session-groups.ts` (`sessionsByDate`, `scheduleSessions`), consumed by a rebuilt `SessionsTimeline` (agenda) and a new `MonthOverview`/`MonthDayDot` (dot grid). `src/app/sessions/page.tsx` fetches data server-side and switches between the two based on `?view=`, defaulting to agenda. No Supabase/SQL changes — `listSessions`, `listSessionsInWindow`, `listTeams`, `drillCountsBySession`, `plannedMinutesBySession` are reused as-is.

**Tech Stack:** Next.js 16 App Router (Server Components + one client component for Past-collapse state), TypeScript, Vitest, Supabase (unchanged), existing hand-rolled CSS-variable theme in `globals.css` (no new visual language).

## Global Constraints

- Reuse the existing dark theme / CSS-variable tokens (`--card`, `--hairline`, `--accent`, `--radius-sm`, etc.) — no new colors or typography.
- Desktop and mobile are equally first-class; verify every new/changed screen at both a 375px and a full desktop width.
- The month grid must never render session names, times, or status text inside a day cell — a dot only.
- Drills section (`src/components/drills/`, `src/app/drills/`) and the session builder/drill-picker drawer (`SessionBuilder.tsx`, `InlineDrillPicker.tsx`) are out of scope — do not modify.
- Run `npx tsc --noEmit`, `npx vitest run`, and `npm run lint` after every task; all three must be clean before moving on.

---

### Task 1: Add per-date session grouping (`sessionsByDate`, `scheduleSessions`)

**Files:**
- Modify: `src/lib/session-groups.ts` (additive — existing `groupSessionsByDate`/`SessionGroups` stay untouched in this task, removed in Task 2 once their only caller migrates)
- Test: `src/lib/session-groups.test.ts` (additive)

**Interfaces:**
- Produces: `sessionsByDate(sessions: Session[]): Map<string, Session[]>` — dated sessions only, grouped by exact `'YYYY-MM-DD'` date, each list sorted by `start_time` ascending (null `start_time` sinks last within its date).
- Produces: `interface DateGroup { date: string; sessions: Session[] }`
- Produces: `interface SessionSchedule { pastGroups: DateGroup[]; todayGroup: DateGroup | null; upcomingGroups: DateGroup[]; unscheduled: Session[] }`
- Produces: `scheduleSessions(sessions: Session[], today: string): SessionSchedule` — `pastGroups` most-recent-first, `upcomingGroups` soonest-first, both built from `sessionsByDate`.

- [ ] **Step 1: Write the failing tests**

Open `src/lib/session-groups.test.ts` and add these `describe` blocks after the existing `describe('groupSessionsByDate', ...)` block (keep that block and its import untouched):

```ts
import { describe, expect, it } from 'vitest'
import { groupSessionsByDate, scheduleSessions, sessionsByDate } from './session-groups'
import type { Session } from './types'
```

(Update the top import line to the one above — it's the same `groupSessionsByDate` import plus the two new names.)

```ts
describe('sessionsByDate', () => {
  it('groups sessions under their exact date, sorted by start_time', () => {
    const a = makeSession({ id: 'a', date: '2026-08-20', start_time: '17:30:00' })
    const b = makeSession({ id: 'b', date: '2026-08-20', start_time: '09:00:00' })
    const c = makeSession({ id: 'c', date: '2026-08-21' })
    const map = sessionsByDate([a, b, c])
    expect(map.get('2026-08-20')!.map((s) => s.id)).toEqual(['b', 'a'])
    expect(map.get('2026-08-21')!.map((s) => s.id)).toEqual(['c'])
  })

  it('sinks a session with no start_time to the end of its date', () => {
    const timed = makeSession({ id: 'timed', date: '2026-08-20', start_time: '09:00:00' })
    const untimed = makeSession({ id: 'untimed', date: '2026-08-20', start_time: null })
    const map = sessionsByDate([untimed, timed])
    expect(map.get('2026-08-20')!.map((s) => s.id)).toEqual(['timed', 'untimed'])
  })

  it('omits dateless sessions entirely', () => {
    const s = makeSession({ id: 's', date: null })
    expect(sessionsByDate([s]).size).toBe(0)
  })
})

describe('scheduleSessions', () => {
  it('splits sessions into past (most recent first), today, upcoming (soonest first), and unscheduled', () => {
    const past1 = makeSession({ id: 'past1', date: '2026-08-10' })
    const past2 = makeSession({ id: 'past2', date: '2026-08-12' })
    const todaySession = makeSession({ id: 'today', date: '2026-08-14' })
    const soon = makeSession({ id: 'soon', date: '2026-08-16' })
    const later = makeSession({ id: 'later', date: '2026-08-20' })
    const unscheduled = makeSession({ id: 'unsched', date: null })

    const schedule = scheduleSessions([past1, past2, todaySession, soon, later, unscheduled], '2026-08-14')

    expect(schedule.pastGroups.map((g) => g.date)).toEqual(['2026-08-12', '2026-08-10'])
    expect(schedule.todayGroup?.date).toBe('2026-08-14')
    expect(schedule.todayGroup?.sessions.map((s) => s.id)).toEqual(['today'])
    expect(schedule.upcomingGroups.map((g) => g.date)).toEqual(['2026-08-16', '2026-08-20'])
    expect(schedule.unscheduled.map((s) => s.id)).toEqual(['unsched'])
  })

  it('groups multiple sessions on the same date into one group, not one group per session', () => {
    const a = makeSession({ id: 'a', date: '2026-08-20', start_time: '16:00:00' })
    const b = makeSession({ id: 'b', date: '2026-08-20', start_time: '17:30:00' })
    const schedule = scheduleSessions([a, b], '2026-08-14')
    expect(schedule.upcomingGroups).toHaveLength(1)
    expect(schedule.upcomingGroups[0].sessions.map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('has a null todayGroup when nothing is scheduled today', () => {
    const s = makeSession({ id: 's', date: '2026-08-20' })
    expect(scheduleSessions([s], '2026-08-14').todayGroup).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/session-groups.test.ts`
Expected: FAIL — `sessionsByDate`/`scheduleSessions` are not exported yet.

- [ ] **Step 3: Implement `sessionsByDate` and `scheduleSessions`**

Append to the end of `src/lib/session-groups.ts` (existing `SessionGroups`/`groupSessionsByDate` stay above, unchanged):

```ts
/**
 * Every dated session, grouped by exact calendar date and sorted by start
 * time within each date — the level of detail the coarse Past/Today/
 * Upcoming buckets above don't give you. Dateless sessions are simply
 * absent from the map.
 */
export function sessionsByDate(sessions: Session[]): Map<string, Session[]> {
  const map = new Map<string, Session[]>()
  for (const session of sessions) {
    if (session.date === null) continue
    const list = map.get(session.date) ?? []
    list.push(session)
    map.set(session.date, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => (a.start_time ?? '99:99:99').localeCompare(b.start_time ?? '99:99:99'))
  }
  return map
}

export interface DateGroup {
  date: string
  sessions: Session[]
}

export interface SessionSchedule {
  /** Most recent first — the natural reading order once "Past" is expanded. */
  pastGroups: DateGroup[]
  todayGroup: DateGroup | null
  /** Soonest first. */
  upcomingGroups: DateGroup[]
  unscheduled: Session[]
}

/**
 * The Schedule's organizing principle: a chronological timeline, not status
 * buckets (spec 2026-08-14: an earlier draft grouped by "Needs a plan /
 * Ready / Reflect" and it was explicitly rejected — reflection isn't a
 * workflow step the coach wants surfaced). Spec 2026-08-15 refines this
 * further: one section per calendar date, not the coarse Past/Today/
 * Upcoming buckets `groupSessionsByDate` used — a date header per day is
 * what lets any number of sessions land on one day without a layout
 * problem.
 */
export function scheduleSessions(sessions: Session[], today: string): SessionSchedule {
  const byDate = sessionsByDate(sessions)
  const unscheduled = sessions.filter((s) => s.date === null)
  const dates = [...byDate.keys()].sort()

  const pastGroups: DateGroup[] = dates
    .filter((d) => d < today)
    .map((date) => ({ date, sessions: byDate.get(date)! }))
    .reverse()

  const todayDate = dates.find((d) => d === today) ?? null
  const todayGroup: DateGroup | null = todayDate ? { date: todayDate, sessions: byDate.get(todayDate)! } : null

  const upcomingGroups: DateGroup[] = dates
    .filter((d) => d > today)
    .map((date) => ({ date, sessions: byDate.get(date)! }))

  return { pastGroups, todayGroup, upcomingGroups, unscheduled }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/session-groups.test.ts`
Expected: PASS, all tests including the pre-existing `groupSessionsByDate` ones.

- [ ] **Step 5: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (pre-existing warnings in `DrillCard.tsx`/`DrillForm.tsx` are fine, unrelated).

- [ ] **Step 6: Commit**

```bash
git add src/lib/session-groups.ts src/lib/session-groups.test.ts
git commit -m "feat: add per-date session grouping (sessionsByDate, scheduleSessions)"
```

---

### Task 2: Rebuild the agenda as per-date sections with a collapsible Past

**Files:**
- Modify: `src/components/sessions/SessionsTimeline.tsx` (full rewrite)
- Modify: `src/app/sessions/page.tsx:93-112` (the `AgendaView` function — swap `groupSessionsByDate` for `scheduleSessions`)
- Modify: `src/lib/session-groups.ts` (remove now-unused `groupSessionsByDate`/`SessionGroups`)
- Modify: `src/lib/session-groups.test.ts` (remove the now-unused `describe('groupSessionsByDate', ...)` block and its import)

**Interfaces:**
- Consumes: `scheduleSessions` and `SessionSchedule` from Task 1 (`src/lib/session-groups.ts`).
- Consumes: `SessionRow` unchanged — `{ session: Session; drillCount: number; plannedMinutes?: number; href: string; dimmed?: boolean }` (`src/components/sessions/SessionRow.tsx`, not modified).
- Consumes: `formatDayMarker(iso: string): string` from `src/lib/dates.ts` (already exists, e.g. `'2026-08-20'` → `'Thu 20'`).
- Produces: `SessionsTimeline({ schedule, drillCounts, plannedMinutes })` — the new prop shape every future caller must use (was `{ groups, drillCounts, plannedMinutes }`).

- [ ] **Step 1: Replace `SessionsTimeline.tsx`**

Replace the full contents of `src/components/sessions/SessionsTimeline.tsx` with:

```tsx
'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@/lib/types'
import type { SessionSchedule } from '@/lib/session-groups'
import { formatDayMarker } from '@/lib/dates'
import { SessionRow } from './SessionRow'

function DateSection({
  id,
  label,
  sessions,
  dimmed = false,
  drillCounts,
  plannedMinutes,
}: {
  id?: string
  label: string
  sessions: Session[]
  dimmed?: boolean
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  if (sessions.length === 0) return null
  return (
    <section id={id} style={{ marginBottom: 8, scrollMarginTop: 16 }}>
      <div className="lbl" style={{ margin: '16px 4px 2px' }}>{label}</div>
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          drillCount={drillCounts[session.id] ?? 0}
          plannedMinutes={plannedMinutes[session.id]}
          href={`/sessions/${session.id}`}
          dimmed={dimmed}
        />
      ))}
    </section>
  )
}

/**
 * The Schedule's default view: today first, then one section per upcoming
 * calendar date (any number of sessions per date, no layout constraint from
 * the grouping), Past collapsed, Unscheduled last. Replaces the old coarse
 * Past/Today/Upcoming/Unscheduled bucket view (spec 2026-08-15).
 */
export function SessionsTimeline({
  schedule,
  drillCounts,
  plannedMinutes,
}: {
  schedule: SessionSchedule
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  const [pastOpen, setPastOpen] = useState(false)
  const [scrollTarget, setScrollTarget] = useState<string | null>(null)

  // A month-view tap on a past date lands here as `#date-<that date>` —
  // Past is collapsed by default, so the target section isn't in the DOM
  // yet. Expand it and record the target; the effect below scrolls once
  // it's actually rendered.
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#date-')) return
    const targetDate = hash.slice('#date-'.length)
    if (schedule.pastGroups.some((g) => g.date === targetDate)) setPastOpen(true)
    setScrollTarget(hash.slice(1))
    // Mount-only: this reads the URL once when the agenda first appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!scrollTarget) return
    document.getElementById(scrollTarget)?.scrollIntoView({ block: 'start' })
  }, [scrollTarget, pastOpen])

  return (
    <div style={{ padding: '4px 18px 32px' }}>
      {schedule.pastGroups.length > 0 && (
        <section style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setPastOpen((open) => !open)}
            className="lbl"
            style={{
              background: 'none', border: 'none', padding: '16px 4px 2px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {pastOpen ? '▾' : '▸'} Past
          </button>
          {pastOpen && schedule.pastGroups.map((group) => (
            <DateSection
              key={group.date}
              id={`date-${group.date}`}
              label={formatDayMarker(group.date)}
              sessions={group.sessions}
              dimmed
              drillCounts={drillCounts}
              plannedMinutes={plannedMinutes}
            />
          ))}
        </section>
      )}

      {schedule.todayGroup && (
        <DateSection
          id={`date-${schedule.todayGroup.date}`}
          label="Today"
          sessions={schedule.todayGroup.sessions}
          drillCounts={drillCounts}
          plannedMinutes={plannedMinutes}
        />
      )}

      {schedule.upcomingGroups.map((group) => (
        <DateSection
          key={group.date}
          id={`date-${group.date}`}
          label={formatDayMarker(group.date)}
          sessions={group.sessions}
          drillCounts={drillCounts}
          plannedMinutes={plannedMinutes}
        />
      ))}

      <DateSection label="Unscheduled" sessions={schedule.unscheduled} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </div>
  )
}
```

- [ ] **Step 2: Migrate `AgendaView` in `page.tsx` to `scheduleSessions`**

In `src/app/sessions/page.tsx`, change the import line:

```ts
import { scheduleSessions } from '@/lib/session-groups'
```

(replacing `import { groupSessionsByDate } from '@/lib/session-groups'`), and replace the `AgendaView` function body:

```tsx
async function AgendaView({
  selectedTeamId,
  today,
  drillCounts,
  plannedMinutes,
}: {
  selectedTeamId: string | null
  today: string
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  const allSessions = await listSessions()
  const sessions = selectedTeamId
    ? allSessions.filter((s) => s.team_id === selectedTeamId)
    : allSessions

  const schedule = scheduleSessions(sessions, today)

  return <SessionsTimeline schedule={schedule} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
}
```

- [ ] **Step 3: Remove the now-unused `groupSessionsByDate`/`SessionGroups`**

In `src/lib/session-groups.ts`, delete this block entirely (it has no callers left after Step 2):

```ts
export interface SessionGroups {
  past: Session[]
  today: Session[]
  upcoming: Session[]
  unscheduled: Session[]
}

export function groupSessionsByDate(sessions: Session[], today: string): SessionGroups {
  const dated = sessions.filter((s) => s.date !== null)
  const unscheduled = sessions.filter((s) => s.date === null)

  const past = dated
    .filter((s) => (s.date as string) < today)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))

  const todayGroup = dated.filter((s) => s.date === today)

  const upcoming = dated
    .filter((s) => (s.date as string) > today)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string))

  return { past, today: todayGroup, upcoming, unscheduled }
}
```

Also delete the comment directly above it (the one starting `/** The Sessions screen's organizing principle...`) — its content now lives in `scheduleSessions`'s docstring (added in Task 1 Step 3), so it isn't lost. Keep only the file's `import type { Session } from './types'` line before the `sessionsByDate` function.

- [ ] **Step 4: Remove the matching old tests**

In `src/lib/session-groups.test.ts`, delete the entire `describe('groupSessionsByDate', ...)` block (the first `describe` in the file), and change the import line back down to:

```ts
import { scheduleSessions, sessionsByDate } from './session-groups'
```

- [ ] **Step 5: Run tests, typecheck, lint**

Run: `npx vitest run && npx tsc --noEmit && npm run lint`
Expected: all pass, no errors.

- [ ] **Step 6: Verify in the browser**

Start the dev server if it isn't already running (`npm run dev`), then using the `browse` skill:

```
goto http://localhost:3000/sessions?view=agenda
```
Confirm: date headers render (e.g. a "Today" section if anything's today, dated groups below), a "▸ Past" toggle appears if there are past sessions, clicking it expands to "▾ Past" and shows dimmed rows. Check `console --errors` is clean. Check both a 1280px and 375px viewport render without horizontal overflow (`js "document.documentElement.scrollWidth + 'x' + window.innerWidth"` should show equal values).

- [ ] **Step 7: Commit**

```bash
git add src/components/sessions/SessionsTimeline.tsx src/app/sessions/page.tsx src/lib/session-groups.ts src/lib/session-groups.test.ts
git commit -m "feat: rebuild agenda as per-date sections with collapsible Past"
```

---

### Task 3: Replace the chip-grid month view with a dot-only MonthOverview

**Files:**
- Delete: `src/components/sessions/SessionsCalendar.tsx`
- Delete: `src/components/sessions/CalendarDayCell.tsx`
- Create: `src/components/sessions/MonthDayDot.tsx`
- Create: `src/components/sessions/MonthOverview.tsx`
- Modify: `src/app/globals.css:512-597` (replace the chip/day-cell rules with dot-grid rules)
- Modify: `src/app/sessions/page.tsx` (swap the month branch to use `MonthOverview`)

**Interfaces:**
- Consumes: `monthGrid(yearMonth: string): { date: string; inMonth: boolean }[][]`, `formatMonthLabel`, `yearMonthPlusMonths` from `src/lib/dates.ts` (unchanged, already built).
- Consumes: `sessionsByDate` from Task 1 (`src/lib/session-groups.ts`).
- Produces: `MonthDayDot({ date, dayNumber, inMonth, isToday, hasSessions, agendaHref, newSessionHref })` — one grid cell.
- Produces: `MonthOverview({ yearMonth, sessions, today, selectedTeamId })` — the month grid, replacing `SessionsCalendar`'s old `{ yearMonth, sessions, drillCounts, today, selectedTeamId }` (note: no more `drillCounts` — the dot doesn't need it).

- [ ] **Step 1: Delete the old chip-grid components**

```bash
rm src/components/sessions/SessionsCalendar.tsx src/components/sessions/CalendarDayCell.tsx
```

- [ ] **Step 2: Create `MonthDayDot.tsx`**

```tsx
import Link from 'next/link'

/**
 * One month-grid cell: date number, plus a dot if anything's scheduled that
 * day — never names or times (spec 2026-08-15: a cell that never renders
 * session text is what keeps a multi-session day from becoming a layout
 * problem, not a stacking trick). The whole cell is one link, so it's a
 * single full-size tap target on phone.
 */
export function MonthDayDot({
  date,
  dayNumber,
  inMonth,
  isToday,
  hasSessions,
  agendaHref,
  newSessionHref,
}: {
  date: string
  dayNumber: number
  inMonth: boolean
  isToday: boolean
  hasSessions: boolean
  agendaHref: string
  newSessionHref: string
}) {
  return (
    <Link
      href={hasSessions ? agendaHref : newSessionHref}
      className="month-day-cell"
      data-in-month={inMonth ? 'true' : 'false'}
      data-today={isToday ? 'true' : 'false'}
      aria-label={hasSessions ? `View sessions on ${date}` : `Plan a session on ${date}`}
    >
      <span className="month-day-number">{dayNumber}</span>
      {hasSessions && <span className="month-day-dot" aria-hidden="true" />}
    </Link>
  )
}
```

- [ ] **Step 3: Create `MonthOverview.tsx`**

```tsx
import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatMonthLabel, monthGrid, yearMonthPlusMonths } from '@/lib/dates'
import { sessionsByDate } from '@/lib/session-groups'
import { MonthDayDot } from './MonthDayDot'

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthHref(yearMonth: string, teamId: string | null): string {
  const params = new URLSearchParams({ view: 'month', month: yearMonth })
  if (teamId) params.set('team', teamId)
  return `/sessions?${params.toString()}`
}

/** Jumps into the agenda (always default view) at the given date's section. */
function agendaHref(date: string, teamId: string | null): string {
  const params = new URLSearchParams()
  if (teamId) params.set('team', teamId)
  const query = params.toString()
  return `/sessions${query ? `?${query}` : ''}#date-${date}`
}

function newSessionHref(date: string, teamId: string | null): string {
  const params = new URLSearchParams({ date })
  if (teamId) params.set('team', teamId)
  return `/sessions/new?${params.toString()}`
}

/** Month glance-and-jump (spec 2026-08-15): a dot per day with anything scheduled, tap to jump into the agenda at that date. */
export function MonthOverview({
  yearMonth,
  sessions,
  today,
  selectedTeamId,
}: {
  yearMonth: string
  sessions: Session[]
  today: string
  selectedTeamId: string | null
}) {
  const weeks = monthGrid(yearMonth)
  const byDate = sessionsByDate(sessions)

  return (
    <div className="calendar" style={{ padding: '0 18px 32px' }}>
      <div className="calendar-nav">
        <Link href={monthHref(yearMonthPlusMonths(yearMonth, -1), selectedTeamId)} className="calendar-nav-btn" aria-label="Previous month">
          ‹
        </Link>
        <div className="hl calendar-month-label">{formatMonthLabel(yearMonth)}</div>
        <Link href={monthHref(yearMonthPlusMonths(yearMonth, 1), selectedTeamId)} className="calendar-nav-btn" aria-label="Next month">
          ›
        </Link>
      </div>

      <div className="calendar-weekday-row">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="lbl calendar-weekday-label">{label}</div>
        ))}
      </div>

      <div className="calendar-grid">
        {weeks.flat().map(({ date, inMonth }) => (
          <MonthDayDot
            key={date}
            date={date}
            dayNumber={Number(date.slice(8, 10))}
            inMonth={inMonth}
            isToday={date === today}
            hasSessions={byDate.has(date)}
            agendaHref={agendaHref(date, selectedTeamId)}
            newSessionHref={newSessionHref(date, selectedTeamId)}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Replace the chip-grid CSS with dot-grid CSS**

In `src/app/globals.css`, find this block (starts at the `.calendar-day-cell {` rule, ends at the closing `}` of the last `@media (max-width: 480px) { .calendar-skeleton-cell ... }` — everything from the `.calendar-day-cell {` rule through immediately before the `/* Inline drill picker ... */` comment):

```css
.calendar-day-cell {
  min-height: 88px;
  min-width: 0;
  padding: 6px;
  border-radius: var(--radius-sm);
  background: var(--card);
  border: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: hidden;
}
.calendar-day-cell[data-in-month="false"] { opacity: 0.4; }
.calendar-day-cell[data-today="true"] { border-color: var(--accent); }

/* Empty-day cells are themselves the tap target (see CalendarDayCell). */
.calendar-day-cell-empty { cursor: pointer; }
.calendar-day-cell-empty:hover, .calendar-day-cell-empty:focus-visible {
  border-color: var(--accent);
  background: var(--chip-bg);
}

.calendar-day-number { font-size: 12px; font-weight: 700; color: var(--ink-45); }
.calendar-day-cell[data-today="true"] .calendar-day-number { color: var(--accent); }

.calendar-session-chip {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--accent-tint);
  border: 1px solid var(--accent-border);
}
.calendar-session-chip[data-needs-plan="true"] {
  background: none;
  border: 1px dashed var(--hairline);
}
.calendar-session-chip-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.calendar-session-chip-time { font-size: 10px; color: var(--ink-45); }
.calendar-session-chip-flag { font-size: 9px; font-weight: 700; color: var(--accent); }

.calendar-day-add {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 6px;
  color: var(--ink-30);
  font-size: 16px;
}
.calendar-day-add:hover { color: var(--accent); background: var(--chip-bg); }

/* Phone: tighter cells, whole cell is the tap target (hover "+" doesn't
   translate to touch), so make the add affordance fill the cell. */
@media (max-width: 480px) {
  .calendar { padding-left: 6px !important; padding-right: 6px !important; }
  .calendar-weekday-row, .calendar-grid { gap: 2px; }
  .calendar-day-cell { min-height: 64px; padding: 3px; gap: 2px; }
  .calendar-day-number { font-size: 10px; }
  .calendar-session-chip { padding: 3px 4px; }
  .calendar-session-chip-name { font-size: 9px; }
  .calendar-session-chip-time, .calendar-session-chip-flag { display: none; }
  .calendar-day-add { min-height: unset; }
  .calendar-nav { gap: 10px; }
  .calendar-month-label { font-size: 14px; min-width: unset; }
}

.calendar-skeleton-cell {
  min-height: 88px;
  border-radius: var(--radius-sm);
  background: var(--card);
  border: 1px solid var(--hairline);
}
@media (max-width: 480px) {
  .calendar-skeleton-cell { min-height: 64px; }
}
```

Replace that entire block with:

```css
/* Month overview: dot-only day cells (spec 2026-08-15 — a cell never
   renders session text, so a day with any number of sessions looks
   identical to a day with one; that's what removes the stacking problem,
   not a layout trick). */
.month-day-cell {
  min-height: 64px;
  min-width: 0;
  border-radius: var(--radius-sm);
  background: var(--card);
  border: 1px solid var(--hairline);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.month-day-cell[data-in-month="false"] { opacity: 0.4; }
.month-day-cell[data-today="true"] { border-color: var(--accent); }
.month-day-cell:hover, .month-day-cell:focus-visible {
  border-color: var(--accent);
  background: var(--chip-bg);
}

.month-day-number { font-size: 13px; font-weight: 700; color: var(--ink-45); }
.month-day-cell[data-today="true"] .month-day-number { color: var(--accent); }

.month-day-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--accent);
}

@media (max-width: 480px) {
  .calendar { padding-left: 6px !important; padding-right: 6px !important; }
  .calendar-weekday-row, .calendar-grid { gap: 2px; }
  .month-day-cell { min-height: 44px; gap: 4px; }
  .month-day-number { font-size: 11px; }
  .month-day-dot { width: 5px; height: 5px; }
  .calendar-nav { gap: 10px; }
  .calendar-month-label { font-size: 14px; min-width: unset; }
}

.month-day-skeleton {
  min-height: 64px;
  border-radius: var(--radius-sm);
  background: var(--card);
  border: 1px solid var(--hairline);
  opacity: 0.5;
}
@media (max-width: 480px) {
  .month-day-skeleton { min-height: 44px; }
}
```

- [ ] **Step 5: Swap the month branch in `page.tsx` to `MonthOverview`**

In `src/app/sessions/page.tsx`, change the import:

```ts
import { MonthOverview } from '@/components/sessions/MonthOverview'
```

(replacing `import { SessionsCalendar } from '@/components/sessions/SessionsCalendar'`), and replace the `CalendarView` function:

```tsx
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
```

And update the JSX in `SessionsPage` that calls it — change:

```tsx
      {activeView === 'month' ? (
        <CalendarView
          yearMonth={yearMonth}
          today={today}
          selectedTeamId={selectedTeamId}
          drillCounts={drillCounts}
        />
      ) : (
```

to:

```tsx
      {activeView === 'month' ? (
        <MonthOverviewView
          yearMonth={yearMonth}
          today={today}
          selectedTeamId={selectedTeamId}
        />
      ) : (
```

`drillCounts` is still fetched at the top of `SessionsPage` (still needed by `AgendaView`) — only its use in the month branch is removed.

- [ ] **Step 6: Typecheck, test, lint**

Run: `npx tsc --noEmit && npx vitest run && npm run lint`
Expected: no errors. (`monthGrid` tests from the earlier calendar work are untouched and still pass.)

- [ ] **Step 7: Verify in the browser**

Using the `browse` skill:

```
goto http://localhost:3000/sessions?view=month
```
Confirm: day cells show only a date number and, where sessions exist, a small dot — no names or times. Click a populated date's dot → lands on `/sessions?...#date-<date>` and the agenda view is showing with that date's section visible. Click an empty date → lands on `/sessions/new?date=<date>`. Check both 1280px and 375px viewports (`js "document.documentElement.scrollWidth + 'x' + window.innerWidth"` equal values, no overflow), and `console --errors` clean.

- [ ] **Step 8: Commit**

```bash
git add -A src/components/sessions/SessionsCalendar.tsx src/components/sessions/CalendarDayCell.tsx src/components/sessions/MonthDayDot.tsx src/components/sessions/MonthOverview.tsx src/app/globals.css src/app/sessions/page.tsx
git commit -m "feat: replace chip-grid month view with dot-only MonthOverview"
```

---

### Task 4: Flip the default view to Agenda, preserve view state across team switches

**Files:**
- Modify: `src/app/sessions/page.tsx` (default `activeView` logic; thread `activeView`/`yearMonth` to `TeamFilterChips`)
- Modify: `src/components/sessions/ViewToggle.tsx` (reorder tabs: Agenda first)
- Modify: `src/components/sessions/TeamFilterChips.tsx` (preserve `view`/`month` when switching teams)
- Modify: `src/app/sessions/loading.tsx` (agenda-shaped skeleton instead of a month-grid skeleton)
- Modify: `src/app/globals.css` (one small addition: `.schedule-skeleton-row`)

**Interfaces:**
- Produces: `TeamFilterChips({ teams, selectedTeamId, activeView, yearMonth })` — new required props `activeView: 'agenda' | 'month'` and `yearMonth: string` (was `{ teams, selectedTeamId }`).

- [ ] **Step 1: Flip the default view**

In `src/app/sessions/page.tsx`, change:

```ts
  const activeView = view === 'agenda' ? 'agenda' : 'month'
```

to:

```ts
  const activeView = view === 'month' ? 'month' : 'agenda'
```

- [ ] **Step 2: Reorder `ViewToggle`'s tabs**

In `src/components/sessions/ViewToggle.tsx`, change:

```ts
  const options: { key: 'month' | 'agenda'; label: string }[] = [
    { key: 'month', label: 'Month' },
    { key: 'agenda', label: 'Agenda' },
  ]
```

to:

```ts
  const options: { key: 'month' | 'agenda'; label: string }[] = [
    { key: 'agenda', label: 'Agenda' },
    { key: 'month', label: 'Month' },
  ]
```

- [ ] **Step 3: Make `TeamFilterChips` preserve `view`/`month`**

Replace the full contents of `src/components/sessions/TeamFilterChips.tsx`:

```tsx
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
```

- [ ] **Step 4: Pass the new props from `page.tsx`**

In `src/app/sessions/page.tsx`, change:

```tsx
      <TeamFilterChips teams={teams} selectedTeamId={selectedTeamId} />
```

to:

```tsx
      <TeamFilterChips teams={teams} selectedTeamId={selectedTeamId} activeView={activeView} yearMonth={yearMonth} />
```

- [ ] **Step 5: Update the loading skeleton**

Replace the full contents of `src/app/sessions/loading.tsx`:

```tsx
/** Skeleton rows while the agenda loads — avoids a blank flash on the default view. */
export default function SessionsLoading() {
  return (
    <main>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between' }}>
        <div className="view-toggle" style={{ opacity: 0.4 }}>
          <span className="view-toggle-tab" data-active="true">Agenda</span>
          <span className="view-toggle-tab" data-active="false">Month</span>
        </div>
      </div>
      <div style={{ padding: '20px 18px 32px' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="schedule-skeleton-row" />
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Add the skeleton row CSS**

In `src/app/globals.css`, append after the `.month-day-skeleton` block added in Task 3:

```css
.schedule-skeleton-row {
  height: 64px;
  border-radius: var(--radius);
  background: var(--card);
  border: 1px solid var(--hairline);
  margin-bottom: 8px;
  opacity: 0.5;
}
```

- [ ] **Step 7: Typecheck, test, lint**

Run: `npx tsc --noEmit && npx vitest run && npm run lint`
Expected: no errors.

- [ ] **Step 8: Verify in the browser**

Using the `browse` skill:

```
goto http://localhost:3000/sessions
```
Confirm: lands directly on the agenda (no month grid), "Agenda" tab is the active/left tab. Switch to Month, pick a team filter chip → still on Month view with the same team selected (URL keeps `view=month&month=...&team=...`). Switch back to Agenda, pick a different team chip → stays on Agenda (no `view=month` reappearing). Check 375px viewport too.

- [ ] **Step 9: Commit**

```bash
git add src/app/sessions/page.tsx src/components/sessions/ViewToggle.tsx src/components/sessions/TeamFilterChips.tsx src/app/sessions/loading.tsx src/app/globals.css
git commit -m "feat: default Schedule to Agenda view, preserve view state across team switches"
```

---

### Task 5: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full automated suite**

Run: `npx tsc --noEmit && npx vitest run && npm run lint`
Expected: clean typecheck, all tests passing (should be ≥170, the count from before this plan, since Task 1/2 net-add a handful of new tests and remove the four old `groupSessionsByDate` tests), only the two pre-existing lint warnings in `DrillCard.tsx`/`DrillForm.tsx`.

- [ ] **Step 2: Desktop walkthrough (1280×800)**

Using the `browse` skill at a 1280×800 viewport, walk: `/sessions` lands on Agenda → expand Past if present → switch to Month → confirm dots only, no text → click a populated date → confirm it jumps to that date's agenda section → click an empty date → confirm it lands on `/sessions/new?date=...` prefilled → go back to `/sessions`, switch team filter on both Agenda and Month, confirming the view choice survives. Check `console --errors` clean at each step.

- [ ] **Step 3: Mobile walkthrough (375×812)**

Repeat the same walkthrough at 375×812. At each screen, run `js "document.documentElement.scrollWidth + 'x' + window.innerWidth"` and confirm the two numbers match (no horizontal overflow). Screenshot the Agenda default and the Month dot-grid for a visual check (`screenshot /tmp/schedule-mobile-agenda.png`, `screenshot /tmp/schedule-mobile-month.png`) and view them.

- [ ] **Step 4: Confirm Drills and session builder are untouched**

Using the `browse` skill: `goto http://localhost:3000/drills` and confirm it renders exactly as before (filters, quick add). Open an existing session and confirm the drill-picker drawer (`+ Add drill`) still works unchanged — this task should show zero regressions there, since nothing in this plan touches those files.

- [ ] **Step 5: Final commit (if any cleanup needed)**

If verification surfaced any small fixes, commit them individually with a clear message. If everything passed clean, no commit needed for this task.
