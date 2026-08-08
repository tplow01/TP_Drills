# TP Drills — Phase 1 (Drill Library) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working drill library — capture, browse, filter, photograph, edit and soft-delete drills across two libraries — as a standalone useful app.

**Architecture:** Next.js App Router with Supabase Postgres and Storage. All drill filtering, sorting and validation lives in pure TypeScript functions with no I/O, which are the only things under test. The Drills screen fetches every non-deleted drill for the active library in one query and filters in memory — at 25–100 drills this is instant, and it means one filter implementation rather than a tested predicate plus an untested SQL translation that can drift. Revisit past ~1000 drills.

**Tech Stack:** Next.js (App Router, TypeScript), React, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Vitest, `next/font/local` with Hubot Sans and Mona Sans variable woff2.

**Spec:** `docs/superpowers/specs/2026-08-08-tp-drills-design.md`. Where this plan and the spec disagree, the spec wins — raise it rather than improvising.

## Global Constraints

- **Palette, exact values, no others:** ground `#151515`, card `#1f1f1f`, ink `#f3f0ea`, accent `#f15e22`.
- **Orange is rationed.** Accent marks only what is live, earned or actionable: active filters, derived stats, primary actions. Never decoration, never borders-for-the-sake-of-it.
- **No light mode.** One dark palette on every screen and every device.
- **Headline type:** Hubot Sans, weight 800, italic, `text-transform: uppercase`, `letter-spacing: -0.035em`, `line-height: 0.92`.
- **Body type:** Mona Sans, weight 500, `letter-spacing: -0.005em`.
- **Fonts are self-hosted** via `next/font/local`. No CDN or Google Fonts request may appear in the production bundle.
- **A drill's `library` is permanent.** No code path may change it after insert.
- **Drills are never hard-deleted.** Only `deleted_at` is set.
- **`coaching_points` requires at least one entry** for any drill that is not a draft.
- **Goalkeeping drills never have an `age_band`.** Outfield drills that are not drafts always do.
- **The Outfield/Goalkeeping segment never persists.** Every arrival at `/drills` opens on Outfield.
- **Tests cover logic only.** No component tests, no end-to-end tests. See spec §13.
- **Phase 1 front door is `/drills`.** The hub does not exist yet.

---

## File Structure

| Path | Responsibility |
|---|---|
| `supabase/migrations/0001_drills.sql` | Drill table, enums, constraints, `updated_at` trigger, storage bucket |
| `src/lib/types.ts` | `Library`, `AgeBand`, `DrillType`, `Drill`, `DrillInput` |
| `src/lib/taxonomy.ts` | Type lists per library, age bands, display labels |
| `src/lib/filters.ts` | `DrillFilter`, matching predicates, `filterDrills`, `sortDrills`, `describeFilter` — **tested** |
| `src/lib/validation.ts` | `missingFields`, `isComplete` — **tested** |
| `src/lib/image.ts` | `computeTargetSize` (**tested**) plus the canvas compression wrapper |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server Supabase client |
| `src/lib/drills.ts` | Data access: list, get, insert, update, soft-delete |
| `src/app/layout.tsx` | Root layout, fonts, tokens |
| `src/app/globals.css` | CSS custom properties, base type, resets |
| `src/app/page.tsx` | Redirect to `/drills` |
| `src/app/drills/page.tsx` | Drills screen |
| `src/app/drills/new/page.tsx` | Add drill |
| `src/app/drills/[id]/page.tsx` | Drill detail |
| `src/app/drills/[id]/edit/page.tsx` | Edit drill |
| `src/components/ui/Segment.tsx` | Two-option segmented control |
| `src/components/ui/ScreenHeader.tsx` | Back control, title, gear slot |
| `src/components/drills/DrillCard.tsx` | One card, cream-matted thumbnail |
| `src/components/drills/DrillGrid.tsx` | Responsive grid, empty state |
| `src/components/drills/FilterPanel.tsx` | Desktop sidebar and phone sheet contents |
| `src/components/drills/ActiveFilterSummary.tsx` | Count, active-filter sentence, Clear all |
| `src/components/drills/DrillsBrowser.tsx` | Client component owning filter state |
| `src/components/drills/DrillForm.tsx` | Quick and full capture |
| `src/components/drills/PhotoField.tsx` | Camera/library picker, compression, preview |
| `src/components/drills/DeleteDrillDialog.tsx` | Confirmation naming the consequence |

---

## Scope note

This plan covers **Phase 1 only** (spec §14). Phases 2 and 3 get their own plans, written once Phase 1 lands.

That is a deliberate call, not an omission. Phase 2's tasks would have to name components, props and file paths inside a Planner and Session view that do not exist yet — writing TDD steps against them now produces guesses that go stale the moment Phase 1 makes a real decision. Spec §14 states each phase is independently useful, and Phase 1 alone is a working drill library. The remaining arc, for context:

- **Phase 2** — Planner (sessions list plus builder), session tray, session view (pitchside and print), auto-completion and reflection, `drill_stats` view, hub, schedule. Roughly 9–11 tasks.
- **Phase 3** — Teams and Settings, Byga ICS parser and Vercel cron route, JSON export. Roughly 5–6 tasks.

---

## Task 1: Project scaffold, design tokens and test harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.env.local.example`, `.env.local`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `src/fonts/HubotSans-Italic.woff2`, `src/fonts/MonaSans.woff2`
- Create: `src/lib/version.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: a booting Next.js app on the dark palette with both fonts loaded; `npm test` running Vitest; CSS custom properties `--ground`, `--card`, `--ink`, `--accent` and utility classes `.hl` (headline) and `.bd` (body) available to every later task

- [ ] **Step 1: Scaffold the Next.js app**

Run from `/Users/tplow/Documents/TP_Drills`. The directory already contains `TP_Drills.md`, `docs/` and `.gitignore`, so scaffold in place:

```bash
npx create-next-app@latest . \
  --typescript --app --src-dir --eslint \
  --no-tailwind --no-turbopack --import-alias "@/*"
```

Answer yes to proceeding in a non-empty directory. Do not let it overwrite `.gitignore` contents that already list `.superpowers/`; re-add that line if it disappears.

- [ ] **Step 2: Install runtime and test dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

`environment: 'node'` is correct: spec §13 forbids component tests, so nothing under test touches the DOM.

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a failing harness test**

Create `src/lib/version.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { APP_NAME } from './version'

describe('harness', () => {
  it('resolves the @ alias and imports source', () => {
    expect(APP_NAME).toBe('TP Drills')
  })
})
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "./version"`.

- [ ] **Step 6: Make it pass**

Create `src/lib/version.ts`:

```ts
export const APP_NAME = 'TP Drills'
```

Run: `npm test`
Expected: PASS, 1 test.

- [ ] **Step 7: Download the fonts**

```bash
mkdir -p src/fonts
curl -sL -o src/fonts/HubotSans-Italic.woff2 \
  https://cdn.jsdelivr.net/npm/@fontsource-variable/hubot-sans@5.3.0/files/hubot-sans-latin-wght-italic.woff2
curl -sL -o src/fonts/MonaSans.woff2 \
  https://cdn.jsdelivr.net/npm/@fontsource-variable/mona-sans@5.3.0/files/mona-sans-latin-wght-normal.woff2
ls -la src/fonts
```

Expected: two files, each roughly 30–60KB. If either is under 1KB the CDN returned an error page — stop and investigate rather than continuing with a broken font.

- [ ] **Step 8: Write the design tokens**

Replace `src/app/globals.css` entirely:

```css
:root {
  --ground: #151515;
  --card: #1f1f1f;
  --ink: #f3f0ea;
  --accent: #f15e22;

  --ink-70: rgba(243, 240, 234, 0.70);
  --ink-45: rgba(243, 240, 234, 0.45);
  --ink-30: rgba(243, 240, 234, 0.30);
  --hairline: rgba(243, 240, 234, 0.09);

  --radius: 10px;
  --radius-sm: 6px;
}

*, *::before, *::after { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: var(--ground);
  color: var(--ink);
}

body {
  font-family: var(--font-mona), system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: -0.005em;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
}

/* Headline. Every h1-h4 and anything marked .hl. */
.hl, h1, h2, h3, h4 {
  font-family: var(--font-hubot), system-ui, sans-serif;
  font-weight: 800;
  font-style: italic;
  text-transform: uppercase;
  letter-spacing: -0.035em;
  line-height: 0.92;
  margin: 0;
}

.bd {
  font-family: var(--font-mona), system-ui, sans-serif;
  font-weight: 500;
  letter-spacing: -0.005em;
}

/* Small uppercase label. */
.lbl {
  font-family: var(--font-mona), system-ui, sans-serif;
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  color: var(--ink-30);
}

button { font: inherit; color: inherit; cursor: pointer; }
a { color: inherit; text-decoration: none; }
```

- [ ] **Step 9: Wire fonts and layout**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const hubot = localFont({
  src: './../fonts/HubotSans-Italic.woff2',
  variable: '--font-hubot',
  weight: '200 900',
  style: 'italic',
  display: 'swap',
})

const mona = localFont({
  src: './../fonts/MonaSans.woff2',
  variable: '--font-mona',
  weight: '200 900',
  style: 'normal',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TP Drills',
  description: 'Coaching hub',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${hubot.variable} ${mona.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 10: Make `/` the Drills front door**

Replace `src/app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'

// Phase 1 front door. Phase 2 replaces this with the hub.
export default function Home() {
  redirect('/drills')
}
```

Create a placeholder so the redirect resolves — `src/app/drills/page.tsx`:

```tsx
export default function DrillsPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 34 }}>Drills</h1>
      <p className="bd" style={{ color: 'var(--ink-45)', marginTop: 10 }}>
        Library coming in Task 7.
      </p>
    </main>
  )
}
```

- [ ] **Step 11: Verify it boots and looks right**

Run: `npm run dev`, open `http://localhost:3000`

Expected: redirect to `/drills`; near-black background; **DRILLS** in heavy italic uppercase; the sentence beneath in Mona Sans at reduced opacity. Open DevTools → Network → Font: exactly two woff2 requests, both same-origin. Any request to `fonts.googleapis.com` or `jsdelivr` means Step 9 failed.

- [ ] **Step 12: Add environment template**

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

```bash
cp .env.local.example .env.local
```

