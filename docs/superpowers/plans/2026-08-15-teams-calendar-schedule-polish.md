# Teams, BYGA Calendar Import, and Schedule Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach choose a team's color at creation, import BYGA fixtures from an ICS calendar feed into real sessions via a manual "Sync now" action, jump straight to the next scheduled day from an empty day view, and fix the Sessions page's sidebar divider so it reaches the bottom of the screen on desktop.

**Architecture:** Two additive migrations (`team.color`, `session.external_uid` + a dedup index). A new pure mapping module (`src/lib/ics-import.ts`) turns a parsed ICS `VEVENT` into a `SessionInput`, independently testable. A new Next.js Route Handler does the actual fetch-and-parse server-side (avoiding CORS) using the `node-ical` library, reusing the existing anon-key Supabase client pattern (`createServerClient`) since this app has no auth/RLS write restrictions. `team-colors.ts`'s resolution logic gains a "chosen color wins, index-based cycling is the fallback" rule with no changes needed at most call sites (they already consume its output, not its internals).

**Tech Stack:** Next.js 15 (App Router, Route Handlers), Supabase (existing anon-key client pattern, no service role), `node-ical` (new dependency) for ICS parsing.

## Global Constraints

- No auth in this app — Route Handlers use the same anon-key `createServerClient()`/`createBrowserClient()` pattern already used everywhere, no service role key.
- Dark theme tokens from `src/app/globals.css` for all new UI.
- No component test suite — new pure functions (`ics-import.ts`, `team-colors.ts` additions, the "next session date" query) get `vitest` unit tests per existing convention (`src/lib/*.test.ts`); UI wiring is manual QA only.
- Sync is manual-only (a "Sync now" button) — no background jobs, no cron.
- Sync only ever creates new sessions for event UIDs it hasn't seen before for that team; it never updates an existing imported session, even if the source event changed upstream.
- A team's `color` is `null` for pre-existing teams (additive migration, no backfill) — `null` means "resolve via the existing index-based `teamColor(index)` cycling," not "no color."

---

### Task 1: Team color — migration, picker, resolution

