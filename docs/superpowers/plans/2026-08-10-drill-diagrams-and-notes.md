# Drill Diagrams and Structured Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach draw editable pitch diagrams for a drill (a real in-app canvas, not an uploaded flat image) and turn `Setup`/`How it works` into structured bullet lists, matching `Coaching points` — surfaced on the drill detail page (now a two-column desktop layout), the diagram editor screens, and the pitchside Session view/print sheet.

**Architecture:** Diagrams are plain JSON (`elements: DiagramElement[]`) stored in a new `drill_diagram` table, one row per diagram, several diagrams per drill. The editor is a hand-rolled SVG canvas using the Pointer Events API (no canvas library) — the same elements JSON that gets saved is what gets rendered, on screen and in print, via one shared read-only `<DiagramView>` used everywhere a diagram is displayed but not edited.

**Tech Stack:** Next.js (App Router, Server Components + `'use client'` islands), Supabase (Postgres + `@supabase/ssr`), Vitest, plain inline-style React (no CSS framework) — matches the existing codebase exactly, no new dependencies.

## Global Constraints

- No auth: every table's RLS policy is wide-open to the anon role (spec 12 of the Phase 2 design). `drill_diagram` follows the same pattern as `drill` and `session`.
- `library` is fixed at drill creation and never updates (spec 5.4) — unaffected by this work, called out only because `DrillForm` code sits next to what this plan touches.
- Diagrams are never resized/rotated after placement in v1; `pitch_preset` is fixed at diagram creation (per `docs/superpowers/specs/2026-08-10-drill-diagrams-and-notes-design.md`).
- Diagram save order is creation order — no drag-to-reorder in v1.
- Every new/changed pure-logic module gets Vitest coverage. UI-only pieces (the editor's pointer interactions, the two-column layout) are manually QA'd — call this out explicitly in each task's testing step, don't fabricate a test for interaction that isn't meaningfully unit-testable.

---

### Task 1: `setup`/`how_it_works` become `text[]`, plus everywhere that currently assumes `string`

**Files:**
- Create: `supabase/migrations/0006_notes_as_lists.sql`
- Modify: `src/lib/types.ts:16-17` (`Drill.setup`, `Drill.how_it_works`)
- Modify: `src/lib/validation.ts`
- Modify: `src/lib/filters.ts:44-53` (`matchesSearch`)
- Modify: `src/lib/validation.test.ts`
- Modify: `src/lib/filters.test.ts`
- Modify: `src/lib/session-timing.test.ts`

**Interfaces:**
- Produces: `Drill.setup: string[]`, `Drill.how_it_works: string[]` — every later task that reads/writes these fields treats them as arrays, same shape as `Drill.coaching_points`.
- Produces: `missingFields`/`invalidFields`/`isComplete` in `validation.ts` unchanged in signature, updated only in how they check `setup`/`how_it_works`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0006_notes_as_lists.sql
-- Setup and How it works become repeating bullet-point lists, matching
-- coaching_points, instead of single free-text paragraphs (drill diagrams +
-- structured notes design, 2026-08-10). Existing text is split on newlines,
-- blank lines dropped — nothing is lost, just reshaped.

alter table drill
  alter column setup type text[]
  using (
    select coalesce(array_agg(line), '{}')
    from unnest(string_to_array(setup, chr(10))) as line
    where btrim(line) <> ''
  ),
  alter column setup set default '{}';

alter table drill
  alter column how_it_works type text[]
  using (
    select coalesce(array_agg(line), '{}')
    from unnest(string_to_array(how_it_works, chr(10))) as line
    where btrim(line) <> ''
  ),
  alter column how_it_works set default '{}';
```

Run it against the local/dev database the way prior migrations in this repo are applied (via the Supabase CLI or dashboard SQL editor — there's no migration-runner script in `package.json`, matching how `0001`-`0005` were applied).

- [ ] **Step 2: Update `Drill` type**

In `src/lib/types.ts`, change:

```ts
  setup: string
  how_it_works: string
```

to:

```ts
  setup: string[]
  how_it_works: string[]
```

- [ ] **Step 3: Update the failing tests first**

In `src/lib/validation.test.ts`, change the `input()` fixture (around line 10-11):

```ts
    bibs_needed: true, image_url: null, setup: ['30x20 grid'],
    how_it_works: ['5v3 possession'], coaching_points: ['Scan before receiving'],
```

Change the blank-fields test (around line 46-51):

```ts
  it('requires name, setup and how_it_works to be non-blank', () => {
    const got = missingFields(input({ name: '  ', setup: [], how_it_works: ['   '] }))
    expect(got).toContain('name')
    expect(got).toContain('setup')
    expect(got).toContain('how_it_works')
  })
```

Change the `emptyInput`-shaped fixture around line 153 (`name: '', setup: '', how_it_works: '', age_band: null,`) to `name: '', setup: [], how_it_works: [], age_band: null,`.

In `src/lib/filters.test.ts`, change line 16:

```ts
    image_url: null, setup: ['30x20 grid'], how_it_works: ['5v3 possession'],
```

In `src/lib/session-timing.test.ts`, change line 10:

```ts
    bibs_needed: false, image_url: null, setup: [], how_it_works: [],
```

- [ ] **Step 4: Run the tests to verify they fail on type errors, not just assertions**

Run: `npx tsc --noEmit`
Expected: FAIL — `Drill.setup`/`how_it_works` still typed `string` in `types.ts` at this point mismatches the new array fixtures. (If you did Step 2 first, this instead fails because `validation.ts`/`filters.ts` haven't been updated yet — either order is fine, the point is confirming the type-checker catches every touched call site before you fix them.)

- [ ] **Step 5: Update `validation.ts`**

Replace the `blank` check for `setup`/`how_it_works` with the same "at least one non-blank entry" rule `coaching_points` already uses. Add a shared helper and use it for all three list fields:

```ts
const blank = (s: string | null | undefined) => (s ?? '').trim().length === 0
const hasContent = (list: string[]) => list.some((item) => !blank(item))
```

Then in `missingFields`, replace:

```ts
  if (blank(input.setup)) missing.push('setup')
  if (blank(input.how_it_works)) missing.push('how_it_works')

  if (input.coaching_points.filter((p) => !blank(p)).length === 0) {
    missing.push('coaching_points')
  }
```

with:

```ts
  if (!hasContent(input.setup)) missing.push('setup')
  if (!hasContent(input.how_it_works)) missing.push('how_it_works')
  if (!hasContent(input.coaching_points)) missing.push('coaching_points')
```

- [ ] **Step 6: Update `filters.ts`**

In `matchesSearch`, `drill.setup`/`drill.how_it_works` are now arrays — spread them into the haystack instead of joining an array-inside-an-array (which would stringify each as a comma-joined blob):

```ts
  const haystack = [
    drill.name,
    ...drill.setup,
    ...drill.how_it_works,
    ...drill.tags,
  ].join(' ').toLowerCase()
```

- [ ] **Step 7: Run the full test suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS — all tests green, no type errors. (`DrillForm.tsx` and `drills/[id]/page.tsx` still reference `setup`/`how_it_works` as strings at this point and will fail typecheck — that's expected; Tasks 4 and 6 fix those. If you want a clean `tsc --noEmit` at the end of this task specifically, also do the minimal parts of Task 4 Steps 3-4 and Task 6 Step 2 now; otherwise proceed to Task 2 and land the full green state at the end of Task 6.)

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/0006_notes_as_lists.sql src/lib/types.ts src/lib/validation.ts src/lib/filters.ts src/lib/validation.test.ts src/lib/filters.test.ts src/lib/session-timing.test.ts
git commit -m "feat: setup and how_it_works become repeating point lists"
```

---

### Task 2: `drill_diagram` table + `Diagram` types

**Files:**
- Create: `supabase/migrations/0007_drill_diagram.sql`
- Modify: `src/lib/types.ts` (append)

**Interfaces:**
- Produces: `ElementColor`, `ElementKind`, `PitchPreset`, `DiagramElement`, `Diagram`, `DiagramInput` types — every remaining task in this plan imports from here.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0007_drill_diagram.sql
-- The in-app pitch diagram editor. `elements` is the entire serialized
-- canvas — reopening a diagram for editing is just reading this back in, no
-- reconstruction logic needed beyond rendering (drill diagrams + structured
-- notes design, 2026-08-10). Several diagrams per drill; `position` orders
-- them, no drag-to-reorder in v1.

create table drill_diagram (
  id            uuid primary key default gen_random_uuid(),
  drill_id      uuid not null references drill(id) on delete cascade,
  position      int not null,
  title         text,
  pitch_preset  text not null,
  elements      jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint drill_diagram_position_non_negative check (position >= 0),
  constraint drill_diagram_pitch_preset_valid check (pitch_preset in ('full', 'half', 'grid'))
);

create index drill_diagram_drill_idx on drill_diagram (drill_id);

create trigger drill_diagram_updated_at
  before update on drill_diagram
  for each row execute function set_updated_at();

-- Same deliberate no-auth posture as drill and session (spec 12).
alter table drill_diagram enable row level security;

drop policy if exists "public all drill diagrams" on drill_diagram;
create policy "public all drill diagrams" on drill_diagram
  for all using (true) with check (true);
```

Apply it the same way as Task 1's migration.

- [ ] **Step 2: Append the types**

At the end of `src/lib/types.ts`:

```ts
export type ElementColor = 'green' | 'blue' | 'yellow' | 'red' | 'black' | 'gray'
export type ElementKind = 'shape' | 'equipment' | 'player' | 'arrow'
export type PitchPreset = 'full' | 'half' | 'grid'

export interface DiagramElement {
  id: string
  kind: ElementKind
  type: string
  color: ElementColor
  x: number
  y: number
  /** Shapes (drag-sized) and arrows/lines (point-to-point) only. */
  x2?: number
  y2?: number
}

export interface Diagram {
  id: string
  drill_id: string
  position: number
  title: string | null
  pitch_preset: PitchPreset
  elements: DiagramElement[]
  created_at: string
  updated_at: string
}

export type DiagramInput = Omit<Diagram, 'id' | 'created_at' | 'updated_at'>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS — this task only adds new exports, nothing consumes them yet.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_drill_diagram.sql src/lib/types.ts
git commit -m "feat: add drill_diagram table and Diagram types"
```

---

### Task 3: `src/lib/diagram-elements.ts` — pure geometry/color helpers

**Files:**
- Create: `src/lib/diagram-elements.ts`
- Create: `src/lib/diagram-elements.test.ts`

**Interfaces:**
- Consumes: `ElementColor` from `./types` (Task 2).
- Produces: `elementColorHex(color: ElementColor): string`, `normalizeRect(x, y, x2, y2): {x, y, x2, y2}`, `clamp(value, min, max): number`, `wavyPath(x, y, x2, y2): string` — consumed by `DiagramElements.tsx` (Task 5) and `DiagramEditor.tsx` (Task 8).

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/diagram-elements.test.ts
import { describe, expect, it } from 'vitest'
import { clamp, elementColorHex, normalizeRect, wavyPath } from './diagram-elements'

describe('elementColorHex', () => {
  it('maps every palette color to a hex value', () => {
    expect(elementColorHex('green')).toBe('#2ea043')
    expect(elementColorHex('blue')).toBe('#1f6feb')
    expect(elementColorHex('yellow')).toBe('#d4a72c')
    expect(elementColorHex('red')).toBe('#da3633')
    expect(elementColorHex('black')).toBe('#111111')
    expect(elementColorHex('gray')).toBe('#8b949e')
  })
})

describe('normalizeRect', () => {
  it('leaves an already-normalized rect unchanged', () => {
    expect(normalizeRect(10, 10, 50, 40)).toEqual({ x: 10, y: 10, x2: 50, y2: 40 })
  })

  it('swaps a rect dragged up and to the left of its start', () => {
    expect(normalizeRect(50, 40, 10, 10)).toEqual({ x: 10, y: 10, x2: 50, y2: 40 })
  })

  it('handles a rect dragged only leftward', () => {
    expect(normalizeRect(50, 10, 10, 40)).toEqual({ x: 10, y: 10, x2: 50, y2: 40 })
  })
})

describe('clamp', () => {
  it('passes through a value already in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('floors below the minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('ceilings above the maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('wavyPath', () => {
  it('starts at the given start point', () => {
    expect(wavyPath(0, 0, 100, 0)).toMatch(/^M0,0/)
  })

  it('returns a stationary marker for a zero-length segment', () => {
    expect(wavyPath(20, 20, 20, 20)).toBe('M20,20')
  })

  it('produces one Q command per segment', () => {
    const d = wavyPath(0, 0, 120, 0)
    const qCount = (d.match(/Q/g) ?? []).length
    expect(qCount).toBe(6)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/diagram-elements.test.ts`
Expected: FAIL with "Cannot find module './diagram-elements'"

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/diagram-elements.ts
import type { ElementColor } from './types'

const COLOR_HEX: Record<ElementColor, string> = {
  green: '#2ea043',
  blue: '#1f6feb',
  yellow: '#d4a72c',
  red: '#da3633',
  black: '#111111',
  gray: '#8b949e',
}

export function elementColorHex(color: ElementColor): string {
  return COLOR_HEX[color]
}

/**
 * Reorders two corner points so the first is top-left and the second is
 * bottom-right — a shape dragged up-and-left of its start still normalizes
 * to a sane rect instead of a negative width/height.
 */
export function normalizeRect(
  x: number, y: number, x2: number, y2: number,
): { x: number; y: number; x2: number; y2: number } {
  return {
    x: Math.min(x, x2),
    y: Math.min(y, y2),
    x2: Math.max(x, x2),
    y2: Math.max(y, y2),
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * SVG path `d` for a wavy line from (x,y) to (x2,y2): a fixed number of
 * alternating perpendicular bumps, amplitude scaled down for short segments
 * so a small wavy run doesn't produce an exaggerated zigzag.
 */
export function wavyPath(x: number, y: number, x2: number, y2: number): string {
  const SEGMENTS = 6
  const dx = x2 - x
  const dy = y2 - y
  const length = Math.hypot(dx, dy)
  if (length === 0) return `M${x},${y}`

  const amplitude = Math.min(length / SEGMENTS / 2, 8)
  const ux = dx / length
  const uy = dy / length
  // Perpendicular to the line's direction.
  const px = -uy
  const py = ux

  let d = `M${x},${y}`
  for (let i = 1; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const bx = x + dx * t
    const by = y + dy * t
    const side = i % 2 === 0 ? 1 : -1
    const cx = x + dx * (t - 0.5 / SEGMENTS) + px * amplitude * side
    const cy = y + dy * (t - 0.5 / SEGMENTS) + py * amplitude * side
    d += ` Q${cx},${cy} ${bx},${by}`
  }
  return d
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/diagram-elements.test.ts`
Expected: PASS, all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/diagram-elements.ts src/lib/diagram-elements.test.ts
git commit -m "feat: add diagram geometry and color helpers"
```

---

### Task 4: `diagrams-server.ts` + `diagrams.ts` — data access

**Files:**
- Create: `src/lib/diagrams-server.ts`
- Create: `src/lib/diagrams.ts`

**Interfaces:**
- Consumes: `Diagram`, `DiagramInput` from `./types` (Task 2); `createServerClient` from `./supabase/server`; `createBrowserClient` from `./supabase/client`.
- Produces: `listDiagramsForDrill(drillId): Promise<Diagram[]>`, `diagramsByDrillId(drillIds): Promise<Record<string, Diagram[]>>`, `getDiagram(id): Promise<Diagram | null>` (server reads); `createDiagram(input): Promise<Diagram>`, `updateDiagram(id, patch): Promise<Diagram>`, `deleteDiagram(id): Promise<void>` (client writes). Consumed by Tasks 6, 8, 9, 11.

There's no meaningful pure logic to unit test here — every function is a thin Supabase call, same as `drills-server.ts`/`drills.ts` (also untested at that layer). Correctness is verified against the running app in Task 9's manual QA step once the editor can actually call these.

- [ ] **Step 1: Write `diagrams-server.ts`**

```ts
// src/lib/diagrams-server.ts
import { createServerClient } from './supabase/server'
import type { Diagram } from './types'

/**
 * Server-only reads, split out from `./diagrams` for the same reason
 * `drills-server.ts` is split from `drills.ts`: `next/headers` (pulled in by
 * the server Supabase client) must never end up in a client bundle.
 */

/** Server-side. Every diagram for one drill, in position order. */
export async function listDiagramsForDrill(drillId: string): Promise<Diagram[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('drill_diagram')
    .select('*')
    .eq('drill_id', drillId)
    .order('position', { ascending: true })
  if (error) throw new Error(`Failed to list diagrams: ${error.message}`)
  return data as Diagram[]
}

/**
 * Server-side. Every diagram for a set of drills, grouped by drill id — the
 * pitchside Session view's shape, one aggregate query instead of one per
 * drill (same tradeoff as drillCountsBySession in sessions-server.ts).
 */
export async function diagramsByDrillId(drillIds: string[]): Promise<Record<string, Diagram[]>> {
  if (drillIds.length === 0) return {}
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('drill_diagram')
    .select('*')
    .in('drill_id', drillIds)
    .order('position', { ascending: true })
  if (error) throw new Error(`Failed to load diagrams: ${error.message}`)

  const grouped: Record<string, Diagram[]> = {}
  for (const diagram of data as Diagram[]) {
    const existing = grouped[diagram.drill_id] ?? []
    existing.push(diagram)
    grouped[diagram.drill_id] = existing
  }
  return grouped
}

/**
 * Server-side. Does not filter on the parent drill's deleted_at — a diagram
 * on a soft-deleted drill still renders in past sessions, same reasoning as
 * getDrill in drills-server.ts.
 */
export async function getDiagram(id: string): Promise<Diagram | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('drill_diagram').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load diagram: ${error.message}`)
  return (data as Diagram) ?? null
}
```

- [ ] **Step 2: Write `diagrams.ts`**

```ts
// src/lib/diagrams.ts
import { createBrowserClient } from './supabase/client'
import type { Diagram, DiagramInput } from './types'

/** Browser-side writes, safe to import from client components. */

export async function createDiagram(input: DiagramInput): Promise<Diagram> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill_diagram').insert(input).select().single()
  if (error) throw new Error(`Failed to save diagram: ${error.message}`)
  return data as Diagram
}

/**
 * `pitch_preset` and `drill_id` are deliberately not part of the patch type —
 * the background is fixed at creation (design decision: no in-place preset
 * switching) and a diagram's parent drill never changes.
 */
export async function updateDiagram(
  id: string,
  patch: { title: string | null; elements: DiagramInput['elements'] },
): Promise<Diagram> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill_diagram').update(patch).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update diagram: ${error.message}`)
  return data as Diagram
}