Fill `.env.local` with the real project URL and anon key from the Supabase dashboard (Settings → API). Confirm `.gitignore` contains `.env*.local`.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js app with design tokens, fonts and Vitest"
```

---

## Task 2: Database schema and types

**Files:**
- Create: `supabase/migrations/0001_drills.sql`
- Create: `src/lib/types.ts`, `src/lib/taxonomy.ts`
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`
- Create: `src/lib/taxonomy.test.ts`

**Interfaces:**
- Consumes: Task 1's env vars
- Produces: `Library`, `AgeBand`, `DrillType`, `Drill`, `DrillInput` from `@/lib/types`; `OUTFIELD_TYPES`, `GK_TYPES`, `typesFor(library)`, `AGE_BANDS`, `typeLabel(t)`, `ageBandLabel(a)` from `@/lib/taxonomy`; `createBrowserClient()` from `@/lib/supabase/client`; `createServerClient()` from `@/lib/supabase/server`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0001_drills.sql`:

```sql
-- Libraries and age bands ---------------------------------------------------
create type library as enum ('outfield', 'goalkeeping');

-- Age band is an enum so U12-U14 / U15+ can be added later with ALTER TYPE,
-- with no data migration. See spec 5.3.
create type age_band as enum ('U6-U8', 'U9-U11');

-- One enum for both taxonomies. A check constraint below keeps each library's
-- values separate; a single enum avoids a polymorphic column.
create type drill_type as enum (
  -- outfield
  'warm_up', 'passing', 'dribbling', 'shooting', 'finishing',
  'defending', 'possession_rondo', 'small_sided_game', 'fun_cooldown',
  -- goalkeeping
  'gk_warmup_handling', 'shot_stopping', 'footwork', 'distribution',
  'crosses', 'positioning', 'reactions', 'one_v_ones'
);

create table drill (
  id                uuid primary key default gen_random_uuid(),
  library           library      not null,
  name              text         not null,
  type              drill_type   not null,
  age_band          age_band,
  suitable_from     text,
  duration_mins     int,
  players_min       int,
  players_max       int,
  goals_needed      int          not null default 0,
  cones_needed      int          not null default 0,
  bibs_needed       bool         not null default false,
  image_url         text,
  setup             text         not null default '',
  how_it_works      text         not null default '',
  coaching_points   text[]       not null default '{}',
  progressions      text,
  source            text,
  tags              text[]       not null default '{}',
  is_draft          bool         not null default false,
  deleted_at        timestamptz,
  created_at        timestamptz  not null default now(),
  updated_at        timestamptz  not null default now(),

  -- Each library may only use its own types.
  constraint type_matches_library check (
    (library = 'outfield' and type in (
      'warm_up','passing','dribbling','shooting','finishing',
      'defending','possession_rondo','small_sided_game','fun_cooldown'))
    or
    (library = 'goalkeeping' and type in (
      'gk_warmup_handling','shot_stopping','footwork','distribution',
      'crosses','positioning','reactions','one_v_ones'))
  ),

  -- Goalkeeping never carries an age band. Outfield always does, unless it is
  -- still a draft. Drafts are explicitly allowed to be incomplete (spec 7.2).
  constraint age_band_rules check (
    (library = 'goalkeeping' and age_band is null)
    or
    (library = 'outfield' and (is_draft or age_band is not null))
  ),

  -- suitable_from is goalkeeping-only free text.
  constraint suitable_from_gk_only check (
    library = 'goalkeeping' or suitable_from is null
  ),

  -- The one opinionated constraint: a finished drill has coaching points.
  constraint coaching_points_required check (
    is_draft or coalesce(array_length(coaching_points, 1), 0) >= 1
  ),

  -- Finished drills carry their required fields.
  constraint complete_fields_required check (
    is_draft or (
      duration_mins is not null
      and players_min is not null
      and length(btrim(setup)) > 0
      and length(btrim(how_it_works)) > 0
    )
  ),

  constraint players_range_sane check (
    players_max is null or players_min is null or players_max >= players_min
  ),

  constraint positive_numbers check (
    coalesce(duration_mins, 1) > 0
    and coalesce(players_min, 1) > 0
    and goals_needed >= 0
    and cones_needed >= 0
  )
);

-- The library list is always "this library, not deleted".
create index drill_library_live_idx on drill (library) where deleted_at is null;

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger drill_updated_at
  before update on drill
  for each row execute function set_updated_at();

-- Image storage. Public read: the app has no auth, and image URLs are already
-- as exposed as the app itself (spec 12).
insert into storage.buckets (id, name, public)
values ('drill-images', 'drill-images', true)
on conflict (id) do nothing;

create policy "public read drill images" on storage.objects
  for select using (bucket_id = 'drill-images');

create policy "public write drill images" on storage.objects
  for insert with check (bucket_id = 'drill-images');

create policy "public delete drill images" on storage.objects
  for delete using (bucket_id = 'drill-images');
```

- [ ] **Step 2: Apply it**

Paste the file into the Supabase dashboard SQL editor and run it. Then verify the constraints actually bite:

```sql
-- Must FAIL: goalkeeping drill given an outfield type
insert into drill (library, name, type, is_draft)
values ('goalkeeping', 'bad', 'passing', true);

-- Must FAIL: finished outfield drill with no coaching points
insert into drill (library, name, type, age_band, duration_mins, players_min,
                   setup, how_it_works, is_draft)
values ('outfield', 'bad', 'passing', 'U9-U11', 10, 6, 'x', 'y', false);

-- Must SUCCEED: a draft missing almost everything
insert into drill (library, name, type, is_draft)
values ('outfield', 'Quick idea', 'passing', true);

-- Must SUCCEED: a complete drill
insert into drill (library, name, type, age_band, duration_mins, players_min,
                   players_max, setup, how_it_works, coaching_points, is_draft)
values ('outfield', 'Four-Goal Rondo', 'possession_rondo', 'U9-U11', 12, 8, 12,
        '30x20 grid, four mini goals', '5v3 possession, score by passing through any goal',
        array['Scan before receiving', 'Open body shape'], false);
```

Expected: first two rejected with constraint violations, last two accepted. If a rejection does not happen, the constraint is wrong — fix the migration before continuing.

- [ ] **Step 3: Write the failing taxonomy test**

Create `src/lib/taxonomy.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { GK_TYPES, OUTFIELD_TYPES, typeLabel, typesFor } from './taxonomy'

describe('taxonomy', () => {
  it('lists nine outfield types and eight goalkeeping types', () => {
    expect(OUTFIELD_TYPES).toHaveLength(9)
    expect(GK_TYPES).toHaveLength(8)
  })

  it('keeps the two taxonomies disjoint', () => {
    const overlap = OUTFIELD_TYPES.filter((t) => (GK_TYPES as readonly string[]).includes(t))
    expect(overlap).toEqual([])
  })

  it('returns the right list per library', () => {
    expect(typesFor('outfield')).toBe(OUTFIELD_TYPES)
    expect(typesFor('goalkeeping')).toBe(GK_TYPES)
  })

  it('gives every type a human label', () => {
    for (const t of [...OUTFIELD_TYPES, ...GK_TYPES]) {
      expect(typeLabel(t).length).toBeGreaterThan(0)
    }
    expect(typeLabel('possession_rondo')).toBe('Possession / Rondo')
    expect(typeLabel('gk_warmup_handling')).toBe('Warm-up / Handling')
  })
})
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./taxonomy`.

- [ ] **Step 5: Write types**

Create `src/lib/types.ts`:

```ts
export type Library = 'outfield' | 'goalkeeping'

export type AgeBand = 'U6-U8' | 'U9-U11'

export type OutfieldType =
  | 'warm_up' | 'passing' | 'dribbling' | 'shooting' | 'finishing'
  | 'defending' | 'possession_rondo' | 'small_sided_game' | 'fun_cooldown'

export type GkType =
  | 'gk_warmup_handling' | 'shot_stopping' | 'footwork' | 'distribution'
  | 'crosses' | 'positioning' | 'reactions' | 'one_v_ones'

export type DrillType = OutfieldType | GkType

export interface Drill {
  id: string
  library: Library
  name: string
  type: DrillType
  age_band: AgeBand | null
  suitable_from: string | null
  duration_mins: number | null
  players_min: number | null
  players_max: number | null
  goals_needed: number
  cones_needed: number
  bibs_needed: boolean
  image_url: string | null
  setup: string
  how_it_works: string
  coaching_points: string[]
  progressions: string | null
  source: string | null
  tags: string[]
  is_draft: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
}

/** Fields a form supplies. `library` is set once at creation and never changes. */
export type DrillInput = Omit<
  Drill,
  'id' | 'deleted_at' | 'created_at' | 'updated_at'
>
```

- [ ] **Step 6: Write the taxonomy**

Create `src/lib/taxonomy.ts`:

```ts
import type { AgeBand, DrillType, GkType, Library, OutfieldType } from './types'

export const OUTFIELD_TYPES = [
  'warm_up', 'passing', 'dribbling', 'shooting', 'finishing',
  'defending', 'possession_rondo', 'small_sided_game', 'fun_cooldown',
] as const satisfies readonly OutfieldType[]

export const GK_TYPES = [
  'gk_warmup_handling', 'shot_stopping', 'footwork', 'distribution',
  'crosses', 'positioning', 'reactions', 'one_v_ones',
] as const satisfies readonly GkType[]

export const AGE_BANDS = ['U6-U8', 'U9-U11'] as const satisfies readonly AgeBand[]

const TYPE_LABELS: Record<DrillType, string> = {
  warm_up: 'Warm-up',
  passing: 'Passing',
  dribbling: 'Dribbling',
  shooting: 'Shooting',
  finishing: 'Finishing',
  defending: 'Defending',
  possession_rondo: 'Possession / Rondo',
  small_sided_game: 'Small-sided game',
  fun_cooldown: 'Fun game / Cool-down',
  gk_warmup_handling: 'Warm-up / Handling',
  shot_stopping: 'Shot stopping',
  footwork: 'Footwork',
  distribution: 'Distribution',
  crosses: 'Dealing with crosses',
  positioning: 'Positioning',
  reactions: 'Reactions',
  one_v_ones: '1v1s',
}

export function typesFor(library: Library): readonly DrillType[] {
  return library === 'outfield' ? OUTFIELD_TYPES : GK_TYPES
}

export function typeLabel(type: DrillType): string {
  return TYPE_LABELS[type]
}

