# Navigation & Visual Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TP Drills' back-button-only hub-and-spoke navigation with a persistent two-tab (Sessions/Drills) nav shell, apply the new chalkboard/lime visual system, merge Schedule + Planner into one chronological Sessions screen, simplify the drill card, and add Team screens on top of the existing (unused) `team` table.

**Architecture:** No new frameworks. Continue the existing pattern of Server Components for data reads (`*-server.ts` files using `createServerClient`) and `'use client'` components for mutations (calling functions in `src/lib/*.ts` that use the browser Supabase client). New pure/derivable logic (date grouping) gets its own `src/lib/*.ts` module with a colocated Vitest `*.test.ts`, matching every existing lib file in this codebase. Two new Supabase migrations add the columns the design requires (`session.themes`, `team.calendar_url` + `team.calendar_synced_at`); no new tables, since `team`/`session`/`session_drill` already exist.

**Tech Stack:** Next.js 16 (App Router), React 19, Supabase (`@supabase/ssr`), Vitest, plain CSS via `globals.css` custom properties + inline styles (existing project convention — no CSS framework).

## Global Constraints

- Visual tokens, component rules, and exact hex values are defined in `docs/superpowers/specs/2026-08-14-style-guide.md` — use those values verbatim, do not invent new ones.
- Behavior and scope boundaries are defined in `docs/superpowers/specs/2026-08-14-navigation-visual-revamp-design.md` — in particular: drill-creation/editing UX is untouched, no player roster, no real auth/multi-tenant scoping, no icons.
- Follow existing project conventions: Server Components for reads (`*-server.ts`), client components + `src/lib/*.ts` browser functions for writes, inline `style={{}}` objects for component styling (not CSS modules), Vitest `*.test.ts` colocated with any new pure-logic file.
- Every new Supabase migration must end with RLS enabled and a `"public all ..."` open policy, matching the codebase's documented no-auth posture (see `supabase/migrations/0004_sessions.sql`) — do not add `auth.uid()` checks, there is no auth to check against yet.
- Run `npm run test` and `npm run build` before every commit that touches `src/lib` or changes a route's props; both must pass.

---

## Task 1: Chalkboard/lime design tokens

Replaces the current near-black/orange-then-green token values in `globals.css` with the chalkboard/lime values from the style guide, and fixes the two places that hard-coded the *old* `--ink` (previously a light cream color) as a mat background — under the new theme `--ink` is a near-white *text* color, so those two spots need a dedicated `--mat` token instead or they'll render a bright white box where a dark mat belongs.

**Files:**
- Modify: `src/app/globals.css:1-36` (token block), `src/app/globals.css:187-200` (`.session-view-mat`)
- Modify: `src/components/drills/DrillCard.tsx:69-100` (mat background)

**Interfaces:**
- Produces: `--mat` (new CSS custom property), all existing token names (`--ground`, `--card`, `--ink`, `--accent`, `--ink-70/45/30`, `--hairline`, `--accent-border`, `--accent-tint`, `--field-bg`, `--chip-bg`, `--track-bg`, `--control-border`, `--button-border`, `--checkbox-border`, `--on-mat-muted`) keep their names, get new values.

- [ ] **Step 1: Replace the `:root` token block**

Replace `src/app/globals.css:1-36` with:

```css
:root {
  --ground: #161e28;
  --card: #26313f;
  --ink: #f2f4f6;
  --accent: #39d97a;

  --ink-70: rgba(242, 244, 246, 0.75);
  --ink-45: rgba(242, 244, 246, 0.55);
  --ink-30: rgba(242, 244, 246, 0.35);
  --hairline: rgba(242, 244, 246, 0.12);

  /* Accent-tinted edge for notices that are actionable but not solid lime:
     the draft banner, the missing-fields panel, the removed-from-library
     notice. One design decision, one token (spec 8). */
  --accent-border: rgba(57, 217, 122, 0.40);

  /* Interactive chrome. Named for the role, not the alpha. */
  --field-bg: rgba(242, 244, 246, 0.06);      /* text inputs, selects */
  --chip-bg: rgba(242, 244, 246, 0.07);       /* the back control */
  --track-bg: rgba(242, 244, 246, 0.08);      /* segment track */
  --control-border: rgba(242, 244, 246, 0.14);/* select border */
  --button-border: rgba(242, 244, 246, 0.22); /* secondary button outline */
  --checkbox-border: rgba(242, 244, 246, 0.28);

  /* Near-black mat a drill diagram sits on inside a card — deliberately
     distinct from --ink now that --ink is near-white text, not a light
     mat color (2026-08-14 chalkboard revamp). */
  --mat: #0f151c;

  /* Text sitting on --mat (e.g. "NO IMAGE"): light-on-dark, since --mat is
     near-black under the chalkboard theme. */
  --on-mat-muted: rgba(242, 244, 246, 0.40);

  /* Reflect tag's tinted background: accent at low alpha, sitting on --ground. */
  --accent-tint: rgba(57, 217, 122, 0.14);

  /* Modal scrim: the dimming layer behind delete/confirmation dialogs. */
  --scrim: rgba(0, 0, 0, 0.65);

  --radius: 10px;
  --radius-sm: 6px;
}
```

- [ ] **Step 2: Fix `DrillCard`'s mat background**

In `src/components/drills/DrillCard.tsx`, the diagram mat (around line 71) currently reads:

```tsx
      <div
        style={{
          background: 'var(--ink)',
```

Change it to:

```tsx
      <div
        style={{
          background: 'var(--mat)',
```

- [ ] **Step 3: Fix the session-view mat CSS class**

In `src/app/globals.css`, find `.session-view-mat` (around line 189-198) and change:

```css
.session-view-mat {
  flex: none;
  width: 96px;
  height: 96px;
  background: var(--ink);
```

to:

```css
.session-view-mat {
  flex: none;
  width: 96px;
  height: 96px;
  background: var(--mat);
```

Leave the `@media print` override (`.session-view-mat { background: #f3f0ea; }`) untouched — print styles are intentionally a separate light theme.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors (this task only changes CSS values and one string literal, no type changes).

- [ ] **Step 5: Manually check the app**