**Files:**
- Create: `supabase/migrations/0010_team_color.sql`
- Modify: `src/lib/types.ts` (add `color` to `Team`)
- Modify: `src/lib/team-colors.ts` (export `TEAM_COLORS`, add `suggestedTeamColor`, change `teamColorMap`'s resolution)
- Modify: `src/lib/team-colors.test.ts` (cover the new resolution behavior)
- Modify: `src/components/teams/TeamForm.tsx` (color picker)
- Modify: `src/components/sessions/ScheduleSidebar.tsx` (use the map instead of raw index)

**Interfaces:**
- Consumes: nothing new outside this task.
- Produces: `Team.color: string | null`; `TEAM_COLORS: readonly string[]` (exported, was module-private); `suggestedTeamColor(existingColors: (string | null)[]): string`; `teamColorMap(teams: { id: string; color?: string | null }[]): Map<string, string>` (signature widened, backward compatible — existing callers passing bare `{id}[]` still work since `color` is optional and `undefined ?? fallback` behaves the same as before).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0010_team_color.sql
-- A coach can now choose a team's color instead of it always being derived
-- from list position (design doc, 2026-08-15). Additive, no backfill: an
-- existing team's `color` stays null, which the app already treats as
-- "fall back to the index-based cycling every team used before this."

alter table team
  add column color text;
```

- [ ] **Step 2: Add `color` to the `Team` type**

In `src/lib/types.ts`, find the `Team` interface (currently starts `export interface Team {`) and add `color: string | null` after `age_band`:

```ts
export interface Team {
  id: string
  name: string
  library: Library
  age_band: AgeBand | null
  color: string | null
  byga_url: string | null
  calendar_url: string | null
  calendar_synced_at: string | null
  created_at: string
}
```

- [ ] **Step 3: Update `team-colors.ts`**

Replace the full contents of `src/lib/team-colors.ts` with:

```ts
/**
 * A small fixed palette for team color-coding across the Schedule (sidebar
 * key, session rows, month dots) — index-based by default, so a team with
 * no explicit `color` keeps the same color for as long as the team list's
 * order is stable (`listTeams` orders by name, so it only reshuffles if a
 * team is renamed). A team can also have an explicit `color` chosen at
 * creation (design doc, 2026-08-15), which always wins over the index.
 */
export const TEAM_COLORS = [
  '#39d97a', // accent green
  '#5ea1ff', // blue
  '#ff9f5e', // orange
  '#c792ea', // purple
  '#ff6e6e', // coral
  '#f0d264', // yellow
  '#4dd0e1', // teal
  '#ff8fc7', // pink
] as const

/** Cycles through the palette once there are more teams than colors. */
export function teamColor(index: number): string {
  return TEAM_COLORS[index % TEAM_COLORS.length]
}

/**
 * Maps every team's id to its color, in one pass. Each team's own `color`
 * wins if set; otherwise falls back to its position in the list. The
 * sidebar key and every colored dot/bar share this same map so a team's
 * color is consistent everywhere on the screen.
 */
export function teamColorMap(teams: { id: string; color?: string | null }[]): Map<string, string> {
  const map = new Map<string, string>()
  teams.forEach((team, i) => map.set(team.id, team.color ?? teamColor(i)))
  return map
}

/**
 * A sensible default to pre-select in the team-creation color picker: the
 * first palette color not already used by an existing team's explicit
 * `color`, or the first color if every palette entry is already taken.
 * Purely a suggestion — the coach can pick any swatch instead.
 */
export function suggestedTeamColor(existingColors: (string | null)[]): string {
  const used = new Set(existingColors.filter((c): c is string => c !== null))
  return TEAM_COLORS.find((c) => !used.has(c)) ?? TEAM_COLORS[0]
}
```

- [ ] **Step 4: Extend `team-colors.test.ts`**

Add these tests to the end of the existing `describe('teamColorMap', ...)` block in `src/lib/team-colors.test.ts` (keep the existing tests as-is):

```ts
  it('a team with an explicit color uses it instead of its index', () => {
    const map = teamColorMap([{ id: 'a', color: '#ffffff' }, { id: 'b', color: null }])
    expect(map.get('a')).toBe('#ffffff')
    expect(map.get('b')).toBe(teamColor(1))
  })
```

And add a new top-level `describe` block for the new function:

```ts
describe('suggestedTeamColor', () => {
  it('suggests the first unused palette color', () => {
    expect(suggestedTeamColor([TEAM_COLORS[0], TEAM_COLORS[1]])).toBe(TEAM_COLORS[2])
  })

  it('suggests the first color when nothing is used yet', () => {
    expect(suggestedTeamColor([])).toBe(TEAM_COLORS[0])
  })

  it('ignores nulls', () => {
    expect(suggestedTeamColor([null, null])).toBe(TEAM_COLORS[0])
  })

  it('falls back to the first color once every palette color is taken', () => {
    expect(suggestedTeamColor([...TEAM_COLORS])).toBe(TEAM_COLORS[0])
  })
})
```

Update the file's import line to include the new names: `import { TEAM_COLORS, suggestedTeamColor, teamColor, teamColorMap } from './team-colors'`.

- [ ] **Step 5: Run the new tests**

Run: `npx vitest run src/lib/team-colors.test.ts`
Expected: all tests pass, including the four new ones.

- [ ] **Step 6: Add the color picker to `TeamForm.tsx`**

Replace the full contents of `src/components/teams/TeamForm.tsx` with:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createTeam } from '@/lib/teams'
import { AGE_BANDS } from '@/lib/taxonomy'
import { TEAM_COLORS, suggestedTeamColor } from '@/lib/team-colors'
import type { AgeBand, Library, Team } from '@/lib/types'

export function TeamForm({ existingTeams }: { existingTeams: Team[] }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [library, setLibrary] = useState<Library>('outfield')
  const [ageBand, setAgeBand] = useState<AgeBand | ''>('')
  const [color, setColor] = useState(() => suggestedTeamColor(existingTeams.map((t) => t.color)))
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const team = await createTeam({
        name,
        library,
        age_band: library === 'outfield' && ageBand !== '' ? ageBand : null,
        color,
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

      <div>
        <div className="lbl" style={{ marginBottom: 4 }}>Color</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TEAM_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              style={{
                width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
                border: color === c ? '2px solid var(--ink)' : '1px solid var(--hairline)',
                background: c,
              }}
            />
          ))}
        </div>
      </div>

      <button type="submit" disabled={saving || name.trim() === ''} className="header-cta" style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Creating…' : 'Create team'}
      </button>
    </form>
  )
}
```

- [ ] **Step 7: Pass `existingTeams` from the page that renders `TeamForm`**

Replace the full contents of `src/app/teams/new/page.tsx` with:

```tsx
import Link from 'next/link'
import { TeamForm } from '@/components/teams/TeamForm'
import { listTeams } from '@/lib/sessions-server'

export const dynamic = 'force-dynamic'

export default async function NewTeamPage() {
  const teams = await listTeams()

  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      <h1 style={{ fontSize: 20, marginTop: 10, marginBottom: 16 }}>New team</h1>
      <TeamForm existingTeams={teams} />
    </main>
  )
}
```

- [ ] **Step 8: Update `ScheduleSidebar.tsx` to use the resolution-aware map**

In `src/components/sessions/ScheduleSidebar.tsx`, change the import from `import { teamColor } from '@/lib/team-colors'` to `import { teamColorMap } from '@/lib/team-colors'`, add `const colors = teamColorMap(teams)` near the top of the component body (after the `teamHref` definition), and change the swatch line from:

```tsx
              <span className="team-swatch" style={{ background: teamColor(i) }} aria-hidden="true" />
```

to:

```tsx
              <span className="team-swatch" style={{ background: colors.get(team.id) }} aria-hidden="true" />
```

The `.map((team, i) => ...)` callback's `i` parameter becomes unused after this change — remove it from the parameter list (`.map((team) => ...)`) since an unused parameter would otherwise be dead code.

- [ ] **Step 9: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Manual check**

Run: `npm run dev`, visit `/teams/new`. Confirm: a color picker with 8 swatches appears, one pre-selected (the first color not used by any existing team), clicking a different swatch changes the selection (ring border moves), creating a team saves the chosen color. Visit `/sessions` and confirm the new team's sidebar swatch matches the color you picked, not an arbitrary index-based one.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/0010_team_color.sql src/lib/types.ts src/lib/team-colors.ts src/lib/team-colors.test.ts src/components/teams/TeamForm.tsx src/components/sessions/ScheduleSidebar.tsx src/app/teams/new/page.tsx
git commit -m "feat: let a coach choose a team's color at creation"
```

---

### Task 2: `session.external_uid` migration and ICS-to-session mapping

**Files:**
- Create: `supabase/migrations/0011_session_external_uid.sql`
- Modify: `src/lib/types.ts` (add `external_uid` to `Session`)
- Create: `src/lib/ics-import.ts`
- Create: `src/lib/ics-import.test.ts`
- Modify: `package.json` (add `node-ical` dependency)

**Interfaces:**
- Consumes: `Team`, `SessionInput` from `src/lib/types.ts`.
- Produces: `mapIcsEventToSessionInput(event: VEvent, team: Team): SessionInput` — consumed by Task 3's Route Handler.

- [ ] **Step 1: Install `node-ical`**

Run: `npm install node-ical@^0.27.1`
Expected: `package.json`/`package-lock.json` updated, no install errors.

- [ ] **Step 2: Write the migration**

```sql
-- supabase/migrations/0011_session_external_uid.sql
-- Lets a session remember which BYGA calendar event created it, so a
-- repeat "Sync now" never imports the same fixture twice (design doc,
-- 2026-08-15). The partial unique index only applies to imported sessions
-- (external_uid is null for every manually-created one) and further
-- guards against a double-import race between two syncs firing close
-- together for the same team.

alter table session
  add column external_uid text;

create unique index session_team_external_uid_idx
  on session (team_id, external_uid)
  where external_uid is not null;
```

- [ ] **Step 3: Add `external_uid` to the `Session` type**

In `src/lib/types.ts`, find the `Session` interface and add `external_uid: string | null` — put it right after `themes: DrillType[]`:

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
  external_uid: string | null
  reflected_at: string | null
  created_at: string
  updated_at: string
}
```

(`SessionInput` is `Omit<Session, 'id' | 'created_at' | 'updated_at' | 'reflected_at'>` — it picks up `external_uid` automatically, no separate change needed there.)

- [ ] **Step 4: Write `src/lib/ics-import.ts`**

```ts
// src/lib/ics-import.ts
import type { VEvent } from 'node-ical'
import type { SessionInput, Team } from './types'

const DEFAULT_TARGET_MINUTES = 60

/** node-ical returns some string fields as either a plain string or a
    `{ val, params }` object when the ICS property has parameters (e.g.
    `LOCATION;LANGUAGE=en:Pitch 3`) — this unwraps either shape to a plain
    string, or null if the field wasn't present at all. */
function unwrapText(value: string | { val: string } | undefined): string | null {
  if (value === undefined) return null
  return typeof value === 'string' ? value : value.val
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function isoTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`
}

/**
 * Turns one parsed ICS VEVENT into the shape `createSession` needs, for a
 * given team (design doc, 2026-08-15 — BYGA calendar import). Pure and
 * synchronous: no network, no Supabase — the caller (the sync Route
 * Handler) is responsible for fetching/parsing the feed and for persisting
 * the result. `event.uid` becomes `external_uid`, the field a repeat sync
 * uses to skip fixtures it has already imported.
 *
 * Timezone note: node-ical resolves each event's start/end to a native
 * `Date`; this reads its local (server) time-of-day components rather than
 * doing explicit timezone conversion, matching the level of timezone
 * handling already present elsewhere in this codebase (plain ISO date
 * strings throughout, no per-user timezone concept).
 */
export function mapIcsEventToSessionInput(event: VEvent, team: Team): SessionInput {
  const start = event.start
  const end = event.end
  const isAllDay = event.datetype === 'date'

  const rawMinutes = end ? Math.round((end.getTime() - start.getTime()) / 60000) : DEFAULT_TARGET_MINUTES
  const targetMinutes = rawMinutes > 0 ? rawMinutes : DEFAULT_TARGET_MINUTES

  return {
    team_id: team.id,
    name: unwrapText(event.summary) ?? team.name,
    library: team.library,
    date: isoDate(start),
    start_time: isAllDay ? null : isoTime(start),
    location: unwrapText(event.location),
    target_minutes: targetMinutes,
    age_band: team.age_band,
    session_notes: null,
    themes: [],
    external_uid: event.uid,
  }
}
```

- [ ] **Step 5: Write `src/lib/ics-import.test.ts`**

```ts
// src/lib/ics-import.test.ts
import { describe, expect, it } from 'vitest'
import { mapIcsEventToSessionInput } from './ics-import'
import type { VEvent } from 'node-ical'
import type { Team } from './types'

const team: Team = {
  id: 'team-1',
  name: 'U9s',
  library: 'outfield',
  age_band: 'U9-U11',
  color: '#39d97a',
  byga_url: null,
  calendar_url: 'webcal://example.com/feed.ics',
  calendar_synced_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

function makeEvent(overrides: Partial<VEvent>): VEvent {
  return {
    type: 'VEVENT',
    uid: 'event-1',
    dtstamp: new Date('2026-01-01T00:00:00.000Z'),
    start: new Date('2026-03-14T15:30:00.000Z'),
    datetype: 'date-time',
    summary: 'Training',
    ...overrides,
  } as VEvent
}

describe('mapIcsEventToSessionInput', () => {
  it('maps summary, uid, and team fields', () => {
    const result = mapIcsEventToSessionInput(makeEvent({}), team)
    expect(result.name).toBe('Training')
    expect(result.external_uid).toBe('event-1')
    expect(result.team_id).toBe('team-1')
    expect(result.library).toBe('outfield')
    expect(result.age_band).toBe('U9-U11')
    expect(result.themes).toEqual([])
  })

  it('unwraps a parameterized summary value', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ summary: { val: 'Match Day' } as never }), team)
    expect(result.name).toBe('Match Day')
  })

  it('falls back to the team name when summary is missing', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ summary: undefined as never }), team)
    expect(result.name).toBe('U9s')
  })

  it('computes target_minutes from start/end', () => {
    const result = mapIcsEventToSessionInput(
      makeEvent({ start: new Date('2026-03-14T15:00:00.000Z'), end: new Date('2026-03-14T16:30:00.000Z') }),
      team,
    )
    expect(result.target_minutes).toBe(90)
  })

  it('falls back to 60 minutes when there is no end time', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ end: undefined }), team)
    expect(result.target_minutes).toBe(60)
  })

  it('sets start_time to null for an all-day event', () => {
    const result = mapIcsEventToSessionInput(makeEvent({ datetype: 'date' }), team)
    expect(result.start_time).toBeNull()
  })

  it('unwraps location, or leaves it null when absent', () => {
    const withLocation = mapIcsEventToSessionInput(makeEvent({ location: 'Pitch 3' }), team)
    expect(withLocation.location).toBe('Pitch 3')
    const without = mapIcsEventToSessionInput(makeEvent({}), team)
    expect(without.location).toBeNull()
  })
})
```

- [ ] **Step 6: Run the new tests**

Run: `npx vitest run src/lib/ics-import.test.ts`
Expected: all 7 tests pass.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0011_session_external_uid.sql src/lib/types.ts src/lib/ics-import.ts src/lib/ics-import.test.ts package.json package-lock.json
git commit -m "feat: add session.external_uid and an ICS-event-to-session mapper"
```