export function ageBandLabel(band: AgeBand): string {
  return band
}

export function libraryLabel(library: Library): string {
  return library === 'outfield' ? 'Outfield' : 'Goalkeeping'
}
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: PASS, 5 tests.

- [ ] **Step 8: Add Supabase clients**

Create `src/lib/supabase/client.ts`:

```ts
import { createBrowserClient as create } from '@supabase/ssr'

export function createBrowserClient() {
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

Create `src/lib/supabase/server.ts`:

```ts
import { createServerClient as create } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerClient() {
  const store = await cookies()
  return create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        // The app has no auth, so nothing ever needs to write a cookie.
        setAll: () => {},
      },
    },
  )
}
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add drill schema, types, taxonomy and Supabase clients"
```

---

## Task 3: Filter and sort logic

This is the task the whole screen rests on, and the one place the PRD was wrong. Test it hard.

**Files:**
- Create: `src/lib/filters.ts`, `src/lib/filters.test.ts`

**Interfaces:**
- Consumes: `Drill`, `AgeBand`, `DrillType` from `@/lib/types`; `typeLabel` from `@/lib/taxonomy`
- Produces: `DrillFilter`, `EMPTY_FILTER`, `DurationBucket`, `SortKey`, `SortDir`, `matchesDuration(mins, bucket)`, `matchesPlayers(drill, n)`, `matchesSearch(drill, q)`, `matchesFilter(drill, filter)`, `filterDrills(drills, filter)`, `sortDrills(drills, key, dir)`, `activeFilterCount(filter)`, `describeFilter(filter)`, `mostRestrictiveAxis(drills, filter)`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/filters.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { Drill } from './types'
import {
  EMPTY_FILTER, activeFilterCount, describeFilter, filterDrills,
  matchesDuration, matchesPlayers, matchesSearch, mostRestrictiveAxis, sortDrills,
} from './filters'

function drill(over: Partial<Drill> = {}): Drill {
  return {
    id: 'id', library: 'outfield', name: 'Four-Goal Rondo',
    type: 'possession_rondo', age_band: 'U9-U11', suitable_from: null,
    duration_mins: 12, players_min: 8, players_max: 12,
    goals_needed: 4, cones_needed: 12, bibs_needed: true,
    image_url: null, setup: '30x20 grid', how_it_works: '5v3 possession',
    coaching_points: ['Scan before receiving'], progressions: null,
    source: null, tags: ['rondo', 'possession'], is_draft: false,
    deleted_at: null, created_at: '', updated_at: '',
    ...over,
  }
}

describe('matchesDuration', () => {
  it('treats 10 as the top of the short bucket', () => {
    expect(matchesDuration(10, 'lte10')).toBe(true)
    expect(matchesDuration(10, '10to20')).toBe(false)
  })

  it('treats 20 as the top of the middle bucket', () => {
    expect(matchesDuration(20, '10to20')).toBe(true)
    expect(matchesDuration(20, 'gte20')).toBe(false)
    expect(matchesDuration(21, 'gte20')).toBe(true)
  })

  it('excludes drafts with no duration from every bucket', () => {
    expect(matchesDuration(null, 'lte10')).toBe(false)
    expect(matchesDuration(null, 'gte20')).toBe(false)
  })
})

describe('matchesPlayers', () => {
  // This is the PRD bug. players_min <= N alone shows a drill capped at 12
  // when you have 20 players in front of you.
  it('excludes a drill whose maximum is below the players you have', () => {
    expect(matchesPlayers(drill({ players_min: 8, players_max: 12 }), 20)).toBe(false)
  })

  it('includes a drill whose range spans the players you have', () => {
    expect(matchesPlayers(drill({ players_min: 8, players_max: 12 }), 10)).toBe(true)
  })

  it('treats both bounds as inclusive', () => {
    const d = drill({ players_min: 8, players_max: 12 })
    expect(matchesPlayers(d, 8)).toBe(true)
    expect(matchesPlayers(d, 12)).toBe(true)
    expect(matchesPlayers(d, 7)).toBe(false)
    expect(matchesPlayers(d, 13)).toBe(false)
  })

  it('treats a null maximum as no upper limit', () => {
    expect(matchesPlayers(drill({ players_min: 9, players_max: null }), 40)).toBe(true)
    expect(matchesPlayers(drill({ players_min: 9, players_max: null }), 8)).toBe(false)
  })

  it('matches everything when no player count is entered', () => {
    expect(matchesPlayers(drill(), null)).toBe(true)
  })

  it('excludes drafts with no minimum once a count is entered', () => {
    expect(matchesPlayers(drill({ players_min: null }), 10)).toBe(false)
  })
})

describe('matchesSearch', () => {
  it('searches name, tags, setup and how_it_works case-insensitively', () => {
    const d = drill()
    expect(matchesSearch(d, 'RONDO')).toBe(true)      // name
    expect(matchesSearch(d, 'possession')).toBe(true) // tag and how_it_works
    expect(matchesSearch(d, '30x20')).toBe(true)      // setup
    expect(matchesSearch(d, 'crosses')).toBe(false)
  })

  it('ignores surrounding whitespace and matches empty queries', () => {
    expect(matchesSearch(drill(), '   ')).toBe(true)
    expect(matchesSearch(drill(), '  rondo  ')).toBe(true)
  })

  it('does not search coaching points', () => {
    // Spec 7.1 lists name, tags, setup, how_it_works. Nothing else.
    expect(matchesSearch(drill({ coaching_points: ['Zonal marking'] }), 'zonal')).toBe(false)
  })
})

describe('filterDrills', () => {
  const rondo = drill({ id: 'a', type: 'possession_rondo', duration_mins: 12, players_min: 8, players_max: 12 })
  const warmup = drill({ id: 'b', type: 'warm_up', duration_mins: 8, players_min: 4, players_max: null, name: 'Diamond Passing', tags: [] })
  const u6 = drill({ id: 'c', type: 'passing', age_band: 'U6-U8', duration_mins: 25, players_min: 6, players_max: null, name: 'Gates', tags: [] })

  it('returns everything on an empty filter', () => {
    expect(filterDrills([rondo, warmup, u6], EMPTY_FILTER)).toHaveLength(3)
  })

  it('ORs within the type axis', () => {
    const got = filterDrills([rondo, warmup, u6], { ...EMPTY_FILTER, types: ['possession_rondo', 'warm_up'] })
    expect(got.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('ANDs across axes', () => {
    const got = filterDrills([rondo, warmup, u6], {
      ...EMPTY_FILTER,
      types: ['possession_rondo', 'warm_up'],
      durations: ['lte10'],
    })
    expect(got.map((d) => d.id)).toEqual(['b'])
  })

  it('combines age band, duration and player count', () => {
    const got = filterDrills([rondo, warmup, u6], {
      ...EMPTY_FILTER,
      ageBands: ['U9-U11'],
      playersToday: 10,
    })
    expect(got.map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('never returns soft-deleted drills', () => {
    const gone = drill({ id: 'z', deleted_at: '2026-01-01T00:00:00Z' })
    expect(filterDrills([rondo, gone], EMPTY_FILTER).map((d) => d.id)).toEqual(['a'])
  })
})

describe('sortDrills', () => {
  const a = drill({ id: 'a', duration_mins: 20, players_min: 4 })
  const b = drill({ id: 'b', duration_mins: 8, players_min: 12 })
  const c = drill({ id: 'c', duration_mins: null, players_min: null })

  it('sorts by duration in both directions', () => {
    expect(sortDrills([a, b], 'duration', 'asc').map((d) => d.id)).toEqual(['b', 'a'])
    expect(sortDrills([a, b], 'duration', 'desc').map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('sorts by minimum players', () => {
    expect(sortDrills([a, b], 'players_min', 'asc').map((d) => d.id)).toEqual(['a', 'b'])
  })

  it('always sinks nulls to the bottom, whichever direction', () => {
    expect(sortDrills([c, a, b], 'duration', 'asc').map((d) => d.id)).toEqual(['b', 'a', 'c'])
    expect(sortDrills([c, a, b], 'duration', 'desc').map((d) => d.id)).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate its input', () => {
    const input = [a, b]
    sortDrills(input, 'duration', 'asc')
    expect(input.map((d) => d.id)).toEqual(['a', 'b'])
  })
})

describe('activeFilterCount and describeFilter', () => {
  it('counts each populated axis once', () => {
    expect(activeFilterCount(EMPTY_FILTER)).toBe(0)
    expect(activeFilterCount({
      ...EMPTY_FILTER,
      types: ['passing', 'shooting'],
      durations: ['lte10'],
      playersToday: 14,
    })).toBe(3)
  })

  it('does not count search as a filter axis', () => {
    // Search has its own visible field; counting it would double-report.
    expect(activeFilterCount({ ...EMPTY_FILTER, search: 'rondo' })).toBe(0)
  })

  it('describes the active filters as one readable line', () => {
    expect(describeFilter({
      ...EMPTY_FILTER,
      types: ['passing', 'possession_rondo'],
      ageBands: ['U9-U11'],
      durations: ['10to20'],
      playersToday: 14,
    })).toBe('Passing, Possession / Rondo · U9-U11 · 10–20 min · fits 14')
  })

  it('describes an empty filter as no filters', () => {
    expect(describeFilter(EMPTY_FILTER)).toBe('No filters')
  })
})

describe('mostRestrictiveAxis', () => {
  const rondo = drill({ id: 'a', type: 'possession_rondo', duration_mins: 12, players_min: 8, players_max: 12 })

  it('names the axis whose removal recovers the most drills', () => {
    // players 30 excludes everything; type alone would have matched.
    const axis = mostRestrictiveAxis([rondo], {
      ...EMPTY_FILTER,
      types: ['possession_rondo'],
      playersToday: 30,
    })
    expect(axis).toBe('playersToday')
  })

  it('returns null when the filter is empty', () => {
    expect(mostRestrictiveAxis([rondo], EMPTY_FILTER)).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/filters.test.ts`
Expected: FAIL — cannot resolve `./filters`.

- [ ] **Step 3: Implement**

Create `src/lib/filters.ts`:

```ts
import { typeLabel } from './taxonomy'
import type { AgeBand, Drill, DrillType } from './types'

export type DurationBucket = 'lte10' | '10to20' | 'gte20'
export type SortKey = 'duration' | 'players_min'
export type SortDir = 'asc' | 'desc'

export interface DrillFilter {
  types: DrillType[]
  ageBands: AgeBand[]
  durations: DurationBucket[]
  playersToday: number | null
  search: string
}

export const EMPTY_FILTER: DrillFilter = {
  types: [], ageBands: [], durations: [], playersToday: null, search: '',
}

const DURATION_LABELS: Record<DurationBucket, string> = {
  lte10: '≤10 min',
  '10to20': '10–20 min',
  gte20: '20+ min',
}

export function matchesDuration(mins: number | null, bucket: DurationBucket): boolean {
  if (mins === null) return false
  if (bucket === 'lte10') return mins <= 10
  if (bucket === '10to20') return mins > 10 && mins <= 20
  return mins > 20
}

/**
 * Spec 7.1. The PRD said `players_min <= N`, which shows a drill capped at 12
 * when you have 20 in front of you. Both bounds are inclusive; a null maximum
 * means no upper limit.
 */
export function matchesPlayers(drill: Drill, n: number | null): boolean {
  if (n === null) return true
  if (drill.players_min === null) return false
  if (drill.players_min > n) return false
  return drill.players_max === null || drill.players_max >= n
}

export function matchesSearch(drill: Drill, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  const haystack = [
    drill.name,
    drill.setup,
    drill.how_it_works,
    ...drill.tags,
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

export function matchesFilter(drill: Drill, filter: DrillFilter): boolean {
  if (drill.deleted_at !== null) return false
  if (filter.types.length > 0 && !filter.types.includes(drill.type)) return false
  if (filter.ageBands.length > 0) {
    if (drill.age_band === null || !filter.ageBands.includes(drill.age_band)) return false
  }
  if (filter.durations.length > 0) {
    if (!filter.durations.some((b) => matchesDuration(drill.duration_mins, b))) return false
  }
  if (!matchesPlayers(drill, filter.playersToday)) return false
  if (!matchesSearch(drill, filter.search)) return false
  return true
}

export function filterDrills(drills: Drill[], filter: DrillFilter): Drill[] {
  return drills.filter((d) => matchesFilter(d, filter))
}

export function sortDrills(drills: Drill[], key: SortKey, dir: SortDir): Drill[] {
  const value = (d: Drill) => (key === 'duration' ? d.duration_mins : d.players_min)
  return [...drills].sort((a, b) => {
    const av = value(a)
    const bv = value(b)
    // Nulls always sink, regardless of direction — a drill with no duration
    // is not "the shortest".
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    return dir === 'asc' ? av - bv : bv - av
  })
}

/** Search is excluded: it has its own visible field. */
export function activeFilterCount(filter: DrillFilter): number {
  let n = 0
  if (filter.types.length > 0) n++
  if (filter.ageBands.length > 0) n++
  if (filter.durations.length > 0) n++
  if (filter.playersToday !== null) n++
  return n
}

export function describeFilter(filter: DrillFilter): string {
  const parts: string[] = []
  if (filter.types.length > 0) parts.push(filter.types.map(typeLabel).join(', '))
  if (filter.ageBands.length > 0) parts.push(filter.ageBands.join(', '))
  if (filter.durations.length > 0) {
    parts.push(filter.durations.map((d) => DURATION_LABELS[d]).join(', '))
  }
  if (filter.playersToday !== null) parts.push(`fits ${filter.playersToday}`)
  return parts.length === 0 ? 'No filters' : parts.join(' · ')
}

export type FilterAxis = 'types' | 'ageBands' | 'durations' | 'playersToday'

/**
 * Spec 11: an empty result offers to clear the most restrictive filter, not
 * only Clear all. Returns the axis whose removal recovers the most drills.
 */
export function mostRestrictiveAxis(drills: Drill[], filter: DrillFilter): FilterAxis | null {
  const axes: FilterAxis[] = ['types', 'ageBands', 'durations', 'playersToday']
  const active = axes.filter((a) =>
    a === 'playersToday' ? filter.playersToday !== null : filter[a].length > 0,
  )
  if (active.length === 0) return null

  let best: FilterAxis = active[0]
  let bestCount = -1
  for (const axis of active) {
    const relaxed: DrillFilter = { ...filter, ...(axis === 'playersToday'
      ? { playersToday: null }
      : { [axis]: [] } as Partial<DrillFilter>) }
    const count = filterDrills(drills, relaxed).length
    if (count > bestCount) {
      bestCount = count
      best = axis
    }
  }
  return best
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — 26 tests across filters and taxonomy.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add drill filter and sort logic with correct player range predicate"
```

---

## Task 4: Draft and completeness validation

**Files:**
- Create: `src/lib/validation.ts`, `src/lib/validation.test.ts`

**Interfaces:**
- Consumes: `DrillInput`, `Library` from `@/lib/types`
- Produces: `RequiredField`, `missingFields(input)`, `isComplete(input)`, `fieldLabel(field)` from `@/lib/validation`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/validation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { DrillInput } from './types'
import { fieldLabel, isComplete, missingFields } from './validation'

function input(over: Partial<DrillInput> = {}): DrillInput {
  return {
    library: 'outfield', name: 'Four-Goal Rondo', type: 'possession_rondo',
    age_band: 'U9-U11', suitable_from: null, duration_mins: 12,
    players_min: 8, players_max: 12, goals_needed: 4, cones_needed: 12,
    bibs_needed: true, image_url: null, setup: '30x20 grid',
    how_it_works: '5v3 possession', coaching_points: ['Scan before receiving'],
    progressions: null, source: null, tags: [], is_draft: false,
    ...over,
  }
}

describe('missingFields', () => {
  it('finds nothing missing on a complete outfield drill', () => {
    expect(missingFields(input())).toEqual([])
    expect(isComplete(input())).toBe(true)
  })

  it('requires at least one coaching point', () => {
    // The one deliberately opinionated constraint (spec 7.2).
    expect(missingFields(input({ coaching_points: [] }))).toContain('coaching_points')
  })

  it('ignores blank coaching points', () => {
    expect(missingFields(input({ coaching_points: ['   ', ''] }))).toContain('coaching_points')
  })

  it('requires an age band for outfield drills', () => {
    expect(missingFields(input({ age_band: null }))).toContain('age_band')
  })

  it('never requires an age band for goalkeeping drills', () => {
    const gk = input({ library: 'goalkeeping', type: 'shot_stopping', age_band: null })
    expect(missingFields(gk)).toEqual([])
  })

  it('requires name, setup and how_it_works to be non-blank', () => {
    const got = missingFields(input({ name: '  ', setup: '', how_it_works: '   ' }))
    expect(got).toContain('name')
    expect(got).toContain('setup')
    expect(got).toContain('how_it_works')
  })

  it('requires duration and minimum players', () => {
    const got = missingFields(input({ duration_mins: null, players_min: null }))
    expect(got).toContain('duration_mins')
    expect(got).toContain('players_min')
  })

  it('rejects a maximum below the minimum', () => {
    expect(missingFields(input({ players_min: 12, players_max: 8 }))).toContain('players_max')
  })

  it('accepts a null maximum as no upper limit', () => {
    expect(missingFields(input({ players_max: null }))).toEqual([])
  })

  it('reports the same gaps whether or not the drill is flagged draft', () => {
    // is_draft records intent to finish later; it does not change what is missing.
    const a = missingFields(input({ coaching_points: [], is_draft: true }))
    const b = missingFields(input({ coaching_points: [], is_draft: false }))
    expect(a).toEqual(b)
  })
})

describe('isComplete', () => {
  it('is false whenever anything is missing', () => {
    expect(isComplete(input({ coaching_points: [] }))).toBe(false)
  })
})