export async function deleteDiagram(id: string): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('drill_diagram').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete diagram: ${error.message}`)
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/diagrams-server.ts src/lib/diagrams.ts
git commit -m "feat: add diagram data access layer"
```

---

### Task 5: Rendering — `PitchBackground`, `DiagramElements`, `DiagramView`

**Files:**
- Create: `src/components/diagrams/PitchBackground.tsx`
- Create: `src/components/diagrams/DiagramElements.tsx`
- Create: `src/components/diagrams/DiagramView.tsx`

**Interfaces:**
- Consumes: `elementColorHex`, `normalizeRect`, `wavyPath` from `@/lib/diagram-elements` (Task 3); `Diagram`, `DiagramElement`, `PitchPreset` from `@/lib/types` (Task 2).
- Produces: `PITCH_DIMENSIONS: Record<PitchPreset, {width, height}>`, `<PitchBackground preset />`, `<DiagramElements elements selectedId? onPointerDownElement? />`, `<DiagramView diagram maxWidth? />` — consumed by Tasks 6, 7, 8, 11.

This is rendering-only, no pure logic to isolate for a unit test beyond what Task 3 already covers. Verified visually in Task 9's manual QA once there's a route to view it on.

- [ ] **Step 1: Write `PitchBackground.tsx`**