---

### Task 3: Sync Route Handler and `CalendarConnect` UI

**Files:**
- Create: `src/app/api/teams/[id]/sync-calendar/route.ts`
- Modify: `src/lib/teams.ts` (drop the premature `calendar_synced_at` stamp from `connectCalendar`, add a `syncCalendar` client wrapper)
- Modify: `src/components/teams/CalendarConnect.tsx` (Sync now UI)
- Modify: `src/app/teams/[id]/page.tsx` (surface `CalendarConnect` on the team's own page)

**Interfaces:**
- Consumes: `mapIcsEventToSessionInput` (Task 2); `getTeam` from `src/lib/teams-server.ts`; `createServerClient` from `src/lib/supabase/server.ts`.
- Produces: `POST /api/teams/[id]/sync-calendar` → `{ created: number }` on success, `{ error: string }` with a 4xx/5xx status on failure. `syncCalendar(teamId: string): Promise<{ created: number }>` in `src/lib/teams.ts`, calling that route via `fetch`.

- [ ] **Step 1: Write the Route Handler**

```ts
// src/app/api/teams/[id]/sync-calendar/route.ts
import { NextResponse } from 'next/server'
import * as ical from 'node-ical'
import type { VEvent } from 'node-ical'
import { createServerClient } from '@/lib/supabase/server'
import { getTeam } from '@/lib/teams-server'
import { mapIcsEventToSessionInput } from '@/lib/ics-import'

/**
 * Fetches and parses a team's connected ICS feed, creates a session for
 * every fixture it hasn't imported before (matched by the event's UID),
 * and stamps `calendar_synced_at`. Runs server-side because most calendar
 * hosts don't send CORS headers a browser could use to fetch the feed
 * directly (design doc, 2026-08-15). No auth in this app, so this uses the
 * same anon-key Supabase client every other write in the app already uses.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: teamId } = await params

  const team = await getTeam(teamId)
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }
  if (!team.calendar_url) {
    return NextResponse.json({ error: 'No calendar connected for this team' }, { status: 400 })
  }

  let events: ical.CalendarResponse
  try {
    events = await ical.async.fromURL(team.calendar_url)
  } catch {
    return NextResponse.json({ error: 'Could not fetch the calendar feed' }, { status: 502 })
  }

  const supabase = await createServerClient()

  const { data: existing, error: existingError } = await supabase
    .from('session')
    .select('external_uid')
    .eq('team_id', teamId)
    .not('external_uid', 'is', null)

  if (existingError) {
    return NextResponse.json({ error: `Failed to check existing sessions: ${existingError.message}` }, { status: 500 })
  }

  const knownUids = new Set((existing ?? []).map((row) => row.external_uid as string))

  const newSessions = Object.values(events)
    .filter((component): component is VEvent => component.type === 'VEVENT' && !knownUids.has(component.uid))
    .map((event) => mapIcsEventToSessionInput(event, team))

  if (newSessions.length > 0) {
    const { error: insertError } = await supabase.from('session').insert(newSessions)
    if (insertError) {
      return NextResponse.json({ error: `Failed to save sessions: ${insertError.message}` }, { status: 500 })
    }
  }

  await supabase.from('team').update({ calendar_synced_at: new Date().toISOString() }).eq('id', teamId)

  return NextResponse.json({ created: newSessions.length })
}
```

- [ ] **Step 2: Update `src/lib/teams.ts`**

Replace the full contents of `src/lib/teams.ts` with:

```ts
import { createBrowserClient } from './supabase/client'
import type { Team, TeamInput } from './types'

/** Client-side. Creates a team. */
export async function createTeam(input: TeamInput): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('team').insert(input).select().single()
  if (error) throw new Error(`Failed to create team: ${error.message}`)
  return data as Team
}

/**
 * Client-side. Records that a calendar-subscription URL was saved. Does
 * NOT stamp `calendar_synced_at` — that field means "the last time we
 * actually pulled fixtures in," and connecting a URL hasn't fetched
 * anything yet. Only `syncCalendar` (below) stamps it, after a real sync.
 */
export async function connectCalendar(teamId: string, url: string): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from('team')
    .update({ calendar_url: url })
    .eq('id', teamId)
    .select()
    .single()
  if (error) throw new Error(`Failed to connect calendar: ${error.message}`)
  return data as Team
}

/** Client-side. Triggers a "Sync now" — fetches and imports new fixtures
    from the team's connected calendar feed via the server-side route
    (needed to avoid the browser CORS restrictions most calendar hosts
    impose). Returns how many new sessions were created. */
export async function syncCalendar(teamId: string): Promise<{ created: number }> {
  const response = await fetch(`/api/teams/${teamId}/sync-calendar`, { method: 'POST' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Sync failed')
  return body as { created: number }
}
```

- [ ] **Step 3: Rewrite `CalendarConnect.tsx`**

Replace the full contents of `src/components/teams/CalendarConnect.tsx` with:

```tsx
'use client'

import { useState } from 'react'
import { connectCalendar, syncCalendar } from '@/lib/teams'
import type { Team } from '@/lib/types'

export function CalendarConnect({ team }: { team: Team }) {
  const [url, setUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [calendarUrl, setCalendarUrl] = useState(team.calendar_url)
  const [syncedAt, setSyncedAt] = useState(team.calendar_synced_at)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    if (url.trim() === '') return
    setConnecting(true)
    setError(null)
    try {
      const updated = await connectCalendar(team.id, url.trim())
      setCalendarUrl(updated.calendar_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setLastResult(null)
    try {
      const { created } = await syncCalendar(team.id)
      setSyncedAt(new Date().toISOString())
      setLastResult(created === 0 ? 'No new sessions' : created === 1 ? '1 new session' : `${created} new sessions`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (calendarUrl === null) {
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
          disabled={connecting || url.trim() === ''}
          className="header-cta"
          style={{ marginTop: 8 }}
        >
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
        {error && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>{error}</div>}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Connected</div>
      <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
        {syncedAt ? `Last synced ${new Date(syncedAt).toLocaleString()}` : 'Never synced'}
      </div>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="header-cta"
        style={{ marginTop: 8 }}
      >
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
      {lastResult && <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 6 }}>{lastResult}</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Surface `CalendarConnect` on the team's own page**

In `src/app/teams/[id]/page.tsx`, add the import:

```tsx
import { CalendarConnect } from '@/components/teams/CalendarConnect'
```

Then change:

```tsx
      <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
        {team.library === 'outfield' ? 'Outfield' : 'Goalkeeping'}
        {team.age_band ? ` · ${team.age_band}` : ''}
      </div>
      <div style={{ marginTop: 16 }}>
        <a href={`/sessions/new?team=${team.id}`} className="header-cta">+ Session</a>
      </div>
```

to:

```tsx
      <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
        {team.library === 'outfield' ? 'Outfield' : 'Goalkeeping'}
        {team.age_band ? ` · ${team.age_band}` : ''}
      </div>
      <div style={{ marginTop: 12 }}>
        <CalendarConnect team={team} />
      </div>
      <div style={{ marginTop: 16 }}>
        <a href={`/sessions/new?team=${team.id}`} className="header-cta">+ Session</a>
      </div>
```

Don't restructure anything else on the page.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual check**

Run: `npm run dev`. On a team's page (`/teams/[id]`), confirm the calendar-connect box appears. Since a real BYGA feed URL isn't available for testing, use any publicly reachable test ICS feed URL you have access to, or skip live-fetch verification and instead confirm: the "Connect" input/button work and persist `calendar_url` (reload the page, confirm it now shows "● Connected" / "Sync now" instead of the input); clicking "Sync now" against an unreachable/fake URL shows the "Could not fetch the calendar feed" error state cleanly (no crash, button re-enables). If you do have a real test ICS URL, connect it and confirm sessions actually appear in `/sessions` after syncing, and that syncing a second time reports "No new sessions" rather than duplicating.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/teams/\[id\]/sync-calendar/route.ts src/lib/teams.ts src/components/teams/CalendarConnect.tsx src/app/teams/\[id\]/page.tsx
git commit -m "feat: fetch and import BYGA calendar fixtures via Sync now"
```

---

### Task 4: Day view — skip to next session

**Files:**
- Modify: `src/lib/sessions-server.ts` (add `nextSessionDate`)
- Modify: `src/app/sessions/page.tsx` (`DayOverviewView` fetches it when the day is empty)
- Modify: `src/components/sessions/DayView.tsx` (render the skip link)

**Interfaces:**
- Consumes: nothing new outside this task.
- Produces: `nextSessionDate(afterISO: string, teamId: string | null): Promise<string | null>` from `src/lib/sessions-server.ts`.

- [ ] **Step 1: Add `nextSessionDate` to `sessions-server.ts`**

Add this function to `src/lib/sessions-server.ts`, near `listSessionsInWindow` (same file, any sensible position — e.g. directly after it):

```ts
/** Server-side. The nearest date strictly after `afterISO` with at least
    one scheduled session (optionally restricted to one team) — powers the
    day view's "Skip to next session" link when the current day is empty.
    Null if nothing is scheduled after that date. */
export async function nextSessionDate(afterISO: string, teamId: string | null): Promise<string | null> {
  const supabase = await createServerClient()
  let query = supabase
    .from('session')
    .select('date')
    .gt('date', afterISO)
    .not('date', 'is', null)
    .order('date', { ascending: true })
    .limit(1)
  if (teamId) query = query.eq('team_id', teamId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to find next session date: ${error.message}`)
  return data && data.length > 0 ? (data[0].date as string) : null
}
```

Check the top of `sessions-server.ts` for its existing `createServerClient` import — reuse it, don't add a duplicate import.

- [ ] **Step 2: Wire it into `DayOverviewView` in `sessions/page.tsx`**

In `src/app/sessions/page.tsx`, add `nextSessionDate` to the import from `@/lib/sessions-server` (alongside the existing `drillCountsBySession, listSessions, listSessionsInWindow, listTeams, plannedMinutesBySession`).

In the `DayOverviewView` function, after computing `sessions` (the filtered, in-window sessions for this exact date), add:

```ts
  const nextDate = sessions.length === 0 ? await nextSessionDate(date, selectedTeamId) : null