describe('fieldLabel', () => {
  it('gives every required field a human label', () => {
    for (const f of missingFields(input({
      name: '', setup: '', how_it_works: '', age_band: null,
      duration_mins: null, players_min: null, coaching_points: [],
    }))) {
      expect(fieldLabel(f).length).toBeGreaterThan(0)
    }
    expect(fieldLabel('coaching_points')).toBe('At least one coaching point')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/validation.test.ts`
Expected: FAIL — cannot resolve `./validation`.

- [ ] **Step 3: Implement**

Create `src/lib/validation.ts`:

```ts
import type { DrillInput } from './types'

export type RequiredField =
  | 'name' | 'type' | 'age_band' | 'duration_mins'
  | 'players_min' | 'players_max' | 'setup' | 'how_it_works' | 'coaching_points'

const LABELS: Record<RequiredField, string> = {
  name: 'Name',
  type: 'Type',
  age_band: 'Age band',
  duration_mins: 'Duration',
  players_min: 'Minimum players',
  players_max: 'Maximum players must be at least the minimum',
  setup: 'Setup',
  how_it_works: 'How it works',
  coaching_points: 'At least one coaching point',
}

const blank = (s: string | null | undefined) => (s ?? '').trim().length === 0

/**
 * What is still missing before this drill can be used in a session.
 * Independent of `is_draft`: that flag records intent to finish later, it does
 * not change what a finished drill needs.
 */
export function missingFields(input: DrillInput): RequiredField[] {
  const missing: RequiredField[] = []

  if (blank(input.name)) missing.push('name')
  if (!input.type) missing.push('type')

  // Outfield requires an age band; goalkeeping must never have one (spec 5.3).
  if (input.library === 'outfield' && input.age_band === null) missing.push('age_band')

  if (input.duration_mins === null || input.duration_mins <= 0) missing.push('duration_mins')
  if (input.players_min === null || input.players_min <= 0) missing.push('players_min')

  if (
    input.players_max !== null &&
    input.players_min !== null &&
    input.players_max < input.players_min
  ) {
    missing.push('players_max')
  }

  if (blank(input.setup)) missing.push('setup')
  if (blank(input.how_it_works)) missing.push('how_it_works')

  if (input.coaching_points.filter((p) => !blank(p)).length === 0) {
    missing.push('coaching_points')
  }

  return missing
}

export function isComplete(input: DrillInput): boolean {
  return missingFields(input).length === 0
}

export function fieldLabel(field: RequiredField): string {
  return LABELS[field]
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — 12 new tests, 38 total.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add drill completeness validation"
```

---

## Task 5: Image compression

Canvas is not available in the Node test environment, so the arithmetic is separated from the drawing. `computeTargetSize` is pure and tested; the canvas wrapper around it is not.

**Files:**
- Create: `src/lib/image.ts`, `src/lib/image.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `MAX_EDGE`, `JPEG_QUALITY`, `TARGET_BYTES`, `computeTargetSize(w, h, maxEdge?)`, `compressImage(file)` returning `Promise<Blob>` from `@/lib/image`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/image.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { MAX_EDGE, computeTargetSize } from './image'

describe('computeTargetSize', () => {
  it('caps the longest edge at 1000px', () => {
    expect(MAX_EDGE).toBe(1000)
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1000, height: 750 })
  })

  it('caps height when the image is portrait', () => {
    expect(computeTargetSize(3000, 4000)).toEqual({ width: 750, height: 1000 })
  })

  it('leaves images already within the cap untouched', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('never upscales', () => {
    expect(computeTargetSize(200, 100)).toEqual({ width: 200, height: 100 })
  })

  it('handles a square image', () => {
    expect(computeTargetSize(2400, 2400)).toEqual({ width: 1000, height: 1000 })
  })

  it('rounds to whole pixels', () => {
    const { width, height } = computeTargetSize(1333, 999)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
    expect(width).toBe(1000)
    expect(height).toBe(750)
  })

  it('never rounds a dimension down to zero', () => {
    // A 4000x1 panorama must still be at least one pixel tall.
    expect(computeTargetSize(4000, 1).height).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/lib/image.test.ts`
Expected: FAIL — cannot resolve `./image`.

- [ ] **Step 3: Implement**

Create `src/lib/image.ts`:

```ts
export const MAX_EDGE = 1000
export const JPEG_QUALITY = 0.7
export const TARGET_BYTES = 150 * 1024

/**
 * Longest edge capped at MAX_EDGE, aspect ratio preserved, never upscaled.
 * Pure arithmetic so it can be tested without a canvas.
 */
export function computeTargetSize(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/**
 * Browser-only. Resizes to MAX_EDGE and encodes JPEG at JPEG_QUALITY,
 * stepping quality down if the result still exceeds TARGET_BYTES.
 * Spec 7.3.
 */
export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const { width, height } = computeTargetSize(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const encode = (quality: number) =>
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Image encoding failed'))),
        'image/jpeg',
        quality,
      )
    })

  let quality = JPEG_QUALITY
  let blob = await encode(quality)
  // Photos of paper compress well; three steps is ample and bounded.
  while (blob.size > TARGET_BYTES && quality > 0.4) {
    quality -= 0.1
    blob = await encode(quality)
  }
  return blob
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS — 7 new tests, 45 total.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add image compression with tested target-size arithmetic"
```

---

## Task 6: Data access layer

**Files:**
- Create: `src/lib/drills.ts`

**Interfaces:**
- Consumes: `createServerClient` from `@/lib/supabase/server`; `createBrowserClient` from `@/lib/supabase/client`; `Drill`, `DrillInput`, `Library` from `@/lib/types`; `compressImage` from `@/lib/image`
- Produces: `listDrills(library)`, `getDrill(id)`, `createDrill(input)`, `updateDrill(id, patch)`, `softDeleteDrill(id)`, `uploadDrillImage(file)`, `countSessionsUsing(drillId)`

- [ ] **Step 1: Implement**

Create `src/lib/drills.ts`:

```ts
import { createBrowserClient } from './supabase/client'
import { createServerClient } from './supabase/server'
import { compressImage } from './image'
import type { Drill, DrillInput, Library } from './types'

/** Server-side. Every live drill in one library, newest first. */
export async function listDrills(library: Library): Promise<Drill[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('drill')
    .select('*')
    .eq('library', library)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list drills: ${error.message}`)
  return data as Drill[]
}

/**
 * Server-side. Does NOT filter deleted_at: a soft-deleted drill is still
 * reachable from a past session, and renders marked "removed from library".
 */
export async function getDrill(id: string): Promise<Drill | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('drill').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load drill: ${error.message}`)
  return (data as Drill) ?? null
}

/** Browser-side. `library` is set here once and never updated again. */
export async function createDrill(input: DrillInput): Promise<Drill> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill').insert(input).select().single()
  if (error) throw new Error(`Failed to save drill: ${error.message}`)
  return data as Drill
}

/** Browser-side. `library` is stripped: a drill's library is permanent (spec 5.4). */
export async function updateDrill(id: string, patch: Partial<DrillInput>): Promise<Drill> {
  const { library: _ignored, ...safe } = patch
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill').update(safe).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update drill: ${error.message}`)
  return data as Drill
}

/** Browser-side. Drills are never hard-deleted (spec 9). */
export async function softDeleteDrill(id: string): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase
    .from('drill')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to delete drill: ${error.message}`)
}

/** Browser-side. Compresses, uploads, returns the public URL. */
export async function uploadDrillImage(file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${crypto.randomUUID()}.jpg`
  const supabase = createBrowserClient()

  const { error } = await supabase.storage
    .from('drill-images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Failed to upload image: ${error.message}`)

  const { data } = supabase.storage.from('drill-images').getPublicUrl(path)
  return data.publicUrl
}

/**
 * How many sessions use this drill. Phase 1 has no session table yet, so this
 * returns 0 and the delete dialog says "not used in any session". Phase 2
 * replaces the body with a count over session_drill; the signature does not change.
 */
export async function countSessionsUsing(_drillId: string): Promise<number> {
  return 0
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add drill data access layer with soft delete and image upload"
```

---

## Task 7: Drill card, grid and shared UI

**Files:**
- Create: `src/components/ui/Segment.tsx`, `src/components/ui/ScreenHeader.tsx`
- Create: `src/components/drills/DrillCard.tsx`, `src/components/drills/DrillGrid.tsx`

**Interfaces:**
- Consumes: `Drill`, `Library` from `@/lib/types`; `typeLabel` from `@/lib/taxonomy`
- Produces:
  - `<Segment value={Library} onChange={(l: Library) => void} />`
  - `<ScreenHeader title={string} backHref={string} backLabel={string} right={ReactNode} />`
  - `<DrillCard drill={Drill} />`
  - `<DrillGrid drills={Drill[]} emptyState={ReactNode} />`

- [ ] **Step 1: Build the segmented control**

Create `src/components/ui/Segment.tsx`:

```tsx
'use client'

import type { Library } from '@/lib/types'

export function Segment({
  value,
  onChange,
}: {
  value: Library
  onChange: (library: Library) => void
}) {
  const options: Library[] = ['outfield', 'goalkeeping']
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        borderRadius: 999,
        overflow: 'hidden',
        background: 'rgba(243,240,234,0.08)',
      }}
    >
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            style={{
              border: 'none',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 12,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--ground)' : 'var(--ink-45)',
            }}
          >
            {option === 'outfield' ? 'Outfield' : 'Goalkeeping'}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Build the screen header**

Create `src/components/ui/ScreenHeader.tsx`:

```tsx
import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Persistent back control, per spec 6.1: no nav bar, nothing more than two
 * levels deep. In Phase 1 the Drills screen is the front door, so it passes no
 * backHref. Phase 2 points it at the hub.
 */
export function ScreenHeader({
  title,
  backHref,
  backLabel = 'Back',
  right,
}: {
  title: string
  backHref?: string
  backLabel?: string
  right?: ReactNode
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      {backHref && (
        <Link
          href={backHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'rgba(243,240,234,0.07)',
            padding: '7px 12px 7px 10px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12,
            color: 'var(--ink-70)',
          }}
        >
          <span style={{ color: 'var(--accent)', lineHeight: 1 }}>←</span>
          {backLabel}
        </Link>
      )}
      <h1 style={{ fontSize: 19 }}>{title}</h1>
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </header>
  )
}
```

- [ ] **Step 3: Build the drill card**

Note the cream mat. Spec 7.3: source images are white paper, and without a mat a grid of them flares against the dark UI.

Create `src/components/drills/DrillCard.tsx`:

```tsx
import Link from 'next/link'
import { typeLabel } from '@/lib/taxonomy'
import type { Drill } from '@/lib/types'

function playersLabel(drill: Drill): string {
  if (drill.players_min === null) return '—'
  return drill.players_max === null
    ? `${drill.players_min}+`
    : `${drill.players_min}–${drill.players_max}`
}

export function DrillCard({ drill }: { drill: Drill }) {
  return (
    <Link
      href={`/drills/${drill.id}`}
      style={{
        display: 'block',
        background: 'var(--card)',
        border: `1px solid ${drill.is_draft ? 'rgba(241,94,34,0.4)' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius)',
        padding: 12,
      }}
    >
      {/* Cream mat: contains the image rather than cropping it, so a grid of
          white-paper diagrams reads as consistent shapes. */}
      <div
        style={{
          background: 'var(--ink)',
          borderRadius: 'var(--radius-sm)',
          height: 76,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          padding: 6,
          marginBottom: 10,
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
              color: 'rgba(21,21,21,0.35)',
            }}
          >
            NO IMAGE
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 14 }}>{drill.name}</h3>

      <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 7 }}>
        {typeLabel(drill.type)}
        {drill.age_band && ` · ${drill.age_band}`}
      </div>

      <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 4 }}>
        {drill.duration_mins === null ? '— min' : `${drill.duration_mins} min`}
        {' · '}
        {playersLabel(drill)}
        {drill.bibs_needed && ' · bibs'}
      </div>

      {drill.is_draft && (
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', marginTop: 7 }}>
          Draft — needs finishing
        </div>
      )}
    </Link>
  )
}
```

- [ ] **Step 4: Build the grid**

Create `src/components/drills/DrillGrid.tsx`:

```tsx
import type { ReactNode } from 'react'
import type { Drill } from '@/lib/types'
import { DrillCard } from './DrillCard'

