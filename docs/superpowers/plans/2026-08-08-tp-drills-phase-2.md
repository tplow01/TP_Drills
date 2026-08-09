# TP Drills — Phase 2 (Planner, Sessions, Hub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the drill library into a coaching hub — plan a session from the library, read it pitchside, reflect on it afterwards, and see your week.

**Architecture:** Two new tables (`session`, `session_drill`) plus a minimal `team` table so the foreign key is real. Everything derivable stays derived: session status comes from date, drill count and `reflected_at`; drill usage and ratings come from a `drill_stats` view. Session status and running-time arithmetic are pure functions in `src/lib/`, unit-tested; the screens are thin over them. Data access follows the Phase 1 split exactly — `sessions.ts` for browser writes, `sessions-server.ts` for server reads.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase (Postgres + Storage), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-08-tp-drills-design.md`. Where this plan and the spec disagree, the spec wins — raise it rather than improvising.

---

## How this plan differs from Phase 1's, and why

Phase 1's plan supplied complete JSX for every screen. That is where it went wrong: it listed spec §7.1's acceptance criteria and then supplied code that quietly failed three of them, and nine task reviews missed it because each compared its own diff only to its own brief.

So in this plan: **pure-logic tasks carry complete code and complete tests** — they are exactly specifiable and cheap to get exactly right. **UI tasks carry exact interfaces, exact data shapes and an explicit acceptance-criteria checklist, but not invented JSX.** The implementer writes the markup against components that already exist, and the task's verification step walks the acceptance criteria one by one. A UI task is not done when the code compiles; it is done when each criterion has been observed.

## Global Constraints

- **Palette, exact values, no others**, via CSS custom properties: `--ground` `#151515`, `--card` `#1f1f1f`, `--ink` `#f3f0ea`, `--accent` `#f15e22`. Alpha variants that already exist: `--ink-70`, `--ink-45`, `--ink-30`, `--hairline`, `--accent-border`, `--field-bg`, `--chip-bg`, `--track-bg`, `--control-border`, `--button-border`, `--checkbox-border`, `--on-mat-muted`. Add a new token rather than an inline `rgba()`.
- **Orange is rationed.** It marks only what is live, earned or actionable: the next session, the running drill, a state tag demanding action, a primary action, derived stats. Never decoration.
- **No light mode.**
- **Headline type:** Hubot Sans 800 italic uppercase, `letter-spacing: -0.035em`, `line-height: 0.92` (global `.hl` and `h1`–`h4`). **Body:** Mona Sans 500, `letter-spacing: -0.005em` (`.bd`). Small uppercase label: `.lbl`.
- **Use the shared primitives** — `Button`, `TextInput`, `TextArea`, `Field`, `Segment`, `ScreenHeader`. Never hand-roll an inline-styled button or input.
- **A drill's `library` is permanent.** Drills are never hard-deleted; only `deleted_at` is set. Sessions and session drills MAY be hard-deleted.
- **A per-drill duration override never mutates the drill's own `duration_mins`.**
- **A completed session remains fully editable** — no lock on drills, order or date after its date passes.
- **Session status is derived, never stored.** There is no `status` column and no "mark complete" button.
- **`drill_stats` is a view, never a stored counter.**
- **Tests cover logic only.** No component tests, no end-to-end tests.
- **Access control is deliberately absent** (spec §12) and signed off. New tables get the same permissive RLS posture as `drill`.
- **Never run `git push`.** `.env.local` holds real credentials — do not read, print, modify or commit it.

## Prerequisite

`supabase/migrations/0003_drop_drill_delete_policy.sql` must be applied before Task 1. Confirm with the human that it has run.

---

## What Phase 2 does NOT include

Stated so no implementer builds it speculatively:

- **No Teams UI.** Task 1 creates a minimal `team` table so `session.team_id` is a real foreign key, but nothing creates, edits or lists teams. Team creation lives in Settings, which is Phase 3.
- **Therefore no team link in the Planner.** Spec §7.4's "optional link to a team, which pre-fills library and age band" cannot work without teams to link to. `session.team_id` exists, stays null, and the Planner offers no team picker. Phase 3 adds it.
- **The Schedule shows sessions only, not fixtures.** Fixtures come from Byga sync, which is Phase 3. The Schedule's team filter chips and the `Fixture` state tag both arrive with them.
- **No JSON export.** Phase 3.

---

## File Structure

| Path | Responsibility |
|---|---|
| `supabase/migrations/0004_sessions.sql` | `team`, `session`, `session_drill`, RLS, `updated_at` trigger, `drill_stats` view |
| `src/lib/types.ts` *(modify)* | Add `Team`, `Session`, `SessionInput`, `SessionDrill`, `SessionDrillInput`, `DrillStats`, `SessionWithDrills` |
| `src/lib/session-status.ts` | `SessionStatus`, `deriveStatus`, `statusLabel`, `statusOrder`, `sortSessionsForPlanner` — **tested** |
| `src/lib/session-timing.ts` | `effectiveDuration`, `plannedMinutes`, `timingSummary` — **tested** |
| `src/lib/sessions.ts` | Browser writes: create, update, delete, add/remove/reorder drills, save reflection, duplicate |
| `src/lib/sessions-server.ts` | Server reads: list sessions, get one with drills, hub window, drill stats |
| `src/lib/drills-server.ts` *(modify)* | Replace the `countSessionsUsing` stub with a real count |
| `src/components/sessions/SessionRow.tsx` | One session or fixture as a timeline row, with its state tag |
| `src/components/sessions/StateTag.tsx` | The five state tags |
| `src/components/sessions/PlannerSessionList.tsx` | Left pane: ordered sessions plus New session |
| `src/components/sessions/SessionBuilder.tsx` | Right pane: ordered drills, overrides, running total |
| `src/components/sessions/SessionDetailsForm.tsx` | Name, date, start time, location, target minutes |
| `src/components/sessions/SessionTray.tsx` | The tray shown on Drills when arriving from the Planner |
| `src/components/sessions/ReflectionForm.tsx` | Per-drill rating and note, plus overall note |
| `src/components/drills/DrillCard.tsx` *(modify)* | Optional add-to-session affordance; `drill_stats` line |
| `src/app/page.tsx` *(modify)* | Becomes the Hub instead of redirecting to `/drills` |
| `src/app/schedule/page.tsx` | Full timeline |
| `src/app/planner/page.tsx` | Planner, optional `?session=<id>` |
| `src/app/sessions/[id]/page.tsx` | Session view — pitchside and print |
| `src/app/sessions/[id]/reflect/page.tsx` | Reflection |
| `src/app/globals.css` *(modify)* | Print stylesheet, any new tokens |