```

Then pass `nextDate` as a new prop to `<DayView ... nextDate={nextDate} />`.

- [ ] **Step 3: Render the skip link in `DayView.tsx`**

In `src/components/sessions/DayView.tsx`, add `nextDate: string | null` to the props type (alongside the existing `teamColors: Map<string, string>` at the end of the props object type), and destructure it in the function signature.

Change the empty-state block from:

```tsx
      {sessions.length === 0 ? (
        <div className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', padding: '12px 4px' }}>
          Nothing planned this day.
        </div>
      ) : (
```

to:

```tsx
      {sessions.length === 0 ? (
        <div style={{ padding: '12px 4px' }}>
          <div className="bd" style={{ fontSize: 13, color: 'var(--ink-45)' }}>
            Nothing planned this day.
          </div>
          {nextDate && (
            <Link
              href={sessionsHref({ view: 'day', date: nextDate, teamId: selectedTeamId })}
              className="bd"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', display: 'inline-block', marginTop: 8 }}
            >
              Skip to next session →
            </Link>
          )}
        </div>
      ) : (
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual check**

Run: `npm run dev`. Create a session dated a few days in the future (via `/sessions/new`). Visit `/sessions` on a day with nothing scheduled before that date — confirm "Skip to next session →" appears and clicking it jumps straight to the date you created. Filter to a specific team via the sidebar and confirm the skip link respects that filter (doesn't jump to another team's session). Visit a day after every existing session and confirm the link doesn't render at all (nothing further to skip to).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sessions-server.ts src/app/sessions/page.tsx src/components/sessions/DayView.tsx
git commit -m "feat: add a skip-to-next-session link on an empty day"
```

---

### Task 5: Sidebar divider full-height fix

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/sessions/page.tsx`

**Interfaces:** none — pure CSS/layout change.

- [ ] **Step 1: Add the CSS rule**

In `src/app/globals.css`, inside the existing `@media (min-width: 780px)` block (the same one that already contains `.app-shell { padding-bottom: 0; padding-top: 56px; }` and the `.app-nav`/`.app-nav-tab` desktop rules), add:

```css
  .schedule-layout { min-height: calc(100vh - 56px); }
```

The `56px` matches the desktop top-nav height already set by `.app-shell`'s `padding-top: 56px` in this same media query block.

- [ ] **Step 2: Apply the class in `sessions/page.tsx`**

In `src/app/sessions/page.tsx`, find the outer row:

```tsx
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
```

Change it to:

```tsx
      <div className="schedule-layout" style={{ display: 'flex', alignItems: 'stretch' }}>
```

- [ ] **Step 3: Manual check**

Run: `npm run dev`, resize the browser to desktop width (≥780px), visit `/sessions` on a day with nothing scheduled (the shortest-content case). Confirm the vertical divider between the Teams sidebar and the main content now runs all the way to the bottom of the viewport, not just to the height of "Nothing planned this day." Resize to mobile width and confirm nothing changed there (the `min-height` rule is scoped to the desktop media query only).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/sessions/page.tsx
git commit -m "fix: sidebar divider reaches the bottom of the viewport on desktop"
```

---

### Task 6: Full end-to-end manual QA

No code changes — a final walkthrough confirming Tasks 1-5 work together.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `team-colors.test.ts` and `ics-import.test.ts` cases.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: builds clean, including the new `/api/teams/[id]/sync-calendar` route appearing in the route table.

- [ ] **Step 3: Team color end-to-end**

Create two teams in a row without picking a color on the second one deliberately differently from the suggestion, confirm both show their chosen colors consistently in the Schedule sidebar, on session rows, and on month-view dots (create a session for each team first if none exist).

- [ ] **Step 4: BYGA import end-to-end (if a real test feed is available)**

Connect a real ICS feed URL to a test team, sync, confirm sessions appear with correct name/date/time/location. Sync again immediately and confirm the count is 0 new (no duplicates). Edit one imported session's notes, sync a third time, confirm that session's notes are untouched.

- [ ] **Step 5: Day view skip button**

From today's date (assuming nothing is scheduled today), confirm the skip link appears and works; confirm it disappears once you've navigated past the last scheduled date.

- [ ] **Step 6: Sidebar divider**

Confirm on a desktop-width, mostly-empty `/sessions` day that the divider reaches the bottom of the screen.

- [ ] **Step 7: Regression check**

Confirm the Drills page (unrelated area, not touched by this plan) still works normally — quick sanity check, not a deep pass.

- [ ] **Step 8: Final commit (if any QA fixes were needed)**

If Steps 1-7 surfaced any fixes, commit them individually with descriptive messages before considering this plan complete. If no fixes were needed, this task requires no commit.