export function DrillGrid({
  drills,
  emptyState,
}: {
  drills: Drill[]
  emptyState: ReactNode
}) {
  if (drills.length === 0) return <>{emptyState}</>
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10,
      }}
    >
      {drills.map((drill) => (
        <DrillCard key={drill.id} drill={drill} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add drill card with cream-matted thumbnail, grid and shared UI"
```

---

## Task 8: The Drills screen

**Files:**
- Create: `src/components/drills/FilterPanel.tsx`, `src/components/drills/ActiveFilterSummary.tsx`, `src/components/drills/DrillsBrowser.tsx`
- Modify: `src/app/drills/page.tsx` (replace the Task 1 placeholder entirely)

**Interfaces:**
- Consumes: everything from Tasks 3, 6, 7
- Produces: `<DrillsBrowser outfield={Drill[]} goalkeeping={Drill[]} />`; the working `/drills` route

- [ ] **Step 1: Build the filter panel**

Create `src/components/drills/FilterPanel.tsx`:

```tsx
'use client'

import { AGE_BANDS, typeLabel, typesFor } from '@/lib/taxonomy'
import type { DrillFilter, DurationBucket, SortDir, SortKey } from '@/lib/filters'
import type { AgeBand, DrillType, Library } from '@/lib/types'

const DURATIONS: { value: DurationBucket; label: string }[] = [
  { value: 'lte10', label: '≤ 10 min' },
  { value: '10to20', label: '10–20 min' },
  { value: 'gte20', label: '20+ min' },
]

function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: 'none',
        padding: '5px 0',
        width: '100%',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 500,
        color: checked ? 'var(--ink)' : 'var(--ink-70)',
      }}
    >
      <span
        style={{
          width: 13,
          height: 13,
          flex: 'none',
          borderRadius: 3,
          border: `1.5px solid ${checked ? 'var(--accent)' : 'rgba(243,240,234,0.25)'}`,
          background: checked ? 'var(--accent)' : 'transparent',
        }}
      />
      {label}
    </button>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

export function FilterPanel({
  library,
  filter,
  onChange,
  sortKey,
  sortDir,
  onSortChange,
}: {
  library: Library
  filter: DrillFilter
  onChange: (next: DrillFilter) => void
  sortKey: SortKey
  sortDir: SortDir
  onSortChange: (key: SortKey, dir: SortDir) => void
}) {
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  return (
    <div>
      <Group label="Type">
        {typesFor(library).map((type) => (
          <Checkbox
            key={type}
            label={typeLabel(type)}
            checked={filter.types.includes(type)}
            onToggle={() => onChange({ ...filter, types: toggle<DrillType>(filter.types, type) })}
          />
        ))}
      </Group>

      {/* Age band is outfield-only (spec 5.3). */}
      {library === 'outfield' && (
        <Group label="Age band">
          {AGE_BANDS.map((band) => (
            <Checkbox
              key={band}
              label={band}
              checked={filter.ageBands.includes(band)}
              onToggle={() =>
                onChange({ ...filter, ageBands: toggle<AgeBand>(filter.ageBands, band) })
              }
            />
          ))}
        </Group>
      )}

      <Group label="Duration">
        {DURATIONS.map(({ value, label }) => (
          <Checkbox
            key={value}
            label={label}
            checked={filter.durations.includes(value)}
            onToggle={() =>
              onChange({ ...filter, durations: toggle<DurationBucket>(filter.durations, value) })
            }
          />
        ))}
      </Group>

      <Group label="Players today">
        <input
          type="number"
          min={1}
          inputMode="numeric"
          placeholder="How many?"
          value={filter.playersToday ?? ''}
          onChange={(e) =>
            onChange({
              ...filter,
              playersToday: e.target.value === '' ? null : Number(e.target.value),
            })
          }
          style={{
            width: '100%',
            background: 'rgba(243,240,234,0.06)',
            border: '1px solid rgba(243,240,234,0.12)',
            borderRadius: 6,
            padding: '8px 10px',
            color: 'var(--ink)',
            fontSize: 12,
            fontWeight: 600,
          }}
        />
      </Group>

      <Group label="Sort by">
        <select
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(':')
            onSortChange(key as SortKey, dir as SortDir)
          }}
          style={{
            width: '100%',
            background: 'rgba(243,240,234,0.06)',
            border: '1px solid rgba(243,240,234,0.12)',
            borderRadius: 6,
            padding: '8px 10px',
            color: 'var(--ink)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <option value="duration:asc">Duration, shortest first</option>
          <option value="duration:desc">Duration, longest first</option>
          <option value="players_min:asc">Players, fewest first</option>
          <option value="players_min:desc">Players, most first</option>
        </select>
      </Group>
    </div>
  )
}
```

- [ ] **Step 2: Build the summary line**

Create `src/components/drills/ActiveFilterSummary.tsx`:

```tsx
'use client'

import { describeFilter } from '@/lib/filters'
import type { DrillFilter } from '@/lib/filters'

export function ActiveFilterSummary({
  shown,
  total,
  filter,
  onClearAll,
}: {
  shown: number
  total: number
  filter: DrillFilter
  onClearAll: () => void
}) {
  const description = describeFilter(filter)
  const filtered = description !== 'No filters'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', margin: '12px 0 14px' }}>
      <span className="hl" style={{ fontSize: 17 }}>{shown}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-45)' }}>
        of {total}
        {filtered && ` · ${description}`}
      </span>
      {filtered && (
        <button
          onClick={onClearAll}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}
        >
          Clear all
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Build the browser**

Create `src/components/drills/DrillsBrowser.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  EMPTY_FILTER, activeFilterCount, filterDrills, mostRestrictiveAxis, sortDrills,
} from '@/lib/filters'
import type { DrillFilter, SortDir, SortKey } from '@/lib/filters'
import type { Drill, Library } from '@/lib/types'
import { Segment } from '@/components/ui/Segment'
import { ActiveFilterSummary } from './ActiveFilterSummary'
import { DrillGrid } from './DrillGrid'
import { FilterPanel } from './FilterPanel'

const AXIS_LABELS: Record<string, string> = {
  types: 'type',
  ageBands: 'age band',
  durations: 'duration',
  playersToday: 'player count',
}

export function DrillsBrowser({
  outfield,
  goalkeeping,
}: {
  outfield: Drill[]
  goalkeeping: Drill[]
}) {
  // Spec 5.1: the segment never persists. Every arrival opens on Outfield.
  const [library, setLibrary] = useState<Library>('outfield')
  const [filter, setFilter] = useState<DrillFilter>(EMPTY_FILTER)
  const [sortKey, setSortKey] = useState<SortKey>('duration')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [sheetOpen, setSheetOpen] = useState(false)

  const all = library === 'outfield' ? outfield : goalkeeping
  const drafts = useMemo(() => all.filter((d) => d.is_draft), [all])

  const results = useMemo(
    () => sortDrills(filterDrills(all, filter), sortKey, sortDir),
    [all, filter, sortKey, sortDir],
  )

  function switchLibrary(next: Library) {
    setLibrary(next)
    // Type chips and age bands are library-specific, so a carried-over filter
    // would silently exclude everything.
    setFilter(EMPTY_FILTER)
  }

  const panel = (
    <FilterPanel
      library={library}
      filter={filter}
      onChange={setFilter}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={(k, d) => { setSortKey(k); setSortDir(d) }}
    />
  )

  const emptyState =
    all.length === 0 ? (
      <div style={{ padding: '32px 0', maxWidth: 420 }}>
        <h3 style={{ fontSize: 18 }}>Nothing here yet</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-45)', marginTop: 10 }}>
          Two libraries, kept separate: <strong style={{ color: 'var(--ink)' }}>Outfield</strong> for
          your youth teams, <strong style={{ color: 'var(--ink)' }}>Goalkeeping</strong> for keepers of
          any age. A drill belongs to one of them permanently.
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-45)', marginTop: 10 }}>
          Quick add captures a name, a type and a scribble — finish it later.
        </p>
      </div>
    ) : (
      <EmptyResults drills={all} filter={filter} onChange={setFilter} />
    )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* Desktop sidebar */}
      <aside
        className="filter-sidebar"
        style={{ width: 190, flex: 'none', borderRight: '1px solid var(--hairline)', padding: '18px 16px 28px' }}
      >
        {panel}
      </aside>

      <div style={{ flex: 1, minWidth: 0, padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Segment value={library} onChange={switchLibrary} />
          <Link
            href={`/drills/new?library=${library}&mode=quick`}
            style={{ marginLeft: 'auto', background: 'var(--accent)', color: 'var(--ground)', fontWeight: 600, fontSize: 12, padding: '9px 15px', borderRadius: 8 }}
          >
            + Quick add
          </Link>
        </div>

        <input
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          placeholder="Search name, tags, setup, how it works…"
          style={{
            width: '100%', marginTop: 12,
            background: 'rgba(243,240,234,0.06)',
            border: '1px solid rgba(243,240,234,0.12)',
            borderRadius: 8, padding: '10px 12px',
            color: 'var(--ink)', fontSize: 12,
          }}
        />

        {/* Phone-only filter trigger */}
        <button
          className="filter-trigger"
          onClick={() => setSheetOpen(true)}
          style={{
            display: 'none', width: '100%', marginTop: 10, padding: 10, borderRadius: 8,
            border: 'none', fontSize: 12, fontWeight: 600,
            background: activeFilterCount(filter) > 0 ? 'rgba(241,94,34,0.16)' : 'rgba(243,240,234,0.08)',
            color: activeFilterCount(filter) > 0 ? 'var(--accent)' : 'var(--ink-70)',
          }}
        >
          Filters{activeFilterCount(filter) > 0 ? ` · ${activeFilterCount(filter)}` : ''}
        </button>

        <ActiveFilterSummary
          shown={results.length}
          total={all.length}
          filter={filter}
          onClearAll={() => setFilter({ ...EMPTY_FILTER, search: filter.search })}
        />

        {drafts.length > 0 && (
          <div
            style={{
              border: '1px solid rgba(241,94,34,0.4)', borderRadius: 'var(--radius)',
              padding: '10px 12px', marginBottom: 12,
              fontSize: 12, fontWeight: 600, color: 'var(--accent)',
            }}
          >
            {drafts.length} draft{drafts.length > 1 ? 's' : ''} need finishing before they can go in a session
          </div>
        )}

        <DrillGrid drills={results} emptyState={emptyState} />
      </div>

      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              maxHeight: '80vh', overflowY: 'auto',
              background: 'var(--ground)',
              borderTop: '1px solid var(--hairline)',
              borderRadius: '16px 16px 0 0', padding: 18,
            }}
          >
            <h3 style={{ fontSize: 17, marginBottom: 14 }}>Filters</h3>
            {panel}
            <button
              onClick={() => setSheetOpen(false)}
              style={{ width: '100%', marginTop: 6, padding: 12, borderRadius: 8, border: 'none', background: 'var(--accent)', color: 'var(--ground)', fontWeight: 600, fontSize: 13 }}
            >
              Show {results.length} drills
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Spec 11: offer to clear the most restrictive filter, not only Clear all. */
function EmptyResults({
  drills,
  filter,
  onChange,
}: {
  drills: Drill[]
  filter: DrillFilter
  onChange: (next: DrillFilter) => void
}) {
  const axis = mostRestrictiveAxis(drills, filter)
  return (
    <div style={{ padding: '28px 0', maxWidth: 380 }}>
      <h3 style={{ fontSize: 17 }}>No drills match</h3>
      {axis && (
        <button
          onClick={() =>
            onChange(
              axis === 'playersToday'
                ? { ...filter, playersToday: null }
                : { ...filter, [axis]: [] },
            )
          }
          style={{ marginTop: 12, background: 'var(--accent)', color: 'var(--ground)', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 600 }}
        >
          Clear the {AXIS_LABELS[axis]} filter
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add the responsive rules**

Append to `src/app/globals.css`:

```css
/* Filters live in a sidebar on desktop and a bottom sheet on phone (spec 7.1). */
@media (max-width: 780px) {
  .filter-sidebar { display: none; }
  .filter-trigger { display: block !important; }
}
```

- [ ] **Step 5: Wire the route**

Replace `src/app/drills/page.tsx`:

```tsx
import { DrillsBrowser } from '@/components/drills/DrillsBrowser'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { listDrills } from '@/lib/drills'

// Always fresh: the library changes whenever the coach adds a drill.
export const dynamic = 'force-dynamic'

export default async function DrillsPage() {
  const [outfield, goalkeeping] = await Promise.all([
    listDrills('outfield'),
    listDrills('goalkeeping'),
  ])

  return (
    <main>
      {/* No backHref: Drills is the Phase 1 front door. */}
      <ScreenHeader title="Drills" />
      <DrillsBrowser outfield={outfield} goalkeeping={goalkeeping} />
    </main>
  )
}
```

- [ ] **Step 6: Verify by hand**

Run: `npm run dev`, open `http://localhost:3000/drills`

Check, using the two rows inserted in Task 2 Step 2:
1. The screen opens on **Outfield**. Switch to Goalkeeping, navigate away, come back — it is on Outfield again.
2. The draft row appears with an orange border and the "1 draft needs finishing" banner.
3. Ticking **Possession / Rondo** narrows results and the summary reads `1 of 2 · Possession / Rondo`.
4. Entering **20** in Players today hides Four-Goal Rondo — its maximum is 12. **This is the PRD bug fixed; if the drill still shows, Task 3 is not wired up.**
5. Entering **10** shows it again.
6. Narrow the window under 780px: the sidebar is replaced by a `Filters · N` button opening a bottom sheet.
7. Filter to nothing and confirm the offer names a specific axis, not just Clear all.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Drills screen with filter panel, sheet and draft surfacing"
```

---

## Task 9: Capture, detail, edit and soft delete

**Files:**
- Create: `src/components/drills/PhotoField.tsx`, `src/components/drills/DrillForm.tsx`, `src/components/drills/DeleteDrillDialog.tsx`
- Create: `src/app/drills/new/page.tsx`, `src/app/drills/[id]/page.tsx`, `src/app/drills/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: everything from Tasks 2–7
- Produces: `<PhotoField value={string|null} onChange={(url: string|null) => void} />`; `<DrillForm library={Library} initial={Drill|null} mode={'quick'|'full'} />`; `<DeleteDrillDialog drillId={string} drillName={string} sessionCount={number} />`; routes `/drills/new`, `/drills/[id]`, `/drills/[id]/edit`

- [ ] **Step 1: Build the photo field**

Create `src/components/drills/PhotoField.tsx`:

```tsx
'use client'

import { useRef, useState } from 'react'
import { uploadDrillImage } from '@/lib/drills'

export function PhotoField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadDrillImage(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Photo</div>

      <div
        style={{
          background: 'var(--ink)', borderRadius: 'var(--radius-sm)',
          minHeight: 120, display: 'grid', placeItems: 'center',
          padding: 8, overflow: 'hidden',
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', color: 'rgba(21,21,21,0.35)' }}>
            {busy ? 'COMPRESSING…' : 'NO IMAGE'}
          </span>
        )}
      </div>

      {/* capture="environment" opens the camera directly on phone. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          style={{ background: 'rgba(243,240,234,0.08)', border: 'none', borderRadius: 7, padding: '8px 13px', fontSize: 12, fontWeight: 600, color: 'var(--ink-70)' }}
        >
          {value ? 'Replace' : 'Add photo'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}
          >
            Remove
          </button>
        )}
      </div>

      {error && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8 }}>{error}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Build the form**

Create `src/components/drills/DrillForm.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createDrill, updateDrill } from '@/lib/drills'
import { AGE_BANDS, typeLabel, typesFor } from '@/lib/taxonomy'
import type { Drill, DrillInput, DrillType, Library } from '@/lib/types'
import { fieldLabel, missingFields } from '@/lib/validation'
import { PhotoField } from './PhotoField'

const field: React.CSSProperties = {
  width: '100%', background: 'rgba(243,240,234,0.06)',
  border: '1px solid rgba(243,240,234,0.12)', borderRadius: 7,
  padding: '9px 11px', color: 'var(--ink)', fontSize: 13,
  fontFamily: 'inherit', fontWeight: 500,
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 15 }}>
      <div className="lbl" style={{ marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  )
}