---

## Task 1: Session schema, view and types

**Files:**
- Create: `supabase/migrations/0004_sessions.sql`
- Modify: `src/lib/types.ts`

**Interfaces:**
- Consumes: `Library`, `AgeBand`, `Drill` from `@/lib/types`
- Produces: the three tables, the `drill_stats` view, and the TypeScript types every later task uses

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_sessions.sql`:

```sql
-- Phase 2. Sessions, the drills in them, and the stats derived from both.
--
-- `team` is created here ONLY so session.team_id can be a real foreign key.
-- Nothing in Phase 2 creates or reads teams; the Teams UI is Phase 3.

create table team (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  library     library     not null,
  age_band    age_band,
  byga_url    text,
  created_at  timestamptz not null default now(),

  -- Goalkeeping teams have no age band (spec 5.3, 7.6).
  constraint team_age_band_outfield_only check (
    library = 'outfield' or age_band is null
  )
);

create table session (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid references team(id) on delete set null,
  name           text        not null,
  library        library     not null,
  date           date,
  start_time     time,
  location       text,
  target_minutes int         not null default 45,
  age_band       age_band,
  session_notes  text,
  -- Set when the coach finishes (or dismisses) reflection. Status is derived
  -- from date + drill count + this column; there is no status column and no
  -- "mark complete" button (spec 7.8, 10).
  reflected_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint target_minutes_positive check (target_minutes > 0),
  constraint session_age_band_outfield_only check (
    library = 'outfield' or age_band is null
  )
);

create table session_drill (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references session(id) on delete cascade,
  -- No cascade: drills are soft-deleted, so the row must survive and the
  -- session still resolves the drill, rendered as removed (spec 9).
  drill_id          uuid not null references drill(id),
  position          int  not null,
  -- Never mutates the drill's own duration_mins (spec 7.4).
  duration_override int,
  rating            int,
  note              text,

  constraint rating_range check (rating is null or rating between 1 and 5),
  constraint duration_override_positive check (
    duration_override is null or duration_override > 0
  ),
  constraint position_non_negative check (position >= 0),
  -- Deferrable: reordering swaps positions inside one transaction and would
  -- otherwise collide mid-update.
  constraint session_drill_position_unique unique (session_id, position)
    deferrable initially deferred
);

create index session_dated_idx on session (date) where date is not null;
create index session_drill_session_idx on session_drill (session_id, position);
create index session_drill_drill_idx on session_drill (drill_id);

create trigger session_updated_at
  before update on session
  for each row execute function set_updated_at();

-- Usage and rating, derived. Never a stored counter: spec 7.4 keeps completed
-- sessions fully editable, so any counter would drift (spec 10).
-- times_used counts appearances in sessions whose date has passed.
create view drill_stats with (security_invoker = true) as
  select
    d.id as drill_id,
    count(sd.id) filter (
      where s.date is not null and s.date < current_date
    )::int as times_used,
    avg(sd.rating) filter (where sd.rating is not null) as avg_rating
  from drill d
  left join session_drill sd on sd.drill_id = d.id
  left join session s on s.id = sd.session_id
  group by d.id;

-- Same deliberate no-auth posture as drill (spec 12). Sessions, unlike drills,
-- MAY be hard-deleted: the never-delete invariant is about drills only.
alter table team enable row level security;
alter table session enable row level security;
alter table session_drill enable row level security;

drop policy if exists "public all teams" on team;
create policy "public all teams" on team
  for all using (true) with check (true);

drop policy if exists "public all sessions" on session;
create policy "public all sessions" on session
  for all using (true) with check (true);

drop policy if exists "public all session drills" on session_drill;
create policy "public all session drills" on session_drill
  for all using (true) with check (true);
```

- [ ] **Step 2: Hand the migration to the controller**

You cannot apply it — no Supabase CLI is installed and you have no dashboard access. Report that Step 2 is deferred. Do not weaken a constraint because you could not test it, and do not attempt to reach the database.

- [ ] **Step 3: Add the types**

Append to `src/lib/types.ts`:

```ts
export interface Team {
  id: string
  name: string
  library: Library
  age_band: AgeBand | null
  byga_url: string | null
  created_at: string
}

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
  reflected_at: string | null
  created_at: string
  updated_at: string
}

export type SessionInput = Omit<
  Session,
  'id' | 'created_at' | 'updated_at' | 'reflected_at'
>

export interface SessionDrill {
  id: string
  session_id: string
  drill_id: string
  position: number
  duration_override: number | null
  rating: number | null
  note: string | null
}