```tsx
// src/components/diagrams/PitchBackground.tsx
import type { PitchPreset } from '@/lib/types'

export const PITCH_DIMENSIONS: Record<PitchPreset, { width: number; height: number }> = {
  full: { width: 520, height: 800 },
  half: { width: 520, height: 420 },
  grid: { width: 520, height: 520 },
}

const LINE = 'rgba(255,255,255,0.55)'
const GRID_LINE = 'rgba(255,255,255,0.12)'

function GridLines({ width, height }: { width: number; height: number }) {
  const lines: React.ReactNode[] = []
  for (let x = 40; x < width; x += 40) {
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={GRID_LINE} strokeWidth={1} />)
  }
  for (let y = 40; y < height; y += 40) {
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={GRID_LINE} strokeWidth={1} />)
  }
  return <>{lines}</>
}

/** Fixed backgrounds for the three presets a diagram can be created with (design doc, 2026-08-10). Not editable after creation. */
export function PitchBackground({ preset }: { preset: PitchPreset }) {
  const { width, height } = PITCH_DIMENSIONS[preset]
  const goalWidth = 120

  return (
    <g>
      <rect x={0} y={0} width={width} height={height} fill="#2f6b3a" />
      <GridLines width={width} height={height} />
      <rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={LINE} strokeWidth={2} />

      {preset === 'full' && (
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={LINE} strokeWidth={2} />
      )}

      {preset !== 'grid' && (
        <>
          <rect x={(width - goalWidth) / 2} y={height - 28} width={goalWidth} height={24} fill="none" stroke={LINE} strokeWidth={2} />
          {preset === 'full' && (
            <rect x={(width - goalWidth) / 2} y={4} width={goalWidth} height={24} fill="none" stroke={LINE} strokeWidth={2} />
          )}
        </>
      )}
    </g>
  )
}
```

- [ ] **Step 2: Write `DiagramElements.tsx`**