function emptyInput(library: Library): DrillInput {
  return {
    library, name: '', type: typesFor(library)[0], age_band: null,
    suitable_from: null, duration_mins: null, players_min: null, players_max: null,
    goals_needed: 0, cones_needed: 0, bibs_needed: false, image_url: null,
    setup: '', how_it_works: '', coaching_points: [''], progressions: null,
    source: null, tags: [], is_draft: true,
  }
}

export function DrillForm({
  library,
  initial,
  mode,
}: {
  library: Library
  initial: Drill | null
  mode: 'quick' | 'full'
}) {
  const router = useRouter()
  const [full, setFull] = useState(mode === 'full')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [draft, setDraft] = useState<DrillInput>(() => {
    if (!initial) return emptyInput(library)
    const { id: _i, deleted_at: _d, created_at: _c, updated_at: _u, ...rest } = initial
    return { ...rest, coaching_points: rest.coaching_points.length ? rest.coaching_points : [''] }
  })

  const set = <K extends keyof DrillInput>(key: K, value: DrillInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const missing = missingFields(draft)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const payload: DrillInput = {
        ...draft,
        // Library is fixed at creation and never changes (spec 5.4).
        library: initial ? initial.library : library,
        coaching_points: draft.coaching_points.map((p) => p.trim()).filter(Boolean),
        // A drill with anything missing stays a draft, whichever button was used.
        is_draft: missing.length > 0,
        age_band: draft.library === 'goalkeeping' ? null : draft.age_band,
        suitable_from: draft.library === 'outfield' ? null : draft.suitable_from,
      }
      const saved = initial ? await updateDrill(initial.id, payload) : await createDrill(payload)
      router.push(`/drills/${saved.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 640 }}>
      <Field label="Name">
        <input style={field} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Four-Goal Rondo" />
      </Field>

      <Field label="Type">
        <select style={field} value={draft.type} onChange={(e) => set('type', e.target.value as DrillType)}>
          {typesFor(draft.library).map((t) => (
            <option key={t} value={t}>{typeLabel(t)}</option>
          ))}
        </select>
      </Field>

      {!full && (
        <>
          <Field label="Notes — tidy it up later">
            <textarea
              style={{ ...field, minHeight: 110, resize: 'vertical' }}
              value={draft.setup}
              onChange={(e) => set('setup', e.target.value)}
              placeholder="Anything you want to remember. This lands in Setup."
            />
          </Field>
          <button
            type="button"
            onClick={() => setFull(true)}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, marginBottom: 18, padding: 0 }}
          >
            Add the full details now →
          </button>
        </>
      )}

      {full && (
        <>
          {draft.library === 'outfield' ? (
            <Field label="Age band">
              <select
                style={field}
                value={draft.age_band ?? ''}
                onChange={(e) => set('age_band', e.target.value === '' ? null : (e.target.value as Drill['age_band']))}
              >
                <option value="">Choose…</option>
                {AGE_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          ) : (
            <Field label="Suitable from (optional)">
              <input
                style={field}
                value={draft.suitable_from ?? ''}
                onChange={(e) => set('suitable_from', e.target.value || null)}
                placeholder="e.g. confident divers only"
              />
            </Field>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Duration (mins)">
              <input type="number" min={1} style={field} value={draft.duration_mins ?? ''}
                onChange={(e) => set('duration_mins', e.target.value === '' ? null : Number(e.target.value))} />
            </Field>
            <Field label="Min players">
              <input type="number" min={1} style={field} value={draft.players_min ?? ''}
                onChange={(e) => set('players_min', e.target.value === '' ? null : Number(e.target.value))} />
            </Field>
            <Field label="Max (blank = any)">
              <input type="number" min={1} style={field} value={draft.players_max ?? ''}
                onChange={(e) => set('players_max', e.target.value === '' ? null : Number(e.target.value))} />
            </Field>
          </div>

          <Field label="Setup">
            <textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} value={draft.setup}
              onChange={(e) => set('setup', e.target.value)} />
          </Field>

          <Field label="How it works">
            <textarea style={{ ...field, minHeight: 80, resize: 'vertical' }} value={draft.how_it_works}
              onChange={(e) => set('how_it_works', e.target.value)} />
          </Field>

          {/* A repeating list, never one text box (spec 7.2). */}
          <Field label="Coaching points — at least one">
            {draft.coaching_points.map((point, i) => (
              <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
                <input
                  style={field}
                  value={point}
                  placeholder={i === 0 ? 'Scan before receiving' : 'Another point'}
                  onChange={(e) => {
                    const next = [...draft.coaching_points]
                    next[i] = e.target.value
                    set('coaching_points', next)
                  }}
                />
                {draft.coaching_points.length > 1 && (
                  <button type="button"
                    onClick={() => set('coaching_points', draft.coaching_points.filter((_, j) => j !== i))}
                    style={{ background: 'none', border: 'none', color: 'var(--ink-45)', fontSize: 16, padding: '0 6px' }}>
                    ×
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => set('coaching_points', [...draft.coaching_points, ''])}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: 0 }}>
              + Add coaching point
            </button>
          </Field>

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Goals"><input type="number" min={0} style={field} value={draft.goals_needed}
              onChange={(e) => set('goals_needed', Number(e.target.value || 0))} /></Field>
            <Field label="Cones"><input type="number" min={0} style={field} value={draft.cones_needed}
              onChange={(e) => set('cones_needed', Number(e.target.value || 0))} /></Field>
            <Field label="Bibs">
              <button type="button" onClick={() => set('bibs_needed', !draft.bibs_needed)}
                style={{ ...field, textAlign: 'left', fontWeight: 600, color: draft.bibs_needed ? 'var(--accent)' : 'var(--ink-45)' }}>
                {draft.bibs_needed ? 'Needed' : 'Not needed'}
              </button>
            </Field>
          </div>

          <Field label="Progressions (optional)">
            <textarea style={{ ...field, minHeight: 60, resize: 'vertical' }} value={draft.progressions ?? ''}
              onChange={(e) => set('progressions', e.target.value || null)} />
          </Field>

          <Field label="Source (optional)">
            <input style={field} value={draft.source ?? ''} onChange={(e) => set('source', e.target.value || null)}
              placeholder="Coaching course, Instagram, a colleague…" />
          </Field>

          <Field label="Tags (comma separated)">
            <input style={field} value={draft.tags.join(', ')}
              onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))} />
          </Field>

          <div style={{ marginBottom: 18 }}>
            <PhotoField value={draft.image_url} onChange={(url) => set('image_url', url)} />
          </div>
        </>
      )}

      {missing.length > 0 && (
        <div style={{ border: '1px solid rgba(241,94,34,0.4)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 15 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            Saves as a draft. Still needed before it can go in a session:
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--ink-70)' }}>
            {missing.map((f) => <li key={f}>{fieldLabel(f)}</li>)}
          </ul>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>{error}</div>}

      <button
        onClick={save}
        disabled={saving || draft.name.trim() === ''}
        style={{
          background: 'var(--accent)', color: 'var(--ground)', border: 'none',
          borderRadius: 8, padding: '12px 20px', fontSize: 13, fontWeight: 600,
          opacity: saving || draft.name.trim() === '' ? 0.5 : 1,
        }}
      >
        {saving ? 'Saving…' : missing.length > 0 ? 'Save draft' : 'Save drill'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Build the delete dialog**

Create `src/components/drills/DeleteDrillDialog.tsx`:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { softDeleteDrill } from '@/lib/drills'

export function DeleteDrillDialog({
  drillId,
  drillName,
  sessionCount,
}: {
  drillId: string
  drillName: string
  sessionCount: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  // Spec 9: the confirmation names the consequence, not a generic warning.
  const consequence =
    sessionCount === 0
      ? 'It is not used in any session.'
      : `It is used in ${sessionCount} session${sessionCount > 1 ? 's' : ''}. Those sessions keep it, marked as removed from the library.`

  async function confirm() {
    setBusy(true)
    await softDeleteDrill(drillId)
    router.push('/drills')
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ background: 'none', border: '1px solid rgba(243,240,234,0.2)', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 600, color: 'var(--ink-70)' }}>
        Delete
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 30 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius)', padding: 20, maxWidth: 400 }}>
            <h3 style={{ fontSize: 18 }}>Delete {drillName}?</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 10 }}>{consequence}</p>
            <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
              <button onClick={confirm} disabled={busy}
                style={{ background: 'var(--accent)', color: 'var(--ground)', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 600 }}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: '1px solid rgba(243,240,234,0.2)', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 600, color: 'var(--ink-70)' }}>
                Keep it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Add the new-drill route**

Create `src/app/drills/new/page.tsx`:

```tsx
import { DrillForm } from '@/components/drills/DrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import type { Library } from '@/lib/types'

export default async function NewDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ library?: string; mode?: string }>
}) {
  const params = await searchParams
  const library: Library = params.library === 'goalkeeping' ? 'goalkeeping' : 'outfield'
  const mode = params.mode === 'full' ? 'full' : 'quick'

  return (
    <main>
      <ScreenHeader
        title={library === 'outfield' ? 'New outfield drill' : 'New goalkeeping drill'}
        backHref="/drills"
        backLabel="Drills"
      />
      <DrillForm library={library} initial={null} mode={mode} />
    </main>
  )
}
```

- [ ] **Step 5: Add the detail route**

Create `src/app/drills/[id]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DeleteDrillDialog } from '@/components/drills/DeleteDrillDialog'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { countSessionsUsing, getDrill } from '@/lib/drills'
import { typeLabel } from '@/lib/taxonomy'