export type SessionDrillInput = Omit<SessionDrill, 'id'>

/** A session_drill joined to the drill it points at. */
export interface SessionDrillWithDrill extends SessionDrill {
  drill: Drill
}

export interface SessionWithDrills extends Session {
  drills: SessionDrillWithDrill[]
}

export interface DrillStats {
  drill_id: string
  times_used: number
  avg_rating: number | null
}
```

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add -A && git commit -m "feat: add session schema, drill_stats view and types"
```

Expected: typecheck clean, lint clean, 85/85 tests still passing.

---

## Task 2: Session status derivation

The single most load-bearing piece of logic in Phase 2. Every screen renders from it.

**Files:**
- Create: `src/lib/session-status.ts`, `src/lib/session-status.test.ts`

**Interfaces:**
- Consumes: `Session` from `@/lib/types`
- Produces: `SessionStatus`, `deriveStatus(session, drillCount, today)`, `statusLabel(status)`, `isActionable(status)`, `sortSessionsForPlanner(sessions, drillCounts, today)`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/session-status.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Session } from './types'
import {
  deriveStatus, isActionable, sortSessionsForPlanner, statusLabel,
} from './session-status'

const TODAY = '2026-08-11'

function session(over: Partial<Session> = {}): Session {
  return {
    id: 'a', team_id: null, name: 'Lions U10 · Session 3', library: 'outfield',
    date: '2026-08-12', start_time: '17:30:00', location: 'Hyde Park',
    target_minutes: 45, age_band: 'U9-U11', session_notes: null,
    reflected_at: null, created_at: '', updated_at: '',
    ...over,
  }
}

describe('deriveStatus', () => {
  it('is no_date when the session has no date, whatever else is true', () => {
    expect(deriveStatus(session({ date: null }), 0, TODAY)).toBe('no_date')
    expect(deriveStatus(session({ date: null }), 5, TODAY)).toBe('no_date')
    // An undated session never auto-completes, however old it is.
    expect(deriveStatus(session({ date: null, reflected_at: null }), 5, TODAY)).toBe('no_date')
  })

  it('is plan_it when dated in the future with no drills', () => {
    expect(deriveStatus(session({ date: '2026-08-12' }), 0, TODAY)).toBe('plan_it')
  })

  it('is ready when dated in the future with drills', () => {
    expect(deriveStatus(session({ date: '2026-08-12' }), 3, TODAY)).toBe('ready')
  })

  it('treats today as not yet past', () => {
    // A session happening this evening is still Ready, not Reflect.
    expect(deriveStatus(session({ date: TODAY }), 3, TODAY)).toBe('ready')
    expect(deriveStatus(session({ date: TODAY }), 0, TODAY)).toBe('plan_it')
  })

  it('is reflect once the date has passed and nothing was reflected', () => {
    expect(deriveStatus(session({ date: '2026-08-05' }), 3, TODAY)).toBe('reflect')
  })

  it('is reflect for a past session even if it had no drills', () => {
    // It still happened. Asking about it is more useful than hiding it.
    expect(deriveStatus(session({ date: '2026-08-05' }), 0, TODAY)).toBe('reflect')
  })

  it('is done once reflected', () => {
    const s = session({ date: '2026-08-05', reflected_at: '2026-08-06T09:00:00Z' })
    expect(deriveStatus(s, 3, TODAY)).toBe('done')
  })

  it('ignores reflected_at on a future session', () => {
    // Reflecting early then moving the date later should not read as done.
    const s = session({ date: '2026-08-20', reflected_at: '2026-08-06T09:00:00Z' })
    expect(deriveStatus(s, 3, TODAY)).toBe('ready')
  })
})

describe('statusLabel', () => {
  it('labels every status', () => {
    expect(statusLabel('ready')).toBe('Ready')
    expect(statusLabel('plan_it')).toBe('Plan it')
    expect(statusLabel('reflect')).toBe('Reflect')
    expect(statusLabel('no_date')).toBe('No date')
    expect(statusLabel('done')).toBe('Done')
  })
})

describe('isActionable', () => {
  it('marks the statuses that want something from the coach', () => {
    expect(isActionable('plan_it')).toBe(true)
    expect(isActionable('reflect')).toBe(true)
    expect(isActionable('ready')).toBe(false)
    expect(isActionable('done')).toBe(false)
    expect(isActionable('no_date')).toBe(false)
  })
})