```tsx
// src/components/diagrams/DiagramElements.tsx
'use client'

import type { DiagramElement } from '@/lib/types'
import { elementColorHex, normalizeRect, wavyPath } from '@/lib/diagram-elements'

const RADIUS: Record<string, number> = {
  circle: 14, cone: 6, ball: 6, mannequin: 8,
  'player-circle': 14, 'player-omega': 14, 'player-triangle': 14, 'player-filled': 14,
}

function ShapeEl({ el }: { el: DiagramElement }) {
  const color = elementColorHex(el.color)
  const { x, y, x2, y2 } = normalizeRect(el.x, el.y, el.x2 ?? el.x + 40, el.y2 ?? el.y + 40)
  if (el.type === 'circle') {
    const rx = Math.max((x2 - x) / 2, 4)
    const ry = Math.max((y2 - y) / 2, 4)
    return <ellipse cx={x + rx} cy={y + ry} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={2} />
  }
  return <rect x={x} y={y} width={Math.max(x2 - x, 8)} height={Math.max(y2 - y, 8)} fill="none" stroke={color} strokeWidth={2} />
}

function EquipmentEl({ el }: { el: DiagramElement }) {
  const color = elementColorHex(el.color)
  const r = RADIUS[el.type] ?? 8
  if (el.type === 'cone') {
    return <polygon points={`${el.x},${el.y - r} ${el.x - r},${el.y + r} ${el.x + r},${el.y + r}`} fill={color} />
  }
  if (el.type === 'ball') {
    return <circle cx={el.x} cy={el.y} r={r} fill={color} />
  }
  if (el.type === 'mannequin') {
    return <rect x={el.x - r} y={el.y - r} width={r * 2} height={r * 2} fill={color} />
  }
  // goal-small, ladder, pole, wall share a plain bar marker — distinct icon
  // artwork per equipment type is a v2 refinement, not load-bearing for the
  // editor to work end to end.
  return <rect x={el.x - r} y={el.y - 4} width={r * 2} height={8} fill={color} />
}

function PlayerEl({ el }: { el: DiagramElement }) {
  const color = elementColorHex(el.color)
  const r = RADIUS[el.type] ?? 14
  if (el.type === 'player-filled') return <circle cx={el.x} cy={el.y} r={r} fill={color} />
  if (el.type === 'player-triangle') {
    return <polygon points={`${el.x},${el.y - r} ${el.x - r},${el.y + r} ${el.x + r},${el.y + r}`} fill="none" stroke={color} strokeWidth={2.5} />
  }
  if (el.type === 'player-omega') {
    return <text x={el.x} y={el.y + r / 2} fontSize={r * 2} textAnchor="middle" fill={color}>&#937;</text>
  }
  return <circle cx={el.x} cy={el.y} r={r} fill="none" stroke={color} strokeWidth={2.5} />
}

function ArrowEl({ el }: { el: DiagramElement }) {
  const color = elementColorHex(el.color)
  const x2 = el.x2 ?? el.x
  const y2 = el.y2 ?? el.y
  const markerId = `arrowhead-${el.id}`
  if (el.type === 'arrow-wavy') {
    return <path d={wavyPath(el.x, el.y, x2, y2)} fill="none" stroke={color} strokeWidth={2} markerEnd={`url(#${markerId})`} />
  }
  return (
    <line
      x1={el.x} y1={el.y} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={2}
      strokeDasharray={el.type === 'arrow-dashed' ? '6 5' : undefined}
      markerEnd={el.type !== 'line-solid' ? `url(#${markerId})` : undefined}
    />
  )
}

/**
 * Renders one diagram's elements as SVG. Shared by every place a diagram
 * shows up — read-only (`DiagramView`) and the editable canvas
 * (`DiagramEditor`) — so the exact same markup that gets saved is what gets
 * displayed everywhere. `selectedId`/`onPointerDownElement` are only passed
 * by the editor; a read-only render omits them.
 */
export function DiagramElements({
  elements,
  selectedId,
  onPointerDownElement,
}: {
  elements: DiagramElement[]
  selectedId?: string | null
  onPointerDownElement?: (id: string, e: React.PointerEvent) => void
}) {
  return (
    <>
      <defs>
        {elements
          .filter((el) => el.kind === 'arrow')
          .map((el) => (
            <marker key={el.id} id={`arrowhead-${el.id}`} markerWidth={10} markerHeight={10} refX={8} refY={5} orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={elementColorHex(el.color)} />
            </marker>
          ))}
      </defs>
      {elements.map((el) => (
        <g
          key={el.id}
          onPointerDown={onPointerDownElement ? (e) => onPointerDownElement(el.id, e) : undefined}
          style={{ cursor: onPointerDownElement ? 'pointer' : undefined }}
        >
          {el.kind === 'shape' && <ShapeEl el={el} />}
          {el.kind === 'equipment' && <EquipmentEl el={el} />}
          {el.kind === 'player' && <PlayerEl el={el} />}
          {el.kind === 'arrow' && <ArrowEl el={el} />}
          {selectedId === el.id && (
            <circle cx={el.x} cy={el.y} r={22} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="4 3" />
          )}
        </g>
      ))}
    </>
  )
}
```

- [ ] **Step 3: Write `DiagramView.tsx`**

```tsx
// src/components/diagrams/DiagramView.tsx
import { PITCH_DIMENSIONS, PitchBackground } from './PitchBackground'
import { DiagramElements } from './DiagramElements'
import type { Diagram } from '@/lib/types'

/** Read-only render of a diagram — no pointer handlers. Used in the drill detail gallery and the pitchside Session view/print sheet. */
export function DiagramView({ diagram, maxWidth = 260 }: { diagram: Diagram; maxWidth?: number }) {
  const { width, height } = PITCH_DIMENSIONS[diagram.pitch_preset]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth, display: 'block' }}>
      <PitchBackground preset={diagram.pitch_preset} />
      <DiagramElements elements={diagram.elements} />
    </svg>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/diagrams/PitchBackground.tsx src/components/diagrams/DiagramElements.tsx src/components/diagrams/DiagramView.tsx
git commit -m "feat: add diagram rendering components"
```

---

### Task 6: `DrillForm` — Setup/How it works as point lists; extract `PointListField`

**Files:**
- Create: `src/components/ui/PointListField.tsx`
- Modify: `src/components/drills/DrillForm.tsx`

**Interfaces:**
- Consumes: `Button`, `Field`, `TextInput` from `./Button`/`./Field`/`./TextInput`.
- Produces: `<PointListField label values onChange addLabel placeholder? />` — a reusable repeating-point editor, used for `setup`, `how_it_works`, and (refactored in this task) `coaching_points`.

- [ ] **Step 1: Write `PointListField.tsx`**

Extracted from the coaching-points block already in `DrillForm.tsx` (lines ~208-235) so `setup`/`how_it_works` get the identical pattern without copy-pasting it three times:

```tsx
// src/components/ui/PointListField.tsx
'use client'

import { Button } from './Button'
import { Field } from './Field'
import { TextInput } from './TextInput'