export const dynamic = 'force-dynamic'

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <div className="lbl" style={{ marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-70)', whiteSpace: 'pre-wrap' }}>{children}</div>
    </section>
  )
}

export default async function DrillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const drill = await getDrill(id)
  if (!drill) notFound()

  const sessionCount = await countSessionsUsing(drill.id)

  return (
    <main>
      <ScreenHeader
        title={drill.name}
        backHref="/drills"
        backLabel="Drills"
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/drills/${drill.id}/edit`}
              style={{ background: 'rgba(243,240,234,0.08)', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 600, color: 'var(--ink-70)' }}>
              Edit
            </Link>
            <DeleteDrillDialog drillId={drill.id} drillName={drill.name} sessionCount={sessionCount} />
          </div>
        }
      />

      <div style={{ padding: 18, maxWidth: 640 }}>
        {drill.deleted_at && (
          <div style={{ border: '1px solid rgba(241,94,34,0.4)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 18, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            Removed from the library. Past sessions keep it.
          </div>
        )}

        {drill.image_url && (
          <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 20, display: 'grid', placeItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={drill.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--ink-45)', marginBottom: 20 }}>
          {typeLabel(drill.type)}
          {drill.age_band && ` · ${drill.age_band}`}
          {drill.duration_mins !== null && ` · ${drill.duration_mins} min`}
          {drill.players_min !== null &&
            ` · ${drill.players_min}${drill.players_max === null ? '+' : `–${drill.players_max}`} players`}
        </div>

        {drill.suitable_from && <Block label="Suitable from">{drill.suitable_from}</Block>}
        {drill.setup && <Block label="Setup">{drill.setup}</Block>}
        {drill.how_it_works && <Block label="How it works">{drill.how_it_works}</Block>}

        {drill.coaching_points.length > 0 && (
          <Block label="Coaching points">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {drill.coaching_points.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
            </ul>
          </Block>
        )}

        {drill.progressions && <Block label="Progressions">{drill.progressions}</Block>}

        <Block label="Equipment">
          {drill.goals_needed} goals · {drill.cones_needed} cones ·{' '}
          {drill.bibs_needed ? 'bibs needed' : 'no bibs'}
        </Block>

        {drill.tags.length > 0 && <Block label="Tags">{drill.tags.join(', ')}</Block>}
        {drill.source && <Block label="Source">{drill.source}</Block>}

        {/* Reflection history and add-to-session arrive in Phase 2 with the
            session tables. */}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Add the edit route**

Create `src/app/drills/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { DrillForm } from '@/components/drills/DrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { getDrill } from '@/lib/drills'

export const dynamic = 'force-dynamic'

export default async function EditDrillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const drill = await getDrill(id)
  if (!drill) notFound()

  return (
    <main>
      <ScreenHeader title={`Edit ${drill.name}`} backHref={`/drills/${drill.id}`} backLabel="Back" />
      {/* Editing always opens in full mode: quick add is for capture only. */}
      <DrillForm library={drill.library} initial={drill} mode="full" />
    </main>
  )
}
```

- [ ] **Step 7: Verify the whole loop by hand**

Run: `npm run dev`

1. `/drills` → **+ Quick add** → enter only a name and type → **Save draft**. It saves, lands on detail, and appears in the grid with an orange border and the draft banner.
2. Edit that draft → fill everything including one coaching point → save. The draft banner disappears, the card border returns to normal.
3. Try to save with the coaching point emptied — the panel lists *At least one coaching point* and the button reads **Save draft**.
4. Add a photo of something white and paper-like. Confirm it sits contained on a cream tile, not cropped or flaring.
5. In DevTools → Network, check the uploaded object is **under 150KB**.
6. Create a goalkeeping drill: the type list shows the eight GK types, no age band appears, *Suitable from* does.
7. Delete a drill: the dialog names the consequence and says it is used in no sessions. Confirm, and it vanishes from the library.
8. In the Supabase table editor, confirm the row still exists with `deleted_at` set. **If the row is gone, the delete is hard and must be fixed.**
9. Visit `/drills/<that id>` directly — it still renders, with the "Removed from the library" banner.

- [ ] **Step 8: Run the full suite and typecheck**

```bash
npm test
npx tsc --noEmit
npm run build
```

Expected: 45 tests pass, no type errors, clean production build.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add drill capture, detail, edit and soft delete"
```

---

## Self-review

**Spec coverage.** Every Phase 1 item in spec §14 maps to a task: drill model with soft delete → 2; Drills screen with filter panel → 8; correct player predicate → 3; quick and full capture → 9; photo attachment with cream mats → 5, 7, 9; drill detail → 9; delete with confirmation → 9; Drills as front door → 1.

Spec sections deliberately deferred, all Phase 2 or 3: `drill_stats` and reflection history on drill detail (§10 — needs `session_drill`); add-to-session and the session tray (§7.4); hub, schedule and `ScreenHeader`'s hub target (§6.2); teams, Byga and JSON export (§7.6, §7.7, §12). `countSessionsUsing` is a Phase 1 stub returning 0 with the signature Phase 2 needs, so the delete dialog does not have to change.

**Placeholders.** None. Every code step carries complete, runnable content.

**Type consistency.** `Library`, `AgeBand`, `DrillType`, `Drill`, `DrillInput` are defined once in Task 2 and used unchanged throughout. `DrillFilter` and `EMPTY_FILTER` originate in Task 3 and are consumed identically in Task 8. `missingFields` and `fieldLabel` are defined in Task 4 and called in Task 9. `compressImage` is defined in Task 5 and called only through `uploadDrillImage` in Task 6.

**Known limitation, recorded deliberately.** The Drills screen fetches both libraries in full on every load and filters in memory. Correct and instant at the spec's scale (25 drills by week 6); revisit past roughly 1000.