describe('sortSessionsForPlanner', () => {
  // Spec 7.4: unplanned first, then planned, then past.
  const unplanned = session({ id: 'u', date: '2026-08-14' })
  const planned = session({ id: 'p', date: '2026-08-12' })
  const past = session({ id: 'x', date: '2026-08-05' })
  const undated = session({ id: 'n', date: null })
  const counts = { u: 0, p: 3, x: 3, n: 4 }

  it('puts sessions needing a plan first, then ready, then undated, then past', () => {
    const got = sortSessionsForPlanner([past, planned, undated, unplanned], counts, TODAY)
    expect(got.map((s) => s.id)).toEqual(['u', 'p', 'n', 'x'])
  })

  it('orders within a group by date, soonest first', () => {
    const soon = session({ id: 'soon', date: '2026-08-12' })
    const later = session({ id: 'later', date: '2026-08-20' })
    const got = sortSessionsForPlanner([later, soon], { soon: 0, later: 0 }, TODAY)
    expect(got.map((s) => s.id)).toEqual(['soon', 'later'])
  })

  it('orders past sessions most recent first', () => {
    const old = session({ id: 'old', date: '2026-07-01' })
    const recent = session({ id: 'recent', date: '2026-08-05' })
    const got = sortSessionsForPlanner([old, recent], { old: 3, recent: 3 }, TODAY)
    expect(got.map((s) => s.id)).toEqual(['recent', 'old'])
  })

  it('does not mutate its input', () => {
    const input = [past, planned]
    sortSessionsForPlanner(input, counts, TODAY)
    expect(input.map((s) => s.id)).toEqual(['x', 'p'])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/session-status.test.ts`
Expected: FAIL — cannot resolve `./session-status`.

- [ ] **Step 3: Implement**

Create `src/lib/session-status.ts`:

```ts
import type { Session } from './types'

/**
 * Derived, never stored. Spec 7.8: sessions auto-complete when their date
 * passes — there is no "mark complete" button to forget on a cold pitch, and
 * no session silently stuck in "planned" forever.
 */
export type SessionStatus = 'no_date' | 'plan_it' | 'ready' | 'reflect' | 'done'

const LABELS: Record<SessionStatus, string> = {
  no_date: 'No date',
  plan_it: 'Plan it',
  ready: 'Ready',
  reflect: 'Reflect',
  done: 'Done',
}

/**
 * `today` and `session.date` are both 'YYYY-MM-DD', which sorts and compares
 * correctly as a string — no Date parsing, no timezone to get wrong.
 */
export function deriveStatus(
  session: Session,
  drillCount: number,
  today: string,
): SessionStatus {
  // An undated session never auto-completes, however old (spec 11).
  if (session.date === null) return 'no_date'

  // Today is not yet past: a session happening this evening is still Ready.
  if (session.date >= today) {
    return drillCount === 0 ? 'plan_it' : 'ready'
  }

  return session.reflected_at === null ? 'reflect' : 'done'
}

export function statusLabel(status: SessionStatus): string {
  return LABELS[status]
}

/** Whether this status is asking the coach for something. */
export function isActionable(status: SessionStatus): boolean {
  return status === 'plan_it' || status === 'reflect'
}

const GROUP: Record<SessionStatus, number> = {
  plan_it: 0,   // needs a plan — most urgent
  ready: 1,     // planned and coming up
  no_date: 2,   // parked
  reflect: 3,   // behind you
  done: 4,
}

/** Spec 7.4: unplanned first, then planned, then past. */
export function sortSessionsForPlanner(
  sessions: Session[],
  drillCounts: Record<string, number>,
  today: string,
): Session[] {
  return [...sessions].sort((a, b) => {
    const sa = deriveStatus(a, drillCounts[a.id] ?? 0, today)
    const sb = deriveStatus(b, drillCounts[b.id] ?? 0, today)
    if (GROUP[sa] !== GROUP[sb]) return GROUP[sa] - GROUP[sb]

    if (a.date === null && b.date === null) return a.name.localeCompare(b.name)
    if (a.date === null) return 1
    if (b.date === null) return -1

    // Upcoming: soonest first. Behind you: most recent first.
    const behind = GROUP[sa] >= GROUP.reflect
    return behind ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
  })
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — 16 new tests, 101 total.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: derive session status from date, drills and reflection"
```

---

## Task 3: Session timing

**Files:**
- Create: `src/lib/session-timing.ts`, `src/lib/session-timing.test.ts`

**Interfaces:**
- Consumes: `Drill`, `SessionDrillWithDrill` from `@/lib/types`
- Produces: `effectiveDuration(sd)`, `plannedMinutes(drills)`, `timingSummary(drills, targetMinutes)` returning `{ planned, target, remaining, isOver }`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/session-timing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Drill, SessionDrillWithDrill } from './types'
import { effectiveDuration, plannedMinutes, timingSummary } from './session-timing'

function drill(over: Partial<Drill> = {}): Drill {
  return {
    id: 'd1', library: 'outfield', name: 'Rondo', type: 'possession_rondo',
    age_band: 'U9-U11', suitable_from: null, duration_mins: 12,
    players_min: 8, players_max: 12, goals_needed: 0, cones_needed: 0,
    bibs_needed: false, image_url: null, setup: '', how_it_works: '',
    coaching_points: ['x'], progressions: null, source: null, tags: [],
    is_draft: false, deleted_at: null, created_at: '', updated_at: '',
    ...over,
  }
}

function sd(over: Partial<SessionDrillWithDrill> = {}): SessionDrillWithDrill {
  return {
    id: 'sd1', session_id: 's1', drill_id: 'd1', position: 0,
    duration_override: null, rating: null, note: null, drill: drill(),
    ...over,
  }
}

describe('effectiveDuration', () => {
  it("uses the drill's own duration when there is no override", () => {
    expect(effectiveDuration(sd())).toBe(12)
  })

  it('prefers the override when one is set', () => {
    expect(effectiveDuration(sd({ duration_override: 20 }))).toBe(20)
  })

  it('never mutates the drill it read from', () => {
    const item = sd({ duration_override: 20 })
    effectiveDuration(item)
    expect(item.drill.duration_mins).toBe(12)
  })

  it('is 0 when a draft drill has no duration and no override', () => {
    expect(effectiveDuration(sd({ drill: drill({ duration_mins: null }) }))).toBe(0)
  })

  it('uses the override even when the drill has no duration of its own', () => {
    const item = sd({ duration_override: 9, drill: drill({ duration_mins: null }) })
    expect(effectiveDuration(item)).toBe(9)
  })
})

describe('plannedMinutes', () => {
  it('sums effective durations', () => {
    expect(plannedMinutes([sd(), sd({ id: 'sd2', duration_override: 8 })])).toBe(20)
  })

  it('is 0 for an empty session', () => {
    expect(plannedMinutes([])).toBe(0)
  })
})

describe('timingSummary', () => {
  it('reports remaining time against the target', () => {
    expect(timingSummary([sd()], 45)).toEqual({
      planned: 12, target: 45, remaining: 33, isOver: false,
    })
  })

  it('flags going over and reports the overshoot as a negative remainder', () => {
    const items = [sd({ duration_override: 30 }), sd({ id: 'b', duration_override: 25 })]
    expect(timingSummary(items, 45)).toEqual({
      planned: 55, target: 45, remaining: -10, isOver: true,
    })
  })

  it('does not flag exactly hitting the target', () => {
    expect(timingSummary([sd({ duration_override: 45 })], 45).isOver).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/session-timing.test.ts`
Expected: FAIL — cannot resolve `./session-timing`.

- [ ] **Step 3: Implement**

Create `src/lib/session-timing.ts`:

```ts
import type { SessionDrillWithDrill } from './types'

/**
 * Spec 7.4: a per-drill override never mutates the drill's own default. This
 * function is the only place that resolves which duration applies.
 */
export function effectiveDuration(item: SessionDrillWithDrill): number {
  if (item.duration_override !== null) return item.duration_override
  return item.drill.duration_mins ?? 0
}

export function plannedMinutes(items: SessionDrillWithDrill[]): number {
  return items.reduce((total, item) => total + effectiveDuration(item), 0)
}

export interface TimingSummary {
  planned: number
  target: number
  /** Negative when the session runs over. */
  remaining: number
  isOver: boolean
}

export function timingSummary(
  items: SessionDrillWithDrill[],
  target: number,
): TimingSummary {
  const planned = plannedMinutes(items)
  return { planned, target, remaining: target - planned, isOver: planned > target }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — 11 new tests, 112 total.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add session timing with non-mutating duration overrides"
```

---

## Task 4: Session data access

**Files:**
- Create: `src/lib/sessions.ts`, `src/lib/sessions-server.ts`
- Modify: `src/lib/drills-server.ts`

**Interfaces:**
- Consumes: `createBrowserClient` from `@/lib/supabase/client`, `createServerClient` from `@/lib/supabase/server`, types from `@/lib/types`
- Produces:
  - Server (`@/lib/sessions-server`): `listSessions()`, `getSession(id)`, `listSessionsInWindow(fromISO, toISO)`, `drillCountsBySession()`, `listDrillStats()`
  - Browser (`@/lib/sessions.ts`): `createSession(input)`, `updateSession(id, patch)`, `deleteSession(id)`, `addDrillToSession(sessionId, drillId)`, `removeSessionDrill(sessionDrillId)`, `reorderSessionDrills(sessionId, orderedIds)`, `setDurationOverride(sessionDrillId, mins)`, `saveReflection(sessionId, entries, sessionNotes)`, `duplicateSession(sessionId, name)`
  - `countSessionsUsing(drillId)` in `drills-server.ts` becomes a real count

**Follow the Phase 1 split exactly.** `sessions-server.ts` uses `createServerClient` (which awaits `next/headers`) and may only be imported by server components. `sessions.ts` uses `createBrowserClient` and may only be imported by client components. Mixing them breaks the build — this is why `drills.ts` and `drills-server.ts` are separate.

Every function throws on error with a message naming the operation, exactly as `drills.ts` does. No retries, no swallowed errors, no silent defaults.

- [ ] **Step 1: Implement the server reads**

Create `src/lib/sessions-server.ts` with `listSessions`, `getSession`, `listSessionsInWindow`, `drillCountsBySession` and `listDrillStats`.

Requirements:
- `getSession(id): Promise<SessionWithDrills | null>` selects the session and its `session_drill` rows joined to the full drill, ordered by `position` ascending. The drill join must NOT filter `deleted_at` — a soft-deleted drill still belongs to a past session (spec 9).
- `listSessionsInWindow(fromISO, toISO)` returns dated sessions within an inclusive date range, ordered by date then `start_time`, nulls last.
- `drillCountsBySession(): Promise<Record<string, number>>` returns one count per session id, for `deriveStatus` and `sortSessionsForPlanner`.
- `listDrillStats(): Promise<Record<string, DrillStats>>` reads the `drill_stats` view keyed by `drill_id`.

- [ ] **Step 2: Implement the browser writes**

Create `src/lib/sessions.ts`.

Requirements worth stating because they are easy to get wrong:
- `addDrillToSession` appends at `position = (current max position) + 1`, or 0 for the first drill. Never assume the caller knows the position.
- `reorderSessionDrills(sessionId, orderedIds)` writes new positions for every row in one call. The unique constraint is deferrable, so a single batched update inside one statement is safe; sequential individual updates are not.
- `duplicateSession(sessionId, name)` copies the session's `target_minutes`, `library` and `age_band` and every `session_drill` row's `drill_id`, `position` and `duration_override`. It must NOT copy `date`, `start_time`, `location`, `reflected_at`, `session_notes`, or any `rating`/`note` — a duplicate is a starting point, not a record of something that happened.
- `saveReflection(sessionId, entries, sessionNotes)` where `entries: { sessionDrillId: string; rating: number | null; note: string | null }[]` writes the per-drill ratings and notes, sets `session_notes`, and sets `reflected_at` to now. Reflection is skippable, so it must work with every rating null.

- [ ] **Step 3: Replace the `countSessionsUsing` stub**

In `src/lib/drills-server.ts`, replace the Phase 1 stub body with a real count of `session_drill` rows referencing that drill. Keep the exported signature `(drillId: string): Promise<number>` unchanged — `DeleteDrillDialog` already calls it and must not need editing. Remove the "Phase 1 has no session table yet" comment and replace it with what it now does.

- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm test
git add -A && git commit -m "feat: add session data access and a real countSessionsUsing"
```

No new tests: this module is all I/O, and a test that mocks the Supabase client and asserts the mock was called verifies nothing (spec §13).

---

## Task 5: State tags and session rows

Small, shared, and used by three later screens. Build it once here.

**Files:**
- Create: `src/components/sessions/StateTag.tsx`, `src/components/sessions/SessionRow.tsx`

**Interfaces:**
- Consumes: `SessionStatus`, `statusLabel` from `@/lib/session-status`
- Produces:
  - `<StateTag status={SessionStatus} />`
  - `<SessionRow session={Session} status={SessionStatus} drillCount={number} plannedMinutes?={number} href={string} dimmed?={boolean} />`

**Treatment, from spec §8** — five tags, and the tag IS the call to action:

| Status | Treatment |
|---|---|
| `ready` | Solid `--accent` background, `--ground` text |
| `plan_it` | Transparent, `--accent-border` outline, `--accent` text |
| `reflect` | `rgba` accent tint background, `--accent` text — add a token, do not inline it |
| `done` | `--track-bg`, `--ink-45` text — recedes |
| `no_date` | `--track-bg`, `--ink-30` text — recedes further |

`SessionRow` renders: a date block on the left (day number in headline type, weekday beneath in `.lbl`; an em dash for an undated session), the session name as a heading, a metadata line (start time, location, duration, drill count — omitting whatever is null rather than printing "null" or an empty separator), and the state tag on the right. `dimmed` reduces contrast for rows in the past.

- [ ] **Step 1: Build both components**

Use existing tokens and the global type classes. No inline `rgba()` — add a token to `globals.css` if you need one.

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add session state tags and timeline rows"
```

---

## Task 6: Planner — session list and creation

**Files:**
- Create: `src/components/sessions/PlannerSessionList.tsx`, `src/components/sessions/SessionDetailsForm.tsx`, `src/app/planner/page.tsx`

**Interfaces:**
- Consumes: `sortSessionsForPlanner`, `deriveStatus` from `@/lib/session-status`; `listSessions`, `drillCountsBySession` from `@/lib/sessions-server`; `createSession`, `updateSession`, `deleteSession`, `duplicateSession` from `@/lib/sessions`; `Button`, `TextInput`, `Field`, `Segment`, `ScreenHeader`
- Produces: the `/planner` route accepting `?session=<id>`; `<PlannerSessionList>` and `<SessionDetailsForm>` for Task 7 to compose with

**Acceptance criteria — verify each by hand and report what you observed:**

1. `/planner` lists sessions in spec §7.4 order: needing a plan first, then ready, then undated, then past.
2. **`+ New session` is pinned at the top of the list**, so creating and continuing are the same motion (spec §6.2, §7.4).
3. Creating a session asks for a name and a library and nothing else; date, time, location and target minutes are all editable afterwards and all optional except the name.
4. A session with no date is valid and appears under a "Not scheduled" heading (spec §11).
5. Selecting a session puts its id in the URL as `?session=<id>`, so the browser back button and a refresh both work.
6. `Duplicate` creates a copy with no date and no reflection data, and selects it.
7. Deleting a session asks for confirmation naming the session, and says how many drills it contains.
8. **A past session is fully editable** — its name, date and details all change freely (spec §7.4). Nothing is locked.
9. On a phone the list and the builder are one at a time, not side by side.

`SessionDetailsForm` covers name, date, start time, location and target minutes. There is no team picker — teams are Phase 3 (see "What Phase 2 does NOT include").

- [ ] **Step 1: Build the list, the details form and the route**
- [ ] **Step 2: Verify by hand**

Run `npm run dev`. Walk all nine criteria above and record what you actually saw for each. A criterion is not met because the code looks right; it is met because you observed it.

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
git add -A && git commit -m "feat: add planner session list and session creation"
```

---

## Task 7: Planner — the builder

**Files:**
- Create: `src/components/sessions/SessionBuilder.tsx`
- Modify: `src/app/planner/page.tsx`

**Interfaces:**
- Consumes: `getSession` from `@/lib/sessions-server`; `addDrillToSession`, `removeSessionDrill`, `reorderSessionDrills`, `setDurationOverride` from `@/lib/sessions`; `timingSummary`, `effectiveDuration` from `@/lib/session-timing`
- Produces: `<SessionBuilder session={SessionWithDrills} />`

**Acceptance criteria — verify each by hand and report what you observed:**

1. Drills appear in `position` order.
2. Reordering works by up/down controls at minimum. Drag is optional; if you implement drag, up/down must still work — a wet finger on a cold touchline does not drag reliably.
3. **A per-drill duration override never changes the drill's own `duration_mins`.** Verify in the database, not just the UI: override a drill in a session, then confirm the drill's own duration is unchanged.
4. The running total shows planned minutes against the target and **warns when over** (spec §7.4). Verify the warning appears by pushing a session past its target.
5. Removing a drill from a session leaves the drill in the library untouched.
6. An empty session says so and offers a route to the library to add drills.
7. The same drill can appear twice in one session — a warm-up revisited later is legitimate; nothing should prevent it.
8. Clicking a drill in the builder opens that drill's detail page, and coming back returns to the same session.

- [ ] **Step 1: Build the builder and wire it into the route**
- [ ] **Step 2: Verify by hand, including the database check in criterion 3**
- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
git add -A && git commit -m "feat: add session builder with reordering and running time"
```

---

## Task 8: The session tray on Drills

**Files:**
- Create: `src/components/sessions/SessionTray.tsx`
- Modify: `src/components/drills/DrillsBrowser.tsx`, `src/components/drills/DrillCard.tsx`, `src/components/drills/DrillGrid.tsx`, `src/app/drills/page.tsx`, `src/lib/drill-query.ts`

**Interfaces:**
- Consumes: `getSession` from `@/lib/sessions-server`; `addDrillToSession`, `removeSessionDrill` from `@/lib/sessions`; `timingSummary` from `@/lib/session-timing`
- Produces: `<SessionTray session={SessionWithDrills} />`; `DrillCard` gains optional `onAdd?: () => void` and `added?: boolean`

**The tray is conditional.** Spec §7.4: it appears only when you arrived at Drills from the Planner. Arriving any other way, the tray, the bottom dock and the per-card `+` are all absent — the library must not permanently wear session-builder furniture.

Carry the session id in the URL, alongside the existing browse state. `drill-query.ts` already parses and serialises that state and already round-trips a `back` param; extend it rather than inventing a second mechanism, and unit-test the addition — it is pure logic.

**Acceptance criteria — verify each by hand and report what you observed:**

1. From the Planner, "add a drill from the library" reaches `/drills` with the tray showing the session, its drills and its running time.
2. Each card shows a `+`; clicking it adds that drill and the card marks as added without a page reload.
3. Visiting `/drills` directly shows **no tray, no dock and no `+` on any card**.
4. All Phase 1 behaviour still works with a tray present: filtering, the segment resetting to Outfield on a fresh visit, filter state surviving a trip into a drill and back, individually clearable filter chips, the draft banner.
5. On a phone the tray is a docked bar at the bottom, not a right rail.
6. "Back to planner" from the tray returns to the same session.
7. **A draft drill cannot be added to a session** (spec §7.2). Its `+` is absent or disabled, and the reason is visible.

- [ ] **Step 1: Extend `drill-query.ts` with the session param, with tests**
- [ ] **Step 2: Build the tray and wire the card affordance**
- [ ] **Step 3: Verify by hand, including all of criterion 4**
- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
git add -A && git commit -m "feat: add the session tray to the drills screen"
```

---

## Task 9: The session view — pitchside and print

**Files:**
- Create: `src/app/sessions/[id]/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `getSession` from `@/lib/sessions-server`; `effectiveDuration`, `timingSummary` from `@/lib/session-timing`; `deriveStatus` from `@/lib/session-status`

**This is the pitchside artefact.** Spec §4: there is no pitchside *mode* — this screen IS pitchside, built that way on every device. Large type, minimal chrome, high contrast, readable in daylight with one cold hand. Spec §7.9 makes it one component with a print stylesheet, not a separate print screen.

**Acceptance criteria — verify each by hand and report what you observed:**

1. Every drill shows its name, its effective duration, its setup and **all its coaching points** — coaching points are the reason the session exists and are never collapsed here.
2. Type is substantially larger than on planning screens, and touch targets are large.
3. `window.print()` (or the browser's print preview) produces a clean single-page layout: high contrast, no navigation, no buttons, nothing clipped. Check the preview, do not assume.
4. A soft-deleted drill still renders, marked as removed from the library (spec §9).
5. A drill whose photo exists shows it; the cream mat treatment is consistent with the rest of the app.
6. The session's date, start time and location appear if set, and are omitted cleanly if not.
7. A past session that has not been reflected on offers a route to the reflection screen.

The "running drill marked in orange" from the spec's mockups needs client state to track which drill is current. Implement it as a tap-to-mark-current affordance — no timer, no automatic advance (spec §3 rules out an in-session timer).

- [ ] **Step 1: Build the session view and the print stylesheet**
- [ ] **Step 2: Verify by hand, including the print preview**
- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
git add -A && git commit -m "feat: add the pitchside session view with a print stylesheet"
```

---

## Task 10: Reflection

**Files:**
- Create: `src/components/sessions/ReflectionForm.tsx`, `src/app/sessions/[id]/reflect/page.tsx`

**Interfaces:**
- Consumes: `getSession` from `@/lib/sessions-server`; `saveReflection` from `@/lib/sessions`
- Produces: the `/sessions/[id]/reflect` route

**Acceptance criteria — verify each by hand and report what you observed:**

1. Every drill in the session can be rated 1–5 and given a note; the session gets one overall note (spec §7.8).
2. **Reflection is skippable.** Saving with nothing filled in is valid, sets `reflected_at`, and clears the Reflect tag. Verify the tag actually clears.
3. Re-opening a reflected session shows the ratings and notes previously entered, and they can be changed. Spec §7.4 keeps completed sessions fully editable — that includes their reflection.
4. Saving a rating makes it visible on the drill's own detail page and in its `drill_stats`. Verify end to end, since this is the loop that makes the library improve.
5. Reflecting on a session whose date has not passed is not offered — the Reflect state only exists behind you.

- [ ] **Step 1: Build the reflection form and route**
- [ ] **Step 2: Verify by hand, including criterion 4 end to end**
- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
git add -A && git commit -m "feat: add post-session reflection"
```

---

## Task 11: The Hub

**Files:**
- Modify: `src/app/page.tsx`, `src/components/ui/ScreenHeader.tsx`

**Interfaces:**
- Consumes: `listSessionsInWindow`, `drillCountsBySession` from `@/lib/sessions-server`; `listDrills` from `@/lib/drills-server`; `deriveStatus` from `@/lib/session-status`; `<SessionRow>`, `<StateTag>`

**The front door changes here.** `/` currently redirects to `/drills`; it becomes the Hub. This is the deliberate shape-change spec §14 warned about.

**Acceptance criteria — verify each by hand and report what you observed:**

1. The Hub opens on **"Coaching"** and today's date, then the next few days: dated sessions in chronological order, each with its state tag, with a today marker (spec §6.2).
2. `Full schedule →` opens `/schedule`.
3. Two door cards: **Drills** with per-library counts, and **Planner** with a live count of sessions in `plan_it` state. That count is how the Hub surfaces outstanding work — there is no separate "needs attention" section (spec §6.2, and the explicit decision to strip it).
4. Tapping a session row opens that session; the `Full schedule →` link opens the schedule. Two distinct targets.
5. **Empty state:** with no sessions at all, the Hub shows the two doors and explains that planning a session puts it here. No fake sample data (spec §11).
6. Every screen now has a route home. `ScreenHeader` gains a hub target where Phase 1 left `backHref` absent — the Drills screen is no longer the front door.
7. `/drills` still works when visited directly, with all its Phase 1 behaviour intact.

- [ ] **Step 1: Build the Hub and update `ScreenHeader` usage**
- [ ] **Step 2: Verify by hand, including the empty state**
- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
git add -A && git commit -m "feat: make the hub the front door"
```

---

## Task 12: The Schedule, and stats on Phase 1 screens

**Files:**
- Create: `src/app/schedule/page.tsx`
- Modify: `src/components/drills/DrillCard.tsx`, `src/app/drills/[id]/page.tsx`, `src/app/drills/page.tsx`

**Interfaces:**
- Consumes: `listSessions`, `drillCountsBySession`, `listDrillStats` from `@/lib/sessions-server`; `deriveStatus`, `sortSessionsForPlanner`; `<SessionRow>`

**Acceptance criteria — verify each by hand and report what you observed:**

1. `/schedule` shows the full timeline: past above, upcoming below, anchored on today with a visible marker. Past rows are dimmed; upcoming rows are full contrast (spec §6.2's timeline treatment).
2. Undated sessions appear under "Not scheduled" at the bottom.
3. Each row carries its state tag, and the tag is the call to action: `Reflect` goes to reflection, `Plan it` goes to the planner, `Ready` goes to the session view.
4. **Drill cards show derived stats** — times used and average rating from `drill_stats`, not from any stored column. A never-used drill says so rather than showing a zero and a blank star.
5. **The drill detail page shows the drill's reflection history**: every past rating and note, with the session it came from and its date (spec §6.3).
6. Deleting a drill used in a session now names the real count, because `countSessionsUsing` returns it. Verify the dialog says "used in 1 session" rather than "not used in any session".
7. The `drill_stats` numbers are correct after editing a completed session — change a rating, and the drill's average changes. This is the whole reason stats are a view rather than a counter (spec §10).

**No team filter chips.** Spec §6.2's team filtering needs teams, which are Phase 3.

- [ ] **Step 1: Build the schedule**
- [ ] **Step 2: Surface stats on the card and reflection history on the detail page**
- [ ] **Step 3: Verify by hand, especially criteria 6 and 7**
- [ ] **Step 4: Verify and commit**

```bash
npx tsc --noEmit && npm run lint && npm run build && npm test
git add -A && git commit -m "feat: add the schedule and surface derived drill stats"
```

---

## Self-review

**Spec coverage.** Every Phase 2 item in spec §14 maps to a task: Planner sessions list and builder → 6, 7; session tray → 8; session view pitchside and print → 9; auto-completion → 2 (derived, no UI needed); reflection → 10; `drill_stats` view → 1, surfaced in 12; hub → 11; schedule → 12. Supporting: schema → 1, status logic → 2, timing logic → 3, data access → 4, shared tag and row components → 5.

Spec requirements deliberately deferred to Phase 3, each stated in "What Phase 2 does NOT include": the Planner's team link (§7.4), the Schedule's team filter and fixtures (§6.2, §7.6, §7.7), Teams and Settings, JSON export.

**Placeholders.** None. The pure-logic tasks carry complete code and complete tests. The UI tasks deliberately carry acceptance criteria and interfaces rather than invented JSX — see "How this plan differs from Phase 1's" for why that is a decision, not an omission.

**Type consistency.** `Session`, `SessionInput`, `SessionDrill`, `SessionDrillWithDrill`, `SessionWithDrills`, `DrillStats` and `Team` are defined once in Task 1 and used unchanged. `SessionStatus`, `deriveStatus`, `statusLabel`, `isActionable` and `sortSessionsForPlanner` originate in Task 2 and are consumed identically in 5, 6, 11 and 12. `effectiveDuration`, `plannedMinutes` and `timingSummary` originate in Task 3 and are consumed in 7, 8 and 9. `countSessionsUsing(drillId: string): Promise<number>` keeps the Phase 1 signature so `DeleteDrillDialog` needs no edit.

**Known risks recorded deliberately.**
- `deriveStatus` compares `'YYYY-MM-DD'` strings against a `today` string. This is correct and timezone-free, but `today` must be computed once per request from the coach's local date, not from a UTC timestamp — a session at 17:30 must not read as past because a server is ahead.
- `reorderSessionDrills` relies on the deferrable unique constraint. Sequential single-row updates will collide; the batched write is required.
- Task 8 modifies `DrillsBrowser`, the most heavily-reviewed file in Phase 1. Its acceptance criterion 4 exists to catch regressions in behaviour that took a whole-branch review to get right the first time.