Run: `npm run dev`, open `/drills` in a browser. Confirm: page background is dark slate (not the old near-black), drill cards are a slightly lighter slate panel, diagram mats are near-black rectangles (not bright white — this is the bug the last two steps fixed), and any accent-colored control uses the new lime green.

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css src/components/drills/DrillCard.tsx
git commit -m "style: switch design tokens to chalkboard/lime theme"
```

---

## Task 2: Persistent nav shell

Adds the always-visible two-tab nav (Sessions, Drills) described in the design — bottom bar on mobile, top bar on desktop — replacing the current situation where `layout.tsx` renders no chrome at all and every screen relies on `ScreenHeader`'s back link.

**Files:**
- Create: `src/components/nav/AppNav.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css` (append nav styles)

**Interfaces:**
- Produces: `AppNav` component, no props (reads the current path itself via `usePathname`).
- Consumes: `--ground`, `--ink`, `--ink-45`/`--ink-30`, `--accent`, `--hairline` tokens from Task 1.

- [ ] **Step 1: Create the nav component**

Create `src/components/nav/AppNav.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/sessions', label: 'Sessions' },
  { href: '/drills', label: 'Drills' },
] as const

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <span className="app-nav-brand">TP DRILLS</span>
        <div className="app-nav-tabs">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="app-nav-tab"
                data-active={active ? 'true' : 'false'}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 2: Wire it into the root layout**

Read `src/app/layout.tsx` first to see the current font/provider setup, then add `<AppNav />` as a sibling of `{children}` inside `<body>`, and wrap `{children}` in a container that reserves space for the nav:

```tsx
import { AppNav } from '@/components/nav/AppNav'
// ...existing font imports stay as they are

// inside the returned JSX, replace `<body ...>{children}</body>` with:
        <body className={/* existing className expression, unchanged */}>
          <div className="app-shell">{children}</div>
          <AppNav />
        </body>
```

- [ ] **Step 3: Add nav styles**

Append to `src/app/globals.css`:

```css
/* Persistent nav (2026-08-14 revamp): bottom tabs on phone, top bar on
   desktop. Text-only by decision — no icon set chosen yet. */
.app-shell { padding-bottom: 64px; }

.app-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--ground);
  border-top: 1px solid var(--hairline);
  z-index: 20;
}

.app-nav-inner {
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-nav-brand { display: none; }

.app-nav-tabs {
  display: flex;
  width: 100%;
}

.app-nav-tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-30);
}

.app-nav-tab[data-active="true"] { color: var(--ink); }

@media (min-width: 780px) {
  .app-shell { padding-bottom: 0; padding-top: 56px; }

  .app-nav {
    top: 0;
    bottom: auto;
    border-top: none;
    border-bottom: 1px solid var(--hairline);
  }

  .app-nav-inner {
    justify-content: flex-start;
    gap: 28px;
    padding: 14px 20px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .app-nav-brand {
    display: block;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.02em;
    color: var(--ink);
  }

  .app-nav-tabs { width: auto; gap: 22px; }

  .app-nav-tab {
    flex: none;
    padding: 0 0 2px;
    border-bottom: 2px solid transparent;
  }

  .app-nav-tab[data-active="true"] { border-bottom-color: var(--accent); }
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Manually check the app**

Run: `npm run dev`. Confirm the nav bar appears on every page, at the bottom on a narrow viewport and at the top on a wide one, and that clicking "Drills" and "Sessions" navigates and highlights correctly. (`/sessions` doesn't exist as a real page yet until Task 5 — a 404 here is expected and fine for this step; the nav link itself is what's being verified.)

- [ ] **Step 6: Commit**

```bash
git add src/components/nav/AppNav.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: add persistent Sessions/Drills nav shell"
```

---

## Task 3: Session `themes` and Team calendar columns (migration)

Adds the two new columns the design needs: `session.themes` (a session's selected theme tags, reusing the existing `drill_type` enum rather than inventing a new taxonomy — see the correction note below) and `team.calendar_url` / `team.calendar_synced_at` for the calendar-subscription UI in Task 11.

**Correction to the design spec:** the spec's "drill card theme" field does *not* need a new column — `drill.type` (via `typeLabel()` in `src/lib/taxonomy.ts`) already is exactly this concept (Possession/Rondo, Finishing, Defending, etc.). Only *sessions* need a new column, since a session can span multiple themes and currently has no theme concept at all.

**Files:**
- Create: `supabase/migrations/0009_session_themes_and_team_calendar.sql`
- Modify: `src/lib/types.ts` (`Session`, `Team` interfaces)

**Interfaces:**
- Produces: `Session.themes: DrillType[]`, `Team.calendar_url: string | null`, `Team.calendar_synced_at: string | null`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0009_session_themes_and_team_calendar.sql`:

```sql
-- 2026-08-14 navigation/visual revamp: a session's theme tags (reuses the
-- existing drill_type enum — a session's theme is the same taxonomy as a
-- drill's type, no new enum needed), and a team-level calendar subscription
-- (design spec's "+ Session > paste a calendar link" flow). No sync job is
-- built here — this migration only adds somewhere to store the URL and the
-- last-synced timestamp; the actual feed fetch/parse is out of scope for
-- this pass (see 2026-08-14-navigation-visual-revamp-design.md).

alter table session
  add column themes drill_type[] not null default '{}';

alter table team
  add column calendar_url text,
  add column calendar_synced_at timestamptz;
```

- [ ] **Step 2: Apply the migration locally**