export function PointListField({
  label,
  values,
  onChange,
  addLabel,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (values: string[]) => void
  addLabel: string
  placeholder?: (index: number) => string
}) {
  return (
    <Field label={label}>
      <>
        {values.map((point, i) => (
          <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
            <div style={{ flex: 1 }}>
              <TextInput
                value={point}
                placeholder={placeholder ? placeholder(i) : undefined}
                onChange={(value) => {
                  const next = [...values]
                  next[i] = value
                  onChange(next)
                }}
              />
            </div>
            {values.length > 1 && (
              <Button variant="muted" onClick={() => onChange(values.filter((_, j) => j !== i))}>
                ×
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" onClick={() => onChange([...values, ''])}>
          {addLabel}
        </Button>
      </>
    </Field>
  )
}
```

- [ ] **Step 2: Update `DrillForm.tsx`'s `emptyInput` and save mapping**

Change `emptyInput` (around line 34-40):

```ts
function emptyInput(library: Library): DrillInput {
  return {
    library, name: '', type: typesFor(library)[0], age_band: null,
    suitable_from: null, duration_mins: null, players_min: null, players_max: null,
    goals_needed: 0, cones_needed: 0, bibs_needed: false, image_url: null,
    setup: [''], how_it_works: [''], coaching_points: [''], progressions: null,
    source: null, tags: [], is_draft: true,
  }
}
```

Change the `save()` payload (around line 80-88) to trim/filter `setup`/`how_it_works` the same way `coaching_points` already is:

```ts
      const payload: DrillInput = {
        ...draft,
        library: initial ? initial.library : library,
        setup: draft.setup.map((p) => p.trim()).filter(Boolean),
        how_it_works: draft.how_it_works.map((p) => p.trim()).filter(Boolean),
        coaching_points: draft.coaching_points.map((p) => p.trim()).filter(Boolean),
        is_draft: missing.length > 0,
        age_band: draft.library === 'goalkeeping' ? null : draft.age_band,
        suitable_from: draft.library === 'outfield' ? null : draft.suitable_from,
      }
```

- [ ] **Step 3: Replace the quick-mode Notes field**

The quick-mode block (currently a single `TextArea` landing in `setup`, around line 118-125) becomes a `PointListField`:

```tsx
      {!full && (
        <>
          <div style={{ marginBottom: 15 }}>
            <PointListField
              label="Notes — tidy it up later"
              values={draft.setup}
              onChange={(v) => set('setup', v)}
              addLabel="+ Add another note"
              placeholder={() => 'Anything you want to remember. This lands in Setup.'}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <Button variant="ghost" onClick={() => setFull(true)}>
              Add the full details now →
            </Button>
          </div>
        </>
      )}
```

- [ ] **Step 4: Replace the full-mode Setup, How it works and Coaching points fields**

Replace the Setup `TextArea` block (around line 170-172):

```tsx
          <div style={{ marginTop: 15, marginBottom: 15 }}>
            <PointListField
              label="Setup"
              values={draft.setup}
              onChange={(v) => set('setup', v)}
              addLabel="+ Add setup point"
              placeholder={(i) => (i === 0 ? 'Cones in a 20x20 square' : 'Another point')}
            />
          </div>
```

Replace the How it works `TextArea` block:

```tsx
          <div style={{ marginBottom: 15 }}>
            <PointListField
              label="How it works"
              values={draft.how_it_works}
              onChange={(v) => set('how_it_works', v)}
              addLabel="+ Add point"
              placeholder={(i) => (i === 0 ? 'Players pass inside the square' : 'Another point')}
            />
          </div>
```

Replace the entire Coaching points block (the repeating-point JSX, lines ~200-236) with:

```tsx
          <div style={{ marginBottom: 15 }}>
            <PointListField
              label="Coaching points — at least one"
              values={draft.coaching_points}
              onChange={(v) => set('coaching_points', v)}
              addLabel="+ Add coaching point"
              placeholder={(i) => (i === 0 ? 'Scan before receiving' : 'Another point')}
            />
          </div>
```

Add the import at the top of `DrillForm.tsx`:

```ts
import { PointListField } from '@/components/ui/PointListField'
```

The `TextArea` import from `@/components/ui/TextInput` may now be unused in this file except for `Progressions` (still a free-text field, unaffected) — leave that import in place.

- [ ] **Step 5: Manual QA**

Run `npm run dev`, open `/drills/new?library=outfield`, add several Setup points, several How it works points, several Coaching points, remove one from each, save, and confirm the saved drill's detail page (still showing old single-`<p>` rendering until Task 7) shows the joined text without errors. This step has no automated test — it's pure form-interaction UI, exercised end to end once Task 7 makes the detail page render it correctly too.

- [ ] **Step 6: Typecheck and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/PointListField.tsx src/components/drills/DrillForm.tsx
git commit -m "feat: setup, how it works and coaching points share one point-list editor"
```

---

### Task 7: Drill detail page — bullet rendering, two-column layout, diagrams gallery

**Files:**
- Create: `src/components/diagrams/DeleteDiagramDialog.tsx`
- Create: `src/components/diagrams/DiagramGallery.tsx`
- Modify: `src/app/drills/[id]/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `listDiagramsForDrill` from `@/lib/diagrams-server` (Task 4); `deleteDiagram` from `@/lib/diagrams` (Task 4); `DiagramView` from `@/components/diagrams/DiagramView` (Task 5); `Diagram` from `@/lib/types` (Task 2).
- Produces: `<DiagramGallery drillId diagrams />`, `<DeleteDiagramDialog diagramId onClose />` — reused by nothing else in this plan, but follow the same shape as `DeleteDrillDialog` so future screens can reuse them the same way.

- [ ] **Step 1: Write `DeleteDiagramDialog.tsx`**

Mirrors `DeleteDrillDialog.tsx`'s confirm pattern, but stays on the current page (no navigation) since deleting a diagram doesn't leave the drill detail screen:

```tsx
// src/components/diagrams/DeleteDiagramDialog.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteDiagram } from '@/lib/diagrams'
import { Button } from '@/components/ui/Button'

export function DeleteDiagramDialog({
  diagramId,
  onClose,
}: {
  diagramId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await deleteDiagram(diagramId)
      router.refresh()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 30 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius)', padding: 20, maxWidth: 400 }}>
        <h3 style={{ fontSize: 18 }}>Delete this diagram?</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 10 }}>This can&apos;t be undone.</p>
        {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <Button onClick={confirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</Button>
          <Button variant="secondary" onClick={onClose}>Keep it</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write `DiagramGallery.tsx`**

```tsx
// src/components/diagrams/DiagramGallery.tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Diagram } from '@/lib/types'
import { DiagramView } from './DiagramView'
import { DeleteDiagramDialog } from './DeleteDiagramDialog'
import { Button } from '@/components/ui/Button'

/**
 * Tapping a thumbnail opens the editor directly — nothing is destructive
 * before Save, so no read-only detour is needed first (design doc,
 * 2026-08-10).
 */
export function DiagramGallery({ drillId, diagrams }: { drillId: string; diagrams: Diagram[] }) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Diagrams</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {diagrams.map((diagram) => (
          <div key={diagram.id} style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            <Link href={`/drills/${drillId}/diagrams/${diagram.id}/edit`}>
              <DiagramView diagram={diagram} />
            </Link>
            {diagram.title && (
              <div style={{ fontSize: 11, color: 'var(--on-mat-muted)', marginTop: 4 }}>{diagram.title}</div>
            )}
            <div style={{ marginTop: 6 }}>
              <Button variant="muted" onClick={() => setPendingDeleteId(diagram.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" href={`/drills/${drillId}/diagrams/new`} fullWidth>
          + New diagram
        </Button>
      </div>

      {pendingDeleteId && (
        <DeleteDiagramDialog diagramId={pendingDeleteId} onClose={() => setPendingDeleteId(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add the two-column layout CSS**

In `src/app/globals.css`, append:

```css
/* Drill detail (structured notes + diagrams design, 2026-08-10): main
   column left, sidebar right on desktop, so the page uses the available
   width instead of a lone 640px column. Sidebar content flows after main
   on phone via DOM order — no separate mobile layout to maintain. */
.drill-detail-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  padding: 18px;
}

@media (min-width: 900px) {
  .drill-detail-layout {
    grid-template-columns: minmax(0, 640px) 300px;
    align-items: start;
  }
}
```

- [ ] **Step 4: Rewrite `src/app/drills/[id]/page.tsx`**

Add a `PointList` helper next to the existing `Block` component, fetch diagrams alongside the existing `Promise.all`, and split the body into `.drill-detail-main` / `.drill-detail-sidebar`:

```tsx
import { notFound } from 'next/navigation'
import { DeleteDrillDialog } from '@/components/drills/DeleteDrillDialog'
import { AddToSessionAction } from '@/components/drills/AddToSessionAction'
import { DiagramGallery } from '@/components/diagrams/DiagramGallery'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { backToDrillsHref } from '@/lib/drill-query'
import { countSessionsUsing, getDrill } from '@/lib/drills-server'
import { listDrillHistory, listDrillStats } from '@/lib/sessions-server'
import { listDiagramsForDrill } from '@/lib/diagrams-server'
import { formatLongDate } from '@/lib/dates'
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

function PointList({ points }: { points: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {points.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
    </ul>
  )
}

export default async function DrillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ back?: string | string[]; session?: string | string[] }>
}) {
  const { id } = await params
  const { back, session } = await searchParams
  const drill = await getDrill(id)
  if (!drill) notFound()

  const [sessionCount, allStats, history, diagrams] = await Promise.all([
    countSessionsUsing(drill.id),
    listDrillStats(),
    listDrillHistory(drill.id),
    listDiagramsForDrill(drill.id),
  ])
  const stats = allStats[drill.id]
  const sessionId = typeof session === 'string' && session !== '' ? session : null
  const backHref = sessionId ? `/planner?session=${sessionId}` : backToDrillsHref(back)
  const backLabel = sessionId ? 'Session' : 'Drills'

  return (
    <main>
      <ScreenHeader
        title={drill.name}
        backHref={backHref}
        backLabel={backLabel}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {sessionId && (
              <AddToSessionAction
                sessionId={sessionId}
                drillId={drill.id}
                drillName={drill.name}
                disabled={drill.is_draft}
              />
            )}
            <Button variant="secondary" href={`/drills/${drill.id}/edit`}>Edit</Button>
            <DeleteDrillDialog
              drillId={drill.id}
              drillName={drill.name}
              sessionCount={sessionCount}
              backHref={backHref}
            />
          </div>
        }
      />

      <div className="drill-detail-layout">
        <div className="drill-detail-main">
          {drill.deleted_at && (
            <div style={{ border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 18, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
              Removed from the library. Past sessions keep it.
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
          {drill.setup.length > 0 && <Block label="Setup"><PointList points={drill.setup} /></Block>}
          {drill.how_it_works.length > 0 && <Block label="How it works"><PointList points={drill.how_it_works} /></Block>}
          {drill.coaching_points.length > 0 && <Block label="Coaching points"><PointList points={drill.coaching_points} /></Block>}
          {drill.progressions && <Block label="Progressions">{drill.progressions}</Block>}

          {history.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <div className="lbl" style={{ marginBottom: 7 }}>Reflection history</div>
              {history.map((entry) => (
                <div key={entry.session_id} style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{entry.session_name}</span>
                    {entry.rating !== null && (
                      <span style={{ fontSize: 12, color: 'var(--accent)', whiteSpace: 'nowrap' }}>★ {entry.rating}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 2 }}>
                    {formatLongDate(entry.session_date)}
                    {entry.rating === null && ' · not rated'}
                  </div>
                  {entry.note && (
                    <p style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 6, whiteSpace: 'pre-wrap' }}>{entry.note}</p>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="drill-detail-sidebar">
          {drill.image_url && (
            <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 20, display: 'grid', placeItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={drill.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <DiagramGallery drillId={drill.id} diagrams={diagrams} />
          </div>

          <Block label="Equipment">
            {drill.goals_needed} goals · {drill.cones_needed} cones ·{' '}
            {drill.bibs_needed ? 'bibs needed' : 'no bibs'}
          </Block>

          {drill.tags.length > 0 && <Block label="Tags">{drill.tags.join(', ')}</Block>}
          {drill.source && <Block label="Source">{drill.source}</Block>}

          <Block label="Usage">
            {!stats || stats.times_used === 0
              ? 'Never used'
              : `Used ${stats.times_used} time${stats.times_used === 1 ? '' : 's'}${
                  stats.avg_rating === null ? ' · not yet rated' : ` · avg rating ${stats.avg_rating.toFixed(1)}`
                }`}
          </Block>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Manual QA**

Run `npm run dev`, open a drill with Setup/How it works/Coaching points filled in and confirm all three render as bullet lists. Resize the browser window across 900px and confirm the layout switches from two columns (sidebar on the right) to one column (sidebar content below main) without anything overlapping or getting clipped. Confirm "+ New diagram" is visible and navigates (it 404s until Task 9 — that's expected here).

- [ ] **Step 6: Typecheck and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS — this task doesn't touch any tested logic, so the existing suite should be unaffected.

- [ ] **Step 7: Commit**

```bash
git add src/components/diagrams/DeleteDiagramDialog.tsx src/components/diagrams/DiagramGallery.tsx src/app/drills/\[id\]/page.tsx src/app/globals.css
git commit -m "feat: drill detail page gets a two-column layout, bullet notes and a diagrams gallery"
```

---

### Task 8: `DiagramEditor` — the interactive canvas

**Files:**
- Create: `src/components/diagrams/DiagramEditor.tsx`

**Interfaces:**
- Consumes: `createDiagram`, `updateDiagram` from `@/lib/diagrams` (Task 4); `PITCH_DIMENSIONS`, `PitchBackground` from `./PitchBackground` (Task 5); `DiagramElements` from `./DiagramElements` (Task 5); `clamp`, `normalizeRect`, `elementColorHex` from `@/lib/diagram-elements` (Task 3); `Button` from `@/components/ui/Button`; `Diagram`, `DiagramElement`, `ElementColor`, `ElementKind`, `PitchPreset` from `@/lib/types`.
- Produces: `<DiagramEditor drillId position existing />` where `existing: Diagram | null` — consumed by the two route pages in Task 9.

Pointer-driven canvas interaction isn't meaningfully unit-testable (it's DOM geometry + event sequencing) — Task 3 already covers the pure math it depends on (`normalizeRect`, `clamp`). This task is verified by Task 9's manual QA on both mouse and touch, per the design doc's requirement that the editor work on a phone/tablet.

- [ ] **Step 1: Write `DiagramEditor.tsx`**

```tsx
// src/components/diagrams/DiagramEditor.tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDiagram, updateDiagram } from '@/lib/diagrams'
import { PITCH_DIMENSIONS, PitchBackground } from './PitchBackground'
import { DiagramElements } from './DiagramElements'
import { clamp, elementColorHex, normalizeRect } from '@/lib/diagram-elements'
import { Button } from '@/components/ui/Button'
import type { Diagram, DiagramElement, ElementColor, ElementKind, PitchPreset } from '@/lib/types'

const PALETTE_COLORS: ElementColor[] = ['green', 'blue', 'yellow', 'red', 'black', 'gray']

const SHAPE_TOOLS = [{ type: 'square', label: 'Square' }, { type: 'circle', label: 'Circle' }]
const EQUIPMENT_TOOLS = [
  { type: 'cone', label: 'Cone' }, { type: 'ball', label: 'Ball' }, { type: 'mannequin', label: 'Mannequin' },
  { type: 'goal-small', label: 'Goal' }, { type: 'ladder', label: 'Ladder' },
  { type: 'pole', label: 'Pole' }, { type: 'wall', label: 'Wall' },
]
const PLAYER_TOOLS = [
  { type: 'player-circle', label: 'Outline' }, { type: 'player-filled', label: 'Filled' },
  { type: 'player-triangle', label: 'Triangle' }, { type: 'player-omega', label: 'Omega' },
]
const ARROW_TOOLS = [
  { type: 'arrow-solid', label: 'Solid' }, { type: 'arrow-dashed', label: 'Dashed' },
  { type: 'arrow-wavy', label: 'Wavy' }, { type: 'line-solid', label: 'Line' },
]

const TOOL_GROUPS = [
  ['Shapes (click+drag)', 'shape', SHAPE_TOOLS],
  ['Equipment (drag)', 'equipment', EQUIPMENT_TOOLS],
  ['Players (drag)', 'player', PLAYER_TOOLS],
  ['Arrows + lines (click+drag)', 'arrow', ARROW_TOOLS],
] as const

interface ArmedTool {
  kind: ElementKind
  type: string
  /** 'draw': arm via a palette click, then click+drag on the canvas (shapes, arrows). 'place': drag straight from the palette icon onto the canvas (equipment, players). */
  mode: 'place' | 'draw'
}

let idCounter = 0
function newElementId(): string {
  idCounter += 1
  return `el-${idCounter}`
}

export function DiagramEditor({
  drillId,
  position,
  existing,
}: {
  drillId: string
  position: number
  existing: Diagram | null
}) {
  const router = useRouter()
  const svgRef = useRef<SVGSVGElement>(null)

  const [preset, setPreset] = useState<PitchPreset | null>(existing?.pitch_preset ?? null)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [elements, setElements] = useState<DiagramElement[]>(existing?.elements ?? [])
  const [color, setColor] = useState<ElementColor>('green')
  const [armed, setArmed] = useState<ArmedTool | null>(null)
  const [draft, setDraft] = useState<DiagramElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<{ pointerX: number; pointerY: number; el: DiagramElement } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const local = point.matrixTransform(ctm.inverse())
    const { width, height } = PITCH_DIMENSIONS[preset ?? 'full']
    return { x: clamp(local.x, 0, width), y: clamp(local.y, 0, height) }
  }

  function handlePaletteDown(kind: ElementKind, type: string, e: React.PointerEvent) {
    if (kind === 'shape' || kind === 'arrow') {
      // Click+drag tools: arm here, then draw directly on the canvas below.
      setArmed({ kind, type, mode: 'draw' })
      setSelectedId(null)
      return
    }
    // Equipment/players: the drag starts on the palette icon itself. Pointer
    // capture keeps move/up events targeting this handler even once the
    // pointer has moved off the button and onto the canvas.
    e.currentTarget.setPointerCapture(e.pointerId)
    setArmed({ kind, type, mode: 'place' })
  }

  function handlePaletteMove(e: React.PointerEvent) {
    if (!armed || armed.mode !== 'place') return
    const { x, y } = svgPoint(e.clientX, e.clientY)
    setDraft({ id: 'ghost', kind: armed.kind, type: armed.type, color, x, y })
  }

  function handlePaletteUp(e: React.PointerEvent) {
    if (!armed || armed.mode !== 'place') return
    const { x, y } = svgPoint(e.clientX, e.clientY)
    setElements((els) => [...els, { id: newElementId(), kind: armed.kind, type: armed.type, color, x, y }])
    setDraft(null)
    setArmed(null)
  }

  function handleCanvasDown(e: React.PointerEvent<SVGSVGElement>) {
    if (!armed || armed.mode !== 'draw') {
      setSelectedId(null)
      return
    }
    const { x, y } = svgPoint(e.clientX, e.clientY)
    setDraft({ id: 'ghost', kind: armed.kind, type: armed.type, color, x, y, x2: x, y2: y })
  }

  function handleCanvasMove(e: React.PointerEvent<SVGSVGElement>) {
    const { x, y } = svgPoint(e.clientX, e.clientY)
    if (draft && armed?.mode === 'draw') {
      setDraft({ ...draft, x2: x, y2: y })
      return
    }
    if (dragFrom) {
      const dx = x - dragFrom.pointerX
      const dy = y - dragFrom.pointerY
      const base = dragFrom.el
      setElements((els) =>
        els.map((el) =>
          el.id === base.id
            ? {
                ...el,
                x: base.x + dx,
                y: base.y + dy,
                x2: base.x2 !== undefined ? base.x2 + dx : undefined,
                y2: base.y2 !== undefined ? base.y2 + dy : undefined,
              }
            : el,
        ),
      )
    }
  }

  function handleCanvasUp() {
    if (draft && armed?.mode === 'draw') {
      const normalized =
        draft.x2 !== undefined && draft.y2 !== undefined
          ? normalizeRect(draft.x, draft.y, draft.x2, draft.y2)
          : { x: draft.x, y: draft.y }
      setElements((els) => [...els, { ...draft, ...normalized, id: newElementId() }])
      setDraft(null)
      setArmed(null)
    }
    setDragFrom(null)
  }

  function handleElementDown(id: string, e: React.PointerEvent) {
    e.stopPropagation()
    if (armed) return
    const el = elements.find((item) => item.id === id)
    if (!el) return
    svgRef.current?.setPointerCapture(e.pointerId)
    const { x, y } = svgPoint(e.clientX, e.clientY)
    setSelectedId(id)
    setDragFrom({ pointerX: x, pointerY: y, el })
  }

  function deleteSelected() {
    if (!selectedId) return
    setElements((els) => els.filter((el) => el.id !== selectedId))
    setSelectedId(null)
  }

  async function save() {
    if (!preset) return
    setSaving(true)
    setError(null)
    try {
      if (existing) {
        await updateDiagram(existing.id, { title: title.trim() || null, elements })
      } else {
        await createDiagram({ drill_id: drillId, position, title: title.trim() || null, pitch_preset: preset, elements })
      }
      router.push(`/drills/${drillId}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  if (!preset) {
    return (
      <div style={{ padding: 24, maxWidth: 420 }}>
        <div className="lbl" style={{ marginBottom: 12 }}>Choose a background</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button variant="secondary" fullWidth onClick={() => setPreset('full')}>Full pitch</Button>
          <Button variant="secondary" fullWidth onClick={() => setPreset('half')}>Half pitch</Button>
          <Button variant="secondary" fullWidth onClick={() => setPreset('grid')}>Grid, no markings</Button>
        </div>
      </div>
    )
  }

  const { width, height } = PITCH_DIMENSIONS[preset]
  const previewElements = draft ? [...elements, draft] : elements

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderBottom: '1px solid var(--hairline)' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled diagram"
          style={{ flex: 1, background: 'var(--field-bg)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)', padding: '8px 10px', color: 'var(--ink)', fontFamily: 'inherit' }}
        />
        {selectedId && <Button variant="secondary" onClick={deleteSelected}>Delete element</Button>}
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </div>

      {error && <div style={{ padding: '0 12px', fontSize: 12, color: 'var(--accent)' }}>{error}</div>}

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 220, flex: 'none', overflowY: 'auto', borderRight: '1px solid var(--hairline)', padding: 12 }}>
          <div className="lbl" style={{ marginBottom: 6 }}>Color</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {PALETTE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                style={{
                  width: 26, height: 26, borderRadius: 6, cursor: 'pointer',
                  border: color === c ? '2px solid var(--ink)' : '1px solid var(--hairline)',
                  background: elementColorHex(c),
                }}
              />
            ))}
          </div>

          {TOOL_GROUPS.map(([heading, kind, tools]) => (
            <div key={kind} style={{ marginBottom: 16 }}>
              <div className="lbl" style={{ marginBottom: 6 }}>{heading}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tools.map((tool) => (
                  <button
                    key={tool.type}
                    onPointerDown={(e) => handlePaletteDown(kind, tool.type, e)}
                    onPointerMove={handlePaletteMove}
                    onPointerUp={handlePaletteUp}
                    style={{
                      padding: '6px 10px', borderRadius: 6, fontSize: 11, cursor: 'pointer',
                      border: armed?.kind === kind && armed.type === tool.type ? '1.5px solid var(--accent)' : '1px solid var(--hairline)',
                      background: 'var(--field-bg)', color: 'var(--ink-70)',
                    }}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <Button variant="ghost" onClick={() => setElements([])}>Clear all</Button>
        </div>

        <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--ground)' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', maxWidth: width, touchAction: 'none' }}
            onPointerDown={handleCanvasDown}
            onPointerMove={handleCanvasMove}
            onPointerUp={handleCanvasUp}
          >
            <PitchBackground preset={preset} />
            <DiagramElements elements={previewElements} selectedId={selectedId} onPointerDownElement={handleElementDown} />
          </svg>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (This component isn't reachable from any route yet — Task 9 wires it up — so this step only confirms it compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add src/components/diagrams/DiagramEditor.tsx
git commit -m "feat: add the diagram editor canvas"
```

---

### Task 9: Diagram editor routes

**Files:**
- Create: `src/app/drills/[id]/diagrams/new/page.tsx`
- Create: `src/app/drills/[id]/diagrams/[diagramId]/edit/page.tsx`

**Interfaces:**
- Consumes: `getDrill` from `@/lib/drills-server`; `listDiagramsForDrill`, `getDiagram` from `@/lib/diagrams-server` (Task 4); `DiagramEditor` from `@/components/diagrams/DiagramEditor` (Task 8); `ScreenHeader` from `@/components/ui/ScreenHeader`.

- [ ] **Step 1: Write the "new" route**

```tsx
// src/app/drills/[id]/diagrams/new/page.tsx
import { notFound } from 'next/navigation'
import { getDrill } from '@/lib/drills-server'
import { listDiagramsForDrill } from '@/lib/diagrams-server'
import { DiagramEditor } from '@/components/diagrams/DiagramEditor'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export const dynamic = 'force-dynamic'

export default async function NewDiagramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const drill = await getDrill(id)
  if (!drill) notFound()

  // New diagrams append to the end — no drag-to-reorder in v1, so the
  // current count is the next position.
  const existing = await listDiagramsForDrill(id)

  return (
    <main>
      <ScreenHeader title={`New diagram · ${drill.name}`} backHref={`/drills/${id}`} backLabel={drill.name} />
      <DiagramEditor drillId={id} position={existing.length} existing={null} />
    </main>
  )
}
```

- [ ] **Step 2: Write the "edit" route**

```tsx
// src/app/drills/[id]/diagrams/[diagramId]/edit/page.tsx
import { notFound } from 'next/navigation'
import { getDrill } from '@/lib/drills-server'
import { getDiagram } from '@/lib/diagrams-server'
import { DiagramEditor } from '@/components/diagrams/DiagramEditor'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export const dynamic = 'force-dynamic'

export default async function EditDiagramPage({
  params,
}: {
  params: Promise<{ id: string; diagramId: string }>
}) {
  const { id, diagramId } = await params
  const [drill, diagram] = await Promise.all([getDrill(id), getDiagram(diagramId)])
  if (!drill || !diagram || diagram.drill_id !== id) notFound()

  return (
    <main>
      <ScreenHeader title={`Edit diagram · ${drill.name}`} backHref={`/drills/${id}`} backLabel={drill.name} />
      <DiagramEditor drillId={id} position={diagram.position} existing={diagram} />
    </main>
  )
}
```

- [ ] **Step 3: Manual QA — full editor round trip, mouse**

Run `npm run dev`. From a drill detail page, click "+ New diagram", pick "Full pitch", place a cone, a player token, draw a square shape, draw a solid arrow, select an element and delete it via the "Delete element" button, give it a title, and Save. Confirm it lands back on the drill detail page and the new diagram thumbnail appears in the gallery with the correct title. Reopen it by tapping the thumbnail and confirm every placed element reappears in its saved position — this is the elements-JSON round trip working end to end.

- [ ] **Step 4: Manual QA — touch**

Repeat the same flow using the browser's device toolbar in touch-emulation mode (or a real phone/tablet if available): arm a palette tool, drag-place an equipment icon, draw a shape, select and delete an element. Confirm dragging an element doesn't also scroll the page (the `touch-action: none` on the SVG), and that palette-icon drags reliably commit even when the release point is well inside the canvas, not just near the palette.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/drills/[id]/diagrams/new/page.tsx" "src/app/drills/[id]/diagrams/[diagramId]/edit/page.tsx"
git commit -m "feat: add diagram editor routes"
```

---

### Task 10: Session view integration

**Files:**
- Modify: `src/lib/sessions-server.ts` (getSession's caller in Task 9's route file doesn't change; this task changes `sessions/[id]/page.tsx`)
- Modify: `src/app/sessions/[id]/page.tsx`
- Modify: `src/components/sessions/SessionView.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `diagramsByDrillId` from `@/lib/diagrams-server` (Task 4); `DiagramView` from `@/components/diagrams/DiagramView` (Task 5).
- Produces: `<SessionView session today diagramsByDrillId />` — the prop signature every future caller of `SessionView` (there is currently only one: `sessions/[id]/page.tsx`) must supply.

- [ ] **Step 1: Update `sessions/[id]/page.tsx`**

```tsx
// src/app/sessions/[id]/page.tsx
import { notFound } from 'next/navigation'
import { getSession } from '@/lib/sessions-server'
import { diagramsByDrillId } from '@/lib/diagrams-server'
import { today as todayISO } from '@/lib/dates'
import { SessionView } from '@/components/sessions/SessionView'

export const dynamic = 'force-dynamic'

export default async function SessionViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession(id).catch(() => null)
  if (!session) notFound()

  const diagrams = await diagramsByDrillId(session.drills.map((item) => item.drill_id))

  return <SessionView session={session} today={todayISO()} diagramsByDrillId={diagrams} />
}
```

- [ ] **Step 2: Update `SessionView.tsx`**

Change the setup rendering from a single paragraph to a bullet list (matching `session-view-points`, already used for coaching points), and add a diagrams section per drill. Update the component signature and the Setup block:

```tsx
import { DiagramView } from '@/components/diagrams/DiagramView'
import type { Diagram, SessionWithDrills } from '@/lib/types'

// ...

export function SessionView({
  session,
  today,
  diagramsByDrillId,
}: {
  session: SessionWithDrills
  today: string
  diagramsByDrillId: Record<string, Diagram[]>
}) {
```

Replace the Setup block:

```tsx
                    <div className="session-view-section">
                      <p className="lbl">Setup</p>
                      <ul className="session-view-points">
                        {drill.setup.map((point, i) => (
                          <li key={i} className="bd session-view-copy">{point}</li>
                        ))}
                      </ul>
                    </div>
```

Add a diagrams section right after it, before the existing Coaching points block:

```tsx
                    {(diagramsByDrillId[drill.id] ?? []).length > 0 && (
                      <div className="session-view-section session-view-diagrams">
                        <p className="lbl">Diagrams</p>
                        <div className="session-view-diagrams-list">
                          {(diagramsByDrillId[drill.id] ?? []).map((diagram) => (
                            <DiagramView key={diagram.id} diagram={diagram} maxWidth={220} />
                          ))}
                        </div>
                      </div>
                    )}
```

- [ ] **Step 3: Add layout CSS for the diagrams row**

In `src/app/globals.css`, append:

```css
/* Session view diagrams (design doc, 2026-08-10): stacked full-width on
   phone/print; allowed to sit side by side when there's room, matching how
   this screen already scales its type and spacing up from the planning
   screens. */
.session-view-diagrams-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}
.session-view-diagrams-list > svg { flex: none; }

@media print {
  .session-view-diagrams-list { break-inside: avoid; }
}
```

- [ ] **Step 4: Manual QA**

Build a session with a drill that has a diagram, open `/sessions/<id>`, confirm the diagram renders inline under Setup with the same look as the gallery thumbnail. Use the browser's print preview (Print button on the page, or `window.print()`) and confirm the diagram appears on the printed sheet without being clipped and without the dark theme bleeding through (the existing `@media print` block already forces light backgrounds for everything else on this page).

- [ ] **Step 5: Typecheck and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add "src/app/sessions/[id]/page.tsx" src/components/sessions/SessionView.tsx src/app/globals.css
git commit -m "feat: show drill diagrams and bulleted setup on the pitchside session view"
```

---

### Task 11: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, every test file green (the pre-existing suite plus `diagram-elements.test.ts` from Task 3).

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, zero errors across the whole project.

- [ ] **Step 3: End-to-end manual walkthrough**

Run `npm run dev` and walk the whole path once, start to finish: create a drill with Setup/How it works/Coaching points as bullet points → add two diagrams to it (different presets) → verify the two-column drill detail layout on both a wide and a narrow viewport → add the drill to a session via the Planner → open the pitchside Session view and confirm both diagrams and the bulleted setup show correctly → print-preview the session and confirm the diagrams are present and legible on the simulated printed page.

- [ ] **Step 4: Commit (only if Step 3 surfaced fixes)**

If the walkthrough found nothing to fix, there's nothing to commit here — this task is verification, not new work. If it did surface a small fix, make it, re-run Steps 1-2, and commit with a message describing what the walkthrough caught.