Run: `npx supabase migration up` (or the project's existing migration-apply command — check `package.json`/README for the exact one used elsewhere in this repo before running; if none is documented, `npx supabase db reset` re-applies all migrations against the local dev database).
Expected: migration applies with no error.

- [ ] **Step 3: Update the TypeScript types**

In `src/lib/types.ts`, update the `Session` interface (around line 56-69) to add `themes` after `session_notes`:

```ts
export interface Session {
  id: string
  team_id: string | null
  name: string
  library: Library
  date: string | null           // 'YYYY-MM-DD'
  start_time: string | null     // 'HH:MM:SS'
  location: string | null
  target_minutes: number
  age_band: AgeBand | null
  session_notes: string | null
  themes: DrillType[]
  reflected_at: string | null
  created_at: string
  updated_at: string
}
```

And update `Team` (around line 43-49) to add the two new fields:

```ts
export interface Team {
  id: string
  name: string
  library: Library
  age_band: AgeBand | null
  byga_url: string | null
  calendar_url: string | null
  calendar_synced_at: string | null
  created_at: string
}
```

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: fails at this point wherever code constructs a `Session` or `Team` object without the new fields (e.g. test fixtures) — that's expected; note every failure site, they get fixed as each later task touches that file. If nothing else in the codebase constructs these objects by hand outside of Supabase reads (likely, since these are read from the DB as `as Session`/`as Team` casts), the build should actually pass immediately.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0009_session_themes_and_team_calendar.sql src/lib/types.ts
git commit -m "feat: add session themes and team calendar-subscription columns"
```

---

## Task 4: Session date-grouping logic

The merged Sessions screen groups sessions into Past / Today / Upcoming / Unscheduled, sorted chronologically within each group — a genuinely new piece of pure logic (distinct from the existing status-bucket sort in `session-status.ts`, which this design explicitly rejected as the organizing principle). This gets its own tested module, following the project's existing convention of one `.test.ts` per pure-logic file.

**Files:**
- Create: `src/lib/session-groups.ts`
- Test: `src/lib/session-groups.test.ts`

**Interfaces:**
- Produces: `groupSessionsByDate(sessions: Session[], today: string): SessionGroups`, `SessionGroups` type.
- Consumes: `Session` type from `src/lib/types.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/session-groups.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { groupSessionsByDate } from './session-groups'
import type { Session } from './types'

function makeSession(overrides: Partial<Session>): Session {
  return {
    id: overrides.id ?? 'id',
    team_id: null,
    name: 'Session',
    library: 'outfield',
    date: null,
    start_time: null,
    location: null,
    target_minutes: 60,
    age_band: null,
    session_notes: null,
    themes: [],
    reflected_at: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('groupSessionsByDate', () => {
  it('sorts a past session into past, most recent first', () => {
    const a = makeSession({ id: 'a', date: '2026-08-10' })
    const b = makeSession({ id: 'b', date: '2026-08-11' })
    const result = groupSessionsByDate([a, b], '2026-08-14')
    expect(result.past.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('puts a session dated today into the today group', () => {
    const s = makeSession({ id: 's', date: '2026-08-14' })
    const result = groupSessionsByDate([s], '2026-08-14')
    expect(result.today.map((x) => x.id)).toEqual(['s'])
    expect(result.past).toHaveLength(0)
    expect(result.upcoming).toHaveLength(0)
  })

  it('sorts upcoming sessions soonest first', () => {
    const a = makeSession({ id: 'a', date: '2026-08-20' })
    const b = makeSession({ id: 'b', date: '2026-08-16' })
    const result = groupSessionsByDate([a, b], '2026-08-14')
    expect(result.upcoming.map((s) => s.id)).toEqual(['b', 'a'])
  })

  it('puts a dateless session into unscheduled', () => {
    const s = makeSession({ id: 's', date: null })
    const result = groupSessionsByDate([s], '2026-08-14')
    expect(result.unscheduled.map((x) => x.id)).toEqual(['s'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- session-groups`
Expected: FAIL — `session-groups.ts` doesn't exist yet.

- [ ] **Step 3: Implement `groupSessionsByDate`**

Create `src/lib/session-groups.ts`:

```ts
import type { Session } from './types'

/**
 * The Sessions screen's organizing principle: a chronological timeline, not
 * status buckets (spec 2026-08-14: an earlier draft grouped by "Needs a
 * plan / Ready / Reflect" and it was explicitly rejected — reflection isn't
 * a workflow step the coach wants surfaced).
 */
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- session-groups`
Expected: PASS, all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session-groups.ts src/lib/session-groups.test.ts
git commit -m "feat: add chronological session-grouping logic"
```

---

## Task 5: Merged Sessions screen

Replaces `/schedule` and `/planner`'s list pane with a single `/sessions` route using the Task 4 grouping, team filter chips, and the header `+ Team` / `+ Session` actions. `/sessions/[id]` (session detail) is restyled and extended in Task 8; this task only builds the list.

**Files:**
- Create: `src/app/sessions/page.tsx`
- Create: `src/components/sessions/SessionsTimeline.tsx`
- Create: `src/components/sessions/TeamFilterChips.tsx`
- Modify: `src/components/sessions/SessionRow.tsx` (restyle only — see Task 6)
- Delete: `src/app/schedule/page.tsx`, `src/app/planner/page.tsx` (superseded)

**Interfaces:**
- Consumes: `groupSessionsByDate` (Task 4), `listSessions`/`drillCountsBySession`/`plannedMinutesBySession` from `src/lib/sessions-server.ts`, `SessionRow` (Task 6), `Team` type.
- Produces: nothing consumed elsewhere — this is a leaf page.

- [ ] **Step 1: Add a server-side team list function**

`src/lib/sessions-server.ts` has no team read yet. Add one alongside the existing exports:

```ts
import type { Session, Team } from './types'
// (add Team to the existing type import if not already there)

export async function listTeams(): Promise<Team[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('team').select('*').order('name')
  if (error) throw new Error(`Failed to list teams: ${error.message}`)
  return data as Team[]
}
```

- [ ] **Step 2: Build the team filter chips component**

Create `src/components/sessions/TeamFilterChips.tsx`:

```tsx
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
```

- [ ] **Step 3: Build the timeline component**

Create `src/components/sessions/SessionsTimeline.tsx`:

```tsx
import type { Session } from '@/lib/types'
import type { SessionGroups } from '@/lib/session-groups'
import { SessionRow } from './SessionRow'

function Section({ label, sessions, dimmed = false, drillCounts, plannedMinutes }: {
  label: string
  sessions: Session[]
  dimmed?: boolean
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  if (sessions.length === 0) return null
  return (
    <section style={{ marginBottom: 8 }}>
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

export function SessionsTimeline({
  groups,
  drillCounts,
  plannedMinutes,
}: {
  groups: SessionGroups
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  return (
    <div style={{ padding: '4px 18px 32px' }}>
      <Section label="Past" sessions={groups.past} dimmed drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
      <Section label="Today" sessions={groups.today} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
      <Section label="Upcoming" sessions={groups.upcoming} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
      <Section label="Unscheduled" sessions={groups.unscheduled} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </div>
  )
}
```

Note: this drops the `status`/`StateTag` prop `SessionRow` currently requires — Task 6 removes that prop as part of restyling `SessionRow`, so this component and Task 6 must land together (they're sequential in this plan, so by the time Task 5's code runs, Task 6 hasn't happened yet — write Task 5's `SessionRow` usage *without* a `status` prop now, and Task 6 will make that valid by removing the prop from `SessionRow` itself).

- [ ] **Step 4: Build the page**

Create `src/app/sessions/page.tsx`:

```tsx
import { AppNav } from '@/components/nav/AppNav'
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
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'flex-end' }}>
        <a href="/sessions/new" className="header-cta">+ Session</a>
      </div>
      <TeamFilterChips teams={teams} selectedTeamId={selectedTeamId} />
      <SessionsTimeline groups={groups} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </main>
  )
}
```

- [ ] **Step 5: Add chip/CTA styles**

Append to `src/app/globals.css`:

```css
.team-chip-row {
  display: flex;
  gap: 8px;
  padding: 12px 18px 4px;
  overflow-x: auto;
}
.team-chip {
  flex: none;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 20px;
  border: 1px solid var(--hairline);
  color: var(--ink-45);
  white-space: nowrap;
}
.team-chip[data-selected="true"] { background: var(--accent); color: var(--ground); border-color: var(--accent); }
.team-chip-add { border: 1px dashed var(--accent); color: var(--accent); }

.header-cta {
  background: var(--accent);
  color: var(--ground);
  font-size: 11px;
  font-weight: 700;
  padding: 6px 12px;
  border-radius: 6px;
}
```

- [ ] **Step 6: Remove the superseded routes**

```bash
git rm src/app/schedule/page.tsx src/app/planner/page.tsx
```

If anything else in the codebase links to `/schedule` or `/planner`, update those links to `/sessions` now — search first:

Run: `grep -rn "'/schedule'\|\"/schedule\"\|'/planner'\|\"/planner\"" src`
Expected: any hits get changed to `/sessions` (or `/sessions/${id}` for links that included `?session=`) before committing.

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: fails until Task 6 removes `SessionRow`'s `status` prop requirement — that's expected and resolved by the next task. If working through this plan sequentially task-by-task with a build check after each, treat Tasks 5 and 6 as landing together in one commit rather than two if the build won't pass in between; note this in the PR/commit rather than forcing an artificial green state.

- [ ] **Step 8: Commit**

```bash
git add src/app/sessions/page.tsx src/components/sessions/SessionsTimeline.tsx src/components/sessions/TeamFilterChips.tsx src/lib/sessions-server.ts src/app/globals.css
git rm src/app/schedule/page.tsx src/app/planner/page.tsx
git commit -m "feat: merge Schedule and Planner into one chronological Sessions screen"
```

---

## Task 6: Restyle `SessionRow`, drop status-tag dependency

Removes the `StateTag`/`status` prop (a status-bucket concept the merged screen no longer organizes by) and reskins the row for the chalkboard/lime cards from the style guide.

**Files:**
- Modify: `src/components/sessions/SessionRow.tsx`

**Interfaces:**
- Produces: `SessionRow({ session, drillCount, plannedMinutes?, href, dimmed? })` — same as before minus `status`.

- [ ] **Step 1: Rewrite the component**

Replace the full contents of `src/components/sessions/SessionRow.tsx`:

```tsx
import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatTime } from '@/lib/dates'

function weekdayOf(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(
    new Date(year, month - 1, day),
  )
}

function dayOf(date: string): string {
  return String(Number(date.split('-')[2]))
}

export function SessionRow({
  session,
  drillCount,
  plannedMinutes,
  href,
  dimmed = false,
}: {
  session: Session
  drillCount: number
  plannedMinutes?: number
  href: string
  dimmed?: boolean
}) {
  const durationLabel =
    plannedMinutes !== undefined
      ? `${plannedMinutes} of ${session.target_minutes} min`
      : `${session.target_minutes} min`

  const metaParts = [
    session.start_time ? formatTime(session.start_time) : null,
    session.location,
    durationLabel,
    `${drillCount} drill${drillCount === 1 ? '' : 's'}`,
  ].filter((part): part is string => Boolean(part))

  const needsPlan = drillCount === 0

  return (
    <Link
      href={href}
      className="session-row"
      style={{ opacity: dimmed ? 0.6 : 1 }}
    >
      <div style={{ width: 40, flexShrink: 0, textAlign: 'center' }}>
        {session.date ? (
          <>
            <div className="hl" style={{ fontSize: 20 }}>{dayOf(session.date)}</div>
            <div className="lbl">{weekdayOf(session.date)}</div>
          </>
        ) : (
          <div className="hl" style={{ fontSize: 20, color: 'var(--ink-30)' }}>—</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.name}
        </h4>
        {metaParts.length > 0 && (
          <div className="bd" style={{ fontSize: 12, color: 'var(--ink-45)', marginTop: 2 }}>
            {metaParts.join(' · ')}
          </div>
        )}
        {needsPlan && (
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginTop: 5 }}>
            Needs a plan
          </div>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Add the row's card style**

Append to `src/app/globals.css`:

```css
.session-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px;
  margin: 0 0 8px;
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
}
```

- [ ] **Step 3: Fix every other caller of `SessionRow`**

Run: `grep -rn "SessionRow" src --include="*.tsx" -l`
For each result other than `src/components/sessions/SessionsTimeline.tsx` (already updated in Task 5) and `SessionRow.tsx` itself, remove the `status={...}` prop from the call site and delete now-unused `deriveStatus`/`SessionStatus` imports if nothing else in that file uses them.

- [ ] **Step 4: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: PASS (this task doesn't touch any file with its own `.test.ts`, so this is a regression check).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: drop status-tag from SessionRow, restyle as chalkboard card"
```

---

## Task 7: Drill card restyle

Simplifies `DrillCard` per the design: bigger diagram, title on its own line, one meta row (`type · players · duration · theme`), age band/bibs/stats moved off the grid card entirely (still available on the drill detail page — unchanged, out of scope). "Theme" reuses `typeLabel(drill.type)` — see Task 3's correction note, no new drill field needed.

**Files:**
- Modify: `src/components/drills/DrillCard.tsx`

**Interfaces:**
- Produces: same `DrillCard` props signature as before (`drill`, `browseState`, `onAdd`, `added`, `pending`, `stats`) — Task 9 changes `added`'s meaning (boolean → position number), so this task keeps the current boolean signature and Task 9 revises it.

- [ ] **Step 1: Replace the card body**

In `src/components/drills/DrillCard.tsx`, replace everything from the `players` label helper through the closing of the `<Link>` (i.e. keep the file's imports, `playersLabel`, and the outer function signature, but replace the returned JSX body) with:

```tsx
      <div
        style={{
          background: 'var(--mat)',
          borderRadius: 'var(--radius-sm)',
          height: 120,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          padding: 6,
          marginBottom: 9,
        }}
      >
        {drill.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={drill.image_url}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.09em',
              color: 'var(--on-mat-muted)',
            }}
          >
            NO IMAGE
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 14 }}>{drill.name}</h3>

      {drill.is_draft ? (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginTop: 7 }}>
          Draft — needs finishing
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink)' }}>
            {drill.library === 'outfield' ? 'Outfield' : 'Goalkeeping'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-30)' }}>·</span>
          <span style={{ fontSize: 10, color: 'var(--ink-45)' }}>{playersLabel(drill)}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-30)' }}>·</span>
          <span style={{ fontSize: 10, color: 'var(--ink-45)' }}>
            {drill.duration_mins === null ? '— min' : `${drill.duration_mins} min`}
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-30)' }}>·</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>
            {typeLabel(drill.type)}
          </span>
        </div>
      )}
```

`playersLabel(drill)` stays as `${min}–${max} players` / `${min}+ players` — update its return values to include the word "players" (currently it returns just the number range with no unit), so the meta row reads naturally without an extra static "players" string wedged in. Edit the existing helper at the top of the file:

```ts
function playersLabel(drill: Drill): string {
  if (drill.players_min === null) return '— players'
  return drill.players_max === null
    ? `${drill.players_min}+ players`
    : `${drill.players_min}–${drill.players_max} players`
}
```

`typeLabel` is already imported at the top of the file (`import { typeLabel } from '@/lib/taxonomy'`) — no new import needed.

- [ ] **Step 2: Delete the now-unused `statsLabel` helper**

`statsLabel` (usage/rating text) is no longer rendered on the grid card per the design (stats move to the drill detail page, which this plan doesn't touch). Remove the `statsLabel` function from `DrillCard.tsx` entirely — leaving it as dead code would fail lint (`no-unused-vars`).

- [ ] **Step 3: Verify the build and lint**

Run: `npm run build && npm run lint`
Expected: both PASS.

- [ ] **Step 4: Manually check the app**

Run: `npm run dev`, open `/drills`. Confirm: diagram is now the dominant visual element, title sits alone above one meta row reading like "Outfield · 6–8 players · 15 min · Possession / Rondo", and a draft card shows the "Draft — needs finishing" line in place of the meta row.

- [ ] **Step 5: Commit**

```bash
git add src/components/drills/DrillCard.tsx
git commit -m "style: simplify drill card to title + single meta row"
```

---

## Task 8: Session detail — team title, theme picker, drills list

Rewrites `/sessions/[id]` to match the design: team name as the title (not the free-text session `name` field), a session theme multi-select (backed by `session.themes` from Task 3), and the ordered drill list. Absorbs what `SessionDetailsForm` (editable fields) and `SessionBuilder` (drill list/reorder) did separately in the old Planner into one screen.

**Files:**
- Modify: `src/app/sessions/[id]/page.tsx`
- Create: `src/components/sessions/SessionThemePicker.tsx`
- Modify: `src/components/sessions/SessionBuilder.tsx` (restyle drill rows, keep existing reorder/remove logic)
- Modify: `src/lib/sessions.ts` (add `updateSessionThemes`)
- Modify: `src/lib/sessions-server.ts` (`getSession` must select the new `themes` column — Supabase's `select('*')` already includes any new column automatically, so this is a verification step, not a code change)

**Interfaces:**
- Consumes: `Session.themes: DrillType[]` (Task 3), `typesFor(library)`/`typeLabel(type)` from `src/lib/taxonomy.ts`.
- Produces: `updateSessionThemes(sessionId: string, themes: DrillType[]): Promise<void>` for `SessionThemePicker` to call.

- [ ] **Step 1: Add the mutation function**

In `src/lib/sessions.ts`, add alongside the existing `updateSession`:

```ts
export async function updateSessionThemes(sessionId: string, themes: DrillType[]): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('session').update({ themes }).eq('id', sessionId)
  if (error) throw new Error(`Failed to update session themes: ${error.message}`)
}
```

(Add `DrillType` to the file's existing type import from `./types` if not already imported.)

- [ ] **Step 2: Build the theme picker**

Create `src/components/sessions/SessionThemePicker.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { typesFor, typeLabel } from '@/lib/taxonomy'
import { updateSessionThemes } from '@/lib/sessions'
import type { DrillType, Library } from '@/lib/types'

export function SessionThemePicker({
  sessionId,
  library,
  initialThemes,
}: {
  sessionId: string
  library: Library
  initialThemes: DrillType[]
}) {
  const [themes, setThemes] = useState<DrillType[]>(initialThemes)
  const [pending, setPending] = useState(false)
  const options = typesFor(library)

  async function toggle(type: DrillType) {
    const next = themes.includes(type)
      ? themes.filter((t) => t !== type)
      : [...themes, type]
    setThemes(next)
    setPending(true)
    try {
      await updateSessionThemes(sessionId, next)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 6 }}>Session theme</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {options.map((type) => {
          const selected = themes.includes(type)
          return (
            <button
              key={type}
              type="button"
              disabled={pending}
              onClick={() => toggle(type)}
              className="theme-chip"
              data-selected={selected ? 'true' : 'false'}
            >
              {typeLabel(type)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add theme-chip styles**

Append to `src/app/globals.css`:

```css
.theme-chip {
  flex: none;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 11px;
  border-radius: 20px;
  border: 1px solid var(--hairline);
  background: none;
  color: var(--ink-45);
  white-space: nowrap;
}
.theme-chip[data-selected="true"] { background: var(--accent); color: var(--ground); border-color: var(--accent); }
```

- [ ] **Step 4: Rewrite the session detail page**

Replace `src/app/sessions/[id]/page.tsx`. Read the current file first (it renders `SessionView`, the pitchside/print view) — that component and route stays as-is for now (it's the "live/print" mode, out of scope per the design doc's own note that the drill detail and a couple of secondary screens weren't visually explored). This task adds the *planning* view as the default and keeps a link to the existing pitchside view:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/sessions-server'
import { SessionThemePicker } from '@/components/sessions/SessionThemePicker'
import { SessionBuilder } from '@/components/sessions/SessionBuilder'
import { formatShortDate, formatTime } from '@/lib/dates'

export const dynamic = 'force-dynamic'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession(id).catch(() => null)
  if (!session) notFound()

  const teamLabel = session.team_id ? session.name : session.name // team name join added in Task 10
  const metaParts = [
    session.date ? formatShortDate(session.date) : 'No date',
    session.start_time ? formatTime(session.start_time) : null,
    `target ${session.target_minutes} min`,
  ].filter((p): p is string => Boolean(p))

  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>

      <h1 style={{ fontSize: 20, marginTop: 10 }}>{teamLabel}</h1>
      <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>{metaParts.join(' · ')}</div>

      <div style={{ marginTop: 16 }}>
        <SessionThemePicker sessionId={session.id} library={session.library} initialThemes={session.themes} />
      </div>

      <div style={{ marginTop: 20 }}>
        <SessionBuilder session={session} />
      </div>
    </main>
  )
}
```

Note the `teamLabel` line is a placeholder pending Task 10 — `getSession` currently returns `SessionWithDrills`, which does not join the team's name, only `team_id`. Task 10 adds that join. Leave the `session.name` fallback here so this task's build stays green; Task 10 replaces this line with the real team name.

- [ ] **Step 5: Restyle `SessionBuilder`'s drill rows**

Open `src/components/sessions/SessionBuilder.tsx`. Keep all existing logic (reorder, remove, duration override) untouched — only update the inline styles on each drill row to use the new tokens (`var(--card)` background, `var(--hairline)` border, `var(--radius)` corners) instead of whatever the current styling uses, and add an "+ Add drill" link/button at the top of the list pointing to `/drills?session=${session.id}`:

```tsx
// At the top of the rendered list, before mapping session.drills:
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
  <div className="lbl">Drills · {session.drills.length}</div>
  <a href={`/drills?session=${session.id}`} className="header-cta">+ Add drill</a>
</div>
```

(`.header-cta` was added in Task 5.)

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Manually check the app**

Run: `npm run dev`, open an existing session's detail page. Confirm: theme chips render and toggle (check the `session` row in Supabase updates), the drill list renders with the new "+ Add drill" link, and clicking it lands on `/drills?session=<id>` with the existing tray behavior intact.

- [ ] **Step 8: Commit**

```bash
git add src/app/sessions/[id]/page.tsx src/components/sessions/SessionThemePicker.tsx src/components/sessions/SessionBuilder.tsx src/lib/sessions.ts src/app/globals.css
git commit -m "feat: restyle session detail with theme picker and drill list"
```

---

## Task 9: Add-drill flow — order-position badges, no library toggle, "Add" label

Three specific corrections from the brainstorm: the per-card add control shows the drill's position in the session (not a checkmark), the outfield/goalkeeping `Segment` toggle is hidden when arriving with a session context (since `session.library` already fixes the pool), and the tray's action button reads "Add" instead of "Done".

**Files:**
- Modify: `src/components/drills/DrillCard.tsx`
- Modify: `src/components/drills/DrillGrid.tsx`
- Modify: `src/components/drills/DrillsBrowser.tsx`
- Modify: `src/components/sessions/SessionTray.tsx`

**Interfaces:**
- Produces: `DrillCard`'s `added` prop changes type from `boolean` to `number | false` (the drill's 1-based position when added, `false` when not) — `DrillGrid` and `DrillsBrowser` must compute and pass that number.

- [ ] **Step 1: Update `DrillCard`'s add-button badge**

In `src/components/drills/DrillCard.tsx`, change the `added` prop's type and the badge rendering. Find the prop destructuring near the top of the function:

```tsx
export function DrillCard({
  drill,
  browseState,
  onAdd,
  added = false,
  pending = false,
  stats,
}: {
  drill: Drill
  browseState: DrillBrowseState
  onAdd?: () => void
  added?: number | false
  pending?: boolean
  stats?: DrillStats
}) {
```

And the badge's rendered content (currently `{added ? '✓' : pending ? '…' : '+'}`), change to:

```tsx
{added !== false ? added : pending ? '…' : '+'}
```

Update the `aria-label` logic just above it, which currently reads `` `${drill.name} already added` `` for the boolean case — change to:

```tsx
aria-label={
  !showAdd
    ? 'Finish this draft before it can be added to a session'
    : added !== false
      ? `${drill.name} is drill ${added} in this session — tap to remove`
      : pending
        ? `Adding ${drill.name}…`
        : `Add ${drill.name} to session`
}
```

And the badge's background/color condition (currently `added || pending ? ...`), change every `added ||` to `added !== false ||`.

- [ ] **Step 2: Thread the position number through `DrillGrid`**

Read `src/components/drills/DrillGrid.tsx`. It currently takes `addedIds?: Set<string>` or similar (verify the exact prop by reading the file) and passes a boolean `added` to each `DrillCard`. Change it to take the full ordered list of added drill IDs instead of a set, so position can be derived:

```tsx
export function DrillGrid({
  drills,
  browseState,
  emptyState,
  onAdd,
  addedDrillIds = [],
  pendingId,
  stats,
}: {
  drills: Drill[]
  browseState: DrillBrowseState
  emptyState?: React.ReactNode
  onAdd?: (drillId: string) => void
  /** Ordered: index + 1 is the drill's position badge. */
  addedDrillIds?: string[]
  pendingId?: string
  stats?: Record<string, DrillStats>
}) {
  // ...inside the map over drills, replace whatever computed the old boolean:
  const position = addedDrillIds.indexOf(drill.id)
  const added = position === -1 ? false : position + 1
  // pass `added={added}` to DrillCard as before
}
```

Adjust to match whatever the file's actual current prop names are — read it first; the key change is: stop passing a boolean, pass `1-based index in the ordered added-drill-ids array, or false`.

- [ ] **Step 3: Update `DrillsBrowser`**

`DrillsBrowser` holds the session tray state and currently tracks added drills as a set (or similar) for the boolean case. Change that state to an ordered array (`session.drills.map(d => d.drill_id)`, kept in the order they were added — `SessionWithDrills.drills` is already ordered by `position` per its type, so this is likely already available as `session.drills.map((d) => d.drill_id)` with no new state needed beyond what's already tracked) and pass it as `addedDrillIds` to `DrillGrid`.

Also in this file: hide the outfield/goalkeeping `<Segment>` control when `session` is present (a session fixes the pool to its own `library`), and force the browsed library to `session.library` in that case rather than reading it from the URL/filter state. Find where `<Segment>` is rendered and wrap it:

```tsx
{!session && (
  <Segment value={library} onChange={setLibrary} />
)}
```

And wherever the effective library used to filter/fetch drills is computed, short-circuit to `session.library` when a session is present:

```tsx
const effectiveLibrary = session ? session.library : library
```

(Read the file to find the exact variable name currently used for "which library's drills to show" and rename call sites accordingly — do not introduce a second competing variable.)

- [ ] **Step 4: Rename the tray's action button**

In `src/components/sessions/SessionTray.tsx`, find the button/link currently labeled `Done` and change its text to `Add`. Read the file first to confirm there's exactly one such label (the design's "Done → Add" note was about this specific control, not a generic rename across the app).

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: PASS — this task touches no `.test.ts`-covered logic directly, but `drill-query.test.ts` and `filters.test.ts` exercise types these components consume, so this is a regression check.

- [ ] **Step 7: Manually check the app**

Run: `npm run dev`, open a session detail page, click "+ Add drill". Confirm: no outfield/goalkeeping toggle is shown, tapping a card's "+" shows the number "1", tapping a second card shows "2", tapping an already-numbered badge removes it and the remaining badge renumbers, and the bottom tray's button reads "Add".

- [ ] **Step 8: Commit**

```bash
git add src/components/drills/DrillCard.tsx src/components/drills/DrillGrid.tsx src/components/drills/DrillsBrowser.tsx src/components/sessions/SessionTray.tsx
git commit -m "feat: order-position badges and session-locked library in add-drill flow"
```

---

## Task 10: Team screens

Builds the Team screen on top of the existing `team` table (already present, RLS-open, unused by any UI). Adds `/teams/[id]` (team detail: name/type/upcoming+past sessions) and `/teams/new` (create form), and joins team name into session reads so Task 8's `teamLabel` placeholder becomes real.

**Files:**
- Create: `src/lib/teams-server.ts`
- Create: `src/lib/teams.ts`
- Create: `src/app/teams/[id]/page.tsx`
- Create: `src/app/teams/new/page.tsx`
- Create: `src/components/teams/TeamForm.tsx`
- Modify: `src/lib/sessions-server.ts` (`getSession` — join team name)
- Modify: `src/app/sessions/[id]/page.tsx` (use the real joined team name from Task 8's placeholder)
- Modify: `src/lib/types.ts` (`SessionWithDrills` — add optional `team` field)

**Interfaces:**
- Produces: `getTeam(id: string): Promise<Team | null>`, `listTeamsWithSessionCounts` (not needed — reuses `listTeams` from Task 5), `createTeam(input: TeamInput): Promise<Team>` in `src/lib/teams.ts`.
- Consumes: `Team` type (Task 3), `listSessions`/`drillCountsBySession` from `sessions-server.ts`, `AGE_BANDS` from `taxonomy.ts`.

- [ ] **Step 1: Server-side team reads**

Create `src/lib/teams-server.ts`:

```ts
import { createServerClient } from './supabase/server'
import type { Team } from './types'

export async function getTeam(id: string): Promise<Team | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('team').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load team: ${error.message}`)
  return (data as Team) ?? null
}
```

- [ ] **Step 2: Client-side team write**

Create `src/lib/teams.ts`:

```ts
import { createBrowserClient } from './supabase/client'
import type { Team, TeamInput } from './types'

export async function createTeam(input: TeamInput): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('team').insert(input).select().single()
  if (error) throw new Error(`Failed to create team: ${error.message}`)
  return data as Team
}
```

Add the `TeamInput` type to `src/lib/types.ts`, next to the existing `Team` interface:

```ts
export type TeamInput = Omit<Team, 'id' | 'created_at' | 'calendar_url' | 'calendar_synced_at'>
```

- [ ] **Step 3: Join team name into session reads**

In `src/lib/sessions-server.ts`, find `getSession` and change its select to join `team`:

```ts
export async function getSession(id: string): Promise<SessionWithDrills | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('session')
    .select('*, team:team_id(id, name), session_drill(*, drill(*))')
    .eq('id', id)
    .maybeSingle()
  // ... keep the existing error handling and shaping logic below unchanged,
  // adjusting only the returned object to pass through `team` from the row.
}
```

Read the current implementation first — it likely already does a `session_drill(*, drill(*))` join for the drills; add `team:team_id(id, name)` alongside it without disturbing the existing drill-joining logic, and add the joined `team` to the returned shape.

In `src/lib/types.ts`, extend `SessionWithDrills`:

```ts
export interface SessionWithDrills extends Session {
  drills: SessionDrillWithDrill[]
  team: { id: string; name: string } | null
}
```

- [ ] **Step 4: Update the session detail page's placeholder**

In `src/app/sessions/[id]/page.tsx` (from Task 8), replace:

```tsx
const teamLabel = session.team_id ? session.name : session.name // team name join added in Task 10
```

with:

```tsx
const teamLabel = session.team?.name ?? session.name
```

And wrap the header in a link to the team when one exists:

```tsx
<h1 style={{ fontSize: 20, marginTop: 10 }}>
  {session.team ? <Link href={`/teams/${session.team.id}`}>{teamLabel}</Link> : teamLabel}
</h1>
```

- [ ] **Step 5: Build the team form**

Create `src/components/teams/TeamForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createTeam } from '@/lib/teams'
import { AGE_BANDS } from '@/lib/taxonomy'
import type { AgeBand, Library } from '@/lib/types'

export function TeamForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [library, setLibrary] = useState<Library>('outfield')
  const [ageBand, setAgeBand] = useState<AgeBand | ''>('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const team = await createTeam({
        name,
        library,
        age_band: library === 'outfield' && ageBand !== '' ? ageBand : null,
        byga_url: null,
      })
      router.push(`/teams/${team.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label>
        <div className="lbl" style={{ marginBottom: 4 }}>Team name</div>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
        />
      </label>

      <label>
        <div className="lbl" style={{ marginBottom: 4 }}>Type</div>
        <select
          value={library}
          onChange={(e) => setLibrary(e.target.value as Library)}
          style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
        >
          <option value="outfield">Outfield</option>
          <option value="goalkeeping">Goalkeeping</option>
        </select>
      </label>

      {library === 'outfield' && (
        <label>
          <div className="lbl" style={{ marginBottom: 4 }}>Age band</div>
          <select
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as AgeBand)}
            style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
          >
            <option value="">Select…</option>
            {AGE_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
          </select>
        </label>
      )}

      <button type="submit" disabled={saving || name.trim() === ''} className="header-cta" style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Creating…' : 'Create team'}
      </button>
    </form>
  )
}
```

- [ ] **Step 6: Build the routes**

Create `src/app/teams/new/page.tsx`:

```tsx
import Link from 'next/link'
import { TeamForm } from '@/components/teams/TeamForm'

export default function NewTeamPage() {
  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      <h1 style={{ fontSize: 20, marginTop: 10, marginBottom: 16 }}>New team</h1>
      <TeamForm />
    </main>
  )
}
```

Create `src/app/teams/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTeam } from '@/lib/teams-server'
import { listSessions, drillCountsBySession, plannedMinutesBySession } from '@/lib/sessions-server'
import { groupSessionsByDate } from '@/lib/session-groups'
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
  const groups = groupSessionsByDate(sessions, todayISO())

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
      <SessionsTimeline groups={groups} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </main>
  )
}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 8: Manually check the app**

Run: `npm run dev`. From `/sessions`, click "+ Team", fill the form, submit — confirm it lands on the new team's `/teams/[id]` page. Confirm a session belonging to that team now shows the team name (not the raw session name) as its detail-page title, linking back to the team.

- [ ] **Step 9: Commit**

```bash
git add src/lib/teams-server.ts src/lib/teams.ts src/lib/types.ts src/lib/sessions-server.ts src/app/teams src/app/sessions/[id]/page.tsx
git commit -m "feat: add Team detail/create screens, join team name into session reads"
```

---

## Task 11: "+ Session" flow — manual create or calendar link

The choice screen from the design: create a session manually (existing `createSession`, just given a proper form/route instead of living inline in the old Planner), or connect a team's calendar feed. The actual ICS fetch/parse/sync job is explicitly out of scope (per the design doc) — this task only persists the URL and shows connection state.

**Files:**
- Create: `src/app/sessions/new/page.tsx`
- Create: `src/components/sessions/NewSessionChoice.tsx`
- Create: `src/components/sessions/ManualSessionForm.tsx`
- Create: `src/components/teams/CalendarConnect.tsx`
- Modify: `src/lib/teams.ts` (add `connectCalendar`)

**Interfaces:**
- Produces: `connectCalendar(teamId: string, url: string): Promise<Team>`.
- Consumes: `createSession` from `src/lib/sessions.ts` (existing), `listTeams`-shaped data passed as a prop from the server page.

- [ ] **Step 1: Add the calendar-connect mutation**

In `src/lib/teams.ts`, add:

```ts
export async function connectCalendar(teamId: string, url: string): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from('team')
    .update({ calendar_url: url, calendar_synced_at: new Date().toISOString() })
    .eq('id', teamId)
    .select()
    .single()
  if (error) throw new Error(`Failed to connect calendar: ${error.message}`)
  return data as Team
}
```

Note this only records that a URL was saved and stamps `calendar_synced_at` with the connection time — no ICS fetch happens. This matches the design doc's explicit flag that the sync job itself is future work.

- [ ] **Step 2: Build the calendar-connect UI**

Create `src/components/teams/CalendarConnect.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { connectCalendar } from '@/lib/teams'
import type { Team } from '@/lib/types'

export function CalendarConnect({ team }: { team: Team }) {
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(team.calendar_url !== null)

  async function handleConnect() {
    if (url.trim() === '') return
    setSaving(true)
    try {
      await connectCalendar(team.id, url.trim())
      setConnected(true)
    } finally {
      setSaving(false)
    }
  }

  if (connected) {
    return <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Connected</div>
  }

  return (
    <div>
      <input
        placeholder="webcal://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: '100%', background: 'var(--mat)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink-45)', fontSize: 11 }}
      />
      <button
        type="button"
        onClick={handleConnect}
        disabled={saving || url.trim() === ''}
        className="header-cta"
        style={{ marginTop: 8 }}
      >
        {saving ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Build the manual-create form**

Create `src/components/sessions/ManualSessionForm.tsx` — a thin wrapper around the existing `createSession` (from `src/lib/sessions.ts`, already implemented):

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSession } from '@/lib/sessions'
import type { Library, Team } from '@/lib/types'

export function ManualSessionForm({ teams, defaultTeamId }: { teams: Team[]; defaultTeamId: string | null }) {
  const router = useRouter()
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedTeam = teams.find((t) => t.id === teamId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam) return
    setSaving(true)
    try {
      const session = await createSession({
        team_id: selectedTeam.id,
        name: selectedTeam.name,
        library: selectedTeam.library as Library,
        date: date === '' ? null : date,
        start_time: null,
        location: null,
        target_minutes: 60,
        age_band: selectedTeam.age_band,
        session_notes: null,
        themes: [],
      })
      router.push(`/sessions/${session.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label>
        <div className="lbl" style={{ marginBottom: 4 }}>Team</div>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
        >
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label>
        <div className="lbl" style={{ marginBottom: 4 }}>Date</div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
        />
      </label>
      <button type="submit" disabled={saving || !selectedTeam} className="header-cta" style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Creating…' : 'Create session'}
      </button>
    </form>
  )
}
```

Verify `createSession`'s actual parameter shape by reading `src/lib/sessions.ts` before finalizing this step — `SessionInput` is `Omit<Session, 'id' | 'created_at' | 'updated_at' | 'reflected_at'>`, so the object above must match that shape exactly, including the new `themes` field from Task 3.

- [ ] **Step 4: Build the choice screen**

Create `src/components/sessions/NewSessionChoice.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { ManualSessionForm } from './ManualSessionForm'
import { CalendarConnect } from '../teams/CalendarConnect'
import type { Team } from '@/lib/types'

export function NewSessionChoice({ teams, defaultTeamId }: { teams: Team[]; defaultTeamId: string | null }) {
  const [mode, setMode] = useState<'choose' | 'manual'>('choose')
  const defaultTeam = teams.find((t) => t.id === defaultTeamId) ?? teams[0]

  if (mode === 'manual') {
    return <ManualSessionForm teams={teams} defaultTeamId={defaultTeamId} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        onClick={() => setMode('manual')}
        className="new-session-option"
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Create manually</div>
        <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
          Set team, date, time and target minutes yourself
        </div>
      </button>

      {defaultTeam && (
        <div className="new-session-option" data-accent="true">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Paste a calendar link</div>
          <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
            Subscribe to a fixture/training feed for {defaultTeam.name}
          </div>
          <div style={{ marginTop: 10 }}>
            <CalendarConnect team={defaultTeam} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add the option-card style**

Append to `src/app/globals.css`:

```css
.new-session-option {
  text-align: left;
  background: var(--card);
  border: 1px solid var(--hairline);
  border-radius: var(--radius);
  padding: 14px;
}
.new-session-option[data-accent="true"] { border-color: var(--accent); }
```

- [ ] **Step 6: Build the page**

Create `src/app/sessions/new/page.tsx`:

```tsx
import Link from 'next/link'
import { listTeams } from '@/lib/sessions-server'
import { NewSessionChoice } from '@/components/sessions/NewSessionChoice'

export const dynamic = 'force-dynamic'

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team } = await searchParams
  const teams = await listTeams()

  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      <h1 style={{ fontSize: 20, marginTop: 10, marginBottom: 16 }}>New session</h1>
      {teams.length === 0 ? (
        <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)' }}>
          <Link href="/teams/new">Create a team</Link> first — a session always belongs to one.
        </p>
      ) : (
        <NewSessionChoice teams={teams} defaultTeamId={typeof team === 'string' ? team : null} />
      )}
    </main>
  )
}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 8: Run the full test suite one final time**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 9: Manually check the app end to end**

Run: `npm run dev`. From `/sessions`, click "+ Session" → confirm the choice screen shows both options, manual create works and lands on the new session's detail page, and pasting a URL into the calendar option shows "● Connected" after clicking Connect (no real sync — just confirming the save/UI state per this task's documented scope).

- [ ] **Step 10: Commit**

```bash
git add src/app/sessions/new/page.tsx src/components/sessions/NewSessionChoice.tsx src/components/sessions/ManualSessionForm.tsx src/components/teams/CalendarConnect.tsx src/lib/teams.ts src/app/globals.css
git commit -m "feat: add + Session flow with manual create and calendar-link connect"
```

---

## Explicitly out of scope (per the design spec)

- Real calendar-feed sync (fetching/parsing the ICS URL on a schedule and creating/updating sessions from it) — only the connect UI and storage exist after Task 11.
- Player rosters within a team.
- Reflection UX changes (kept but fully de-emphasized — not rebuilt).
- Auth/permissions for genuinely separate coach accounts — the app remains single-tenant/no-auth throughout this plan, matching its current documented posture.
- Drill-creation/editing screens (the diagram editor, drill authoring forms) and the drill detail page — untouched.
- An icon set for the nav/buttons — text-only throughout.
- How a session's `library` gets set was resolved during planning (it's already a required field on `Session`, set explicitly by whoever creates it — Task 11's `ManualSessionForm` defaults it from the selected team, which resolves the design spec's open question: default-from-team, editable if ever needed later).
