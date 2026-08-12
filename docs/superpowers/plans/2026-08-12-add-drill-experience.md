# Add-drill Experience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a coach start a drill from either words or a diagram, auto-derive player/equipment metadata from what they draw, fix the diagram editor's element re-grab problem and icon artwork, and support Step 1/Step 2 diagram sequences.

**Architecture:** Extends the existing `drill` + `drill_diagram` tables (no new tables) and the existing `DiagramEditor`/`DiagramElements` SVG components in place. A new pure function derives counts from `DiagramElement[]`; a new optional sidebar/chip panel surfaces those values as editable fields only when the diagram-first entry path is active. Everything else (word-first `DrillForm`, read-only `DiagramView`, Session view, print) is touched only where step-sequence tabs and widened age bands require it.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (Postgres + Storage), vitest, plain SVG + Pointer Events (no canvas library) — all pre-existing, no new dependencies.

## Global Constraints

- No new npm dependencies (spec: "no canvas library dependency", already-established project posture of zero deps beyond Supabase/Next).
- `library` is fixed at drill creation and never changes (existing invariant, `drills.ts:updateDrill` strips it).
- A diagram's `pitch_preset` and `drill_id` never change after creation (existing invariant, `diagrams.ts:updateDiagram`).
- App has no auth; RLS policies stay wide-open `for all using (true) with check (true)`, matching every existing table.
- Follow existing file-split convention: browser-side writes in `lib/<x>.ts`, server-side reads in `lib/<x>-server.ts` (next/headers must never reach a client bundle).
- Follow existing style convention: inline `style` objects with `var(--token)` CSS custom properties, not Tailwind/CSS modules (none are used anywhere in this codebase).
- 900px is the established desktop breakpoint (`globals.css:250`) — reuse it, don't invent a new one.

---

### Task 1: Widen `age_band` and add `sequence_group` to `drill_diagram`

**Files:**
- Create: `supabase/migrations/0008_age_bands_and_step_sequences.sql`
- Modify: `src/lib/types.ts:3` (`AgeBand` union)
- Modify: `src/lib/taxonomy.ts:14` (`AGE_BANDS` array)
- Modify: `src/lib/types.ts` (`Diagram`/`DiagramInput` — add `sequence_group`)

**Interfaces:**
- Produces: `AgeBand` now includes `'U12-U14' | 'U15-U18'`; `AGE_BANDS` includes both; `Diagram.sequence_group: string | null`; `DiagramInput` carries the same field (settable at creation, per-task-2 rule below it stays out of `updateDiagram`'s patch type — mirrors how `pitch_preset` is already excluded there).

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0008_age_bands_and_step_sequences.sql
-- Two independent additions for the add-drill experience revamp
-- (design doc, 2026-08-12):
--   1. age_band gains two bands the enum comment in 0001 already
--      anticipated (U12-U14, U15-U18) -- additive, no data migration.
--   2. drill_diagram gains sequence_group: diagrams sharing a non-null
--      value render as Step 1 / Step 2 / Step 3 tabs, ordered by the
--      existing `position` column. ALTER TYPE ... ADD VALUE cannot run
--      in the same transaction block as a statement that uses the new
--      value, but this file only adds the values -- nothing here reads
--      them -- so a single migration file is safe.

alter type age_band add value 'U12-U14';
alter type age_band add value 'U15-U18';

alter table drill_diagram
  add column sequence_group uuid;

create index drill_diagram_sequence_group_idx
  on drill_diagram (sequence_group)
  where sequence_group is not null;
```

- [ ] **Step 2: Apply the migration locally and confirm it runs clean**

Run: `npx supabase db reset` (or however this project applies local migrations — check `supabase.md` for the exact command if `db reset` isn't it)
Expected: migration `0008_age_bands_and_step_sequences.sql` applies with no errors; `\d drill_diagram` in `psql` shows `sequence_group uuid`.

- [ ] **Step 3: Update `AgeBand` and `AGE_BANDS`**

In `src/lib/types.ts`:
```ts
export type AgeBand = 'U6-U8' | 'U9-U11' | 'U12-U14' | 'U15-U18'
```

In `src/lib/taxonomy.ts`:
```ts
export const AGE_BANDS = ['U6-U8', 'U9-U11', 'U12-U14', 'U15-U18'] as const satisfies readonly AgeBand[]
```

- [ ] **Step 4: Add `sequence_group` to `Diagram`/`DiagramInput`**

In `src/lib/types.ts`, in the `Diagram` interface, add after `position: number`:
```ts
  sequence_group: string | null
```

`DiagramInput` already derives via `Omit<Diagram, 'id' | 'created_at' | 'updated_at'>`, so it picks this up automatically — no separate edit needed there.

- [ ] **Step 5: Fix the now-broken `createDiagram` call site**

Widening `Diagram`/`DiagramInput` to require `sequence_group` breaks the one existing place that builds a `DiagramInput` literal — `src/components/diagrams/DiagramEditor.tsx`'s `save()` function (around line 237):

```tsx
        await createDiagram({ drill_id: drillId, position, title: title.trim() || null, pitch_preset: preset, elements })
```

Add `sequence_group: null` — every diagram starts standalone; Task 8's `createDiagramStep` is the only place that ever sets it to a real value:

```tsx
        await createDiagram({ drill_id: drillId, position, title: title.trim() || null, pitch_preset: preset, elements, sequence_group: null })
```

- [ ] **Step 6: Run `npx tsc --noEmit` and the existing test suite to confirm nothing broke**

Run: `npx tsc --noEmit`
Expected: no type errors (confirms the Step 5 fix above is complete and no other call site builds a `DiagramInput`/`Diagram` literal).

Run: `npx vitest run`
Expected: all existing tests still PASS (this task only widens types/enums plus the one fix above, no behavior change yet).

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0008_age_bands_and_step_sequences.sql src/lib/types.ts src/lib/taxonomy.ts src/components/diagrams/DiagramEditor.tsx
git commit -m "feat: widen age_band enum, add sequence_group to drill_diagram"
```

---

### Task 2: Auto-extraction pure function

**Files:**
- Create: `src/lib/diagram-metadata.ts`
- Test: `src/lib/diagram-metadata.test.ts`

**Interfaces:**
- Consumes: `DiagramElement[]` (existing type, `src/lib/types.ts`), `elementColorHex`/`ElementColor` (existing, `src/lib/diagram-elements.ts` / `src/lib/types.ts`).
- Produces:
  ```ts
  export interface DerivedDrillMetadata {
    playerCount: number
    teamSplit: { color: ElementColor; count: number }[]  // descending by count, only colors with players
    suggestedTags: string[]        // e.g. ["4v2"] — built from teamSplit when exactly 2 colors are present
    conesNeeded: number
    goalsNeeded: number
    bibsNeeded: boolean
  }
  export function deriveDrillMetadata(elements: DiagramElement[]): DerivedDrillMetadata
  ```
  Later tasks (3, 5) import `deriveDrillMetadata` and `DerivedDrillMetadata` from this module.

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/diagram-metadata.test.ts
import { describe, expect, it } from 'vitest'
import { deriveDrillMetadata } from './diagram-metadata'
import type { DiagramElement } from './types'

function player(color: DiagramElement['color']): DiagramElement {
  return { id: `p-${color}-${Math.random()}`, kind: 'player', type: 'player-circle', color, x: 0, y: 0 }
}
function equipment(type: string): DiagramElement {
  return { id: `e-${type}-${Math.random()}`, kind: 'equipment', type, color: 'gray', x: 0, y: 0 }
}

describe('deriveDrillMetadata', () => {
  it('returns all-zero metadata for an empty canvas', () => {
    const result = deriveDrillMetadata([])
    expect(result).toEqual({
      playerCount: 0,
      teamSplit: [],
      suggestedTags: [],
      conesNeeded: 0,
      goalsNeeded: 0,
      bibsNeeded: false,
    })
  })

  it('counts players regardless of color', () => {
    const result = deriveDrillMetadata([player('green'), player('red'), player('gray')])
    expect(result.playerCount).toBe(3)
  })

  it('groups players by color into teamSplit, descending by count', () => {
    const result = deriveDrillMetadata([player('green'), player('green'), player('red'), player('green'), player('red')])
    expect(result.teamSplit).toEqual([
      { color: 'green', count: 3 },
      { color: 'red', count: 2 },
    ])
  })

  it('suggests a vN-vM tag when exactly two player colors are present', () => {
    const result = deriveDrillMetadata([player('green'), player('green'), player('green'), player('green'), player('red'), player('red')])
    expect(result.suggestedTags).toEqual(['4v2'])
  })

  it('suggests no tag when only one player color is present', () => {
    const result = deriveDrillMetadata([player('green'), player('green')])
    expect(result.suggestedTags).toEqual([])
  })

  it('suggests no tag when three or more player colors are present', () => {
    const result = deriveDrillMetadata([player('green'), player('red'), player('blue')])
    expect(result.suggestedTags).toEqual([])
  })

  it('tallies cones and goals from equipment elements', () => {
    const result = deriveDrillMetadata([equipment('cone'), equipment('cone'), equipment('cone'), equipment('goal-small')])
    expect(result.conesNeeded).toBe(3)
    expect(result.goalsNeeded).toBe(1)
  })

  it('does not set bibsNeeded from equipment — no bib element type exists', () => {
    const result = deriveDrillMetadata([equipment('cone')])
    expect(result.bibsNeeded).toBe(false)
  })

  it('ignores shape and arrow elements entirely', () => {
    const shape: DiagramElement = { id: 's1', kind: 'shape', type: 'square', color: 'green', x: 0, y: 0, x2: 10, y2: 10 }
    const arrow: DiagramElement = { id: 'a1', kind: 'arrow', type: 'arrow-solid', color: 'green', x: 0, y: 0, x2: 10, y2: 10 }
    const result = deriveDrillMetadata([shape, arrow])
    expect(result.playerCount).toBe(0)
    expect(result.conesNeeded).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/diagram-metadata.test.ts`
Expected: FAIL — `Cannot find module './diagram-metadata'`.

- [ ] **Step 3: Implement `diagram-metadata.ts`**

```ts
// src/lib/diagram-metadata.ts
import type { DiagramElement, ElementColor } from './types'

/**
 * What can be read off a diagram's placed elements without the coach typing
 * anything — player count/split, a suggested "NvM" tag, and equipment
 * tallies for the fields drill already has (cones_needed, goals_needed,
 * bibs_needed). Pure function over the same `elements` array that's already
 * serialized to `drill_diagram.elements` — no new detection framework
 * (add-drill experience design, 2026-08-12).
 */
export interface DerivedDrillMetadata {
  playerCount: number
  teamSplit: { color: ElementColor; count: number }[]
  suggestedTags: string[]
  conesNeeded: number
  goalsNeeded: number
  bibsNeeded: boolean
}

const EQUIPMENT_TO_CONES = new Set(['cone'])
const EQUIPMENT_TO_GOALS = new Set(['goal-small'])

export function deriveDrillMetadata(elements: DiagramElement[]): DerivedDrillMetadata {
  const players = elements.filter((el) => el.kind === 'player')
  const equipment = elements.filter((el) => el.kind === 'equipment')

  const colorCounts = new Map<ElementColor, number>()
  for (const p of players) {
    colorCounts.set(p.color, (colorCounts.get(p.color) ?? 0) + 1)
  }
  const teamSplit = [...colorCounts.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count)

  const suggestedTags: string[] = []
  if (teamSplit.length === 2) {
    suggestedTags.push(`${teamSplit[0].count}v${teamSplit[1].count}`)
  }

  let conesNeeded = 0
  let goalsNeeded = 0
  for (const e of equipment) {
    if (EQUIPMENT_TO_CONES.has(e.type)) conesNeeded += 1
    if (EQUIPMENT_TO_GOALS.has(e.type)) goalsNeeded += 1
  }

  return {
    playerCount: players.length,
    teamSplit,
    suggestedTags,
    conesNeeded,
    goalsNeeded,
    // No bib element type exists in the palette (EQUIPMENT_TOOLS in
    // DiagramEditor.tsx) — bibs_needed stays a manual DrillForm field.
    bibsNeeded: false,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/diagram-metadata.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/diagram-metadata.ts src/lib/diagram-metadata.test.ts
git commit -m "feat: derive player/equipment metadata from diagram elements"
```

---

### Task 3: Fix element re-grab — uniform hit target and active-drag scale

**Files:**
- Modify: `src/components/diagrams/DiagramElements.tsx`
- Modify: `src/components/diagrams/DiagramEditor.tsx`

**Interfaces:**
- Consumes: existing `DiagramElement`, existing `dragFrom` state in `DiagramEditor.tsx:119`.
- Produces: `DiagramElements` gains a new optional prop `draggingId?: string | null`, passed through by `DiagramEditor` from its existing `dragFrom` state (`dragFrom?.el.id ?? null`). No other component reads this prop yet — Task 5 will not touch it, `DiagramView` (read-only) omits it, matching how `selectedId`/`onPointerDownElement` are already omitted there.

- [ ] **Step 1: Add a uniform invisible hit circle to every element**

In `src/components/diagrams/DiagramElements.tsx`, the render loop currently wraps each element's own markup (`ShapeEl`/`EquipmentEl`/`PlayerEl`/`ArrowEl`) with no shared hit-target. Add one invisible circle per element, centered on its "grab point" (`el.x, el.y` for point elements; the midpoint of `x,y`–`x2,y2` for shapes/arrows), sized to match the existing 22px-radius selection ring at `DiagramElements.tsx:111`:

```tsx
function grabPoint(el: DiagramElement): { cx: number; cy: number } {
  if (el.x2 === undefined || el.y2 === undefined) return { cx: el.x, cy: el.y }
  return { cx: (el.x + el.x2) / 2, cy: (el.y + el.y2) / 2 }
}
```

Add this function above `DiagramElements` (below the existing `ArrowEl` function). Then, inside the `elements.map` loop, before the four `el.kind === ...` conditionals, add:

```tsx
{onPointerDownElement && (() => {
  const { cx, cy } = grabPoint(el)
  return <circle cx={cx} cy={cy} r={18} fill="transparent" />
})()}
```

`r={18}` gives a 36px-diameter hit target (spec: "~36px-diameter"). This circle is only rendered when `onPointerDownElement` is passed (i.e. only in the editable `DiagramEditor`, never in read-only `DiagramView`) — it sits inside the same `<g onPointerDown={...}>` wrapper that already exists per-element, so it doesn't need its own pointer handler.

- [ ] **Step 2: Add the active-drag scale/highlight**

Still in `DiagramElements.tsx`, add the new prop to the function signature:

```tsx
export function DiagramElements({
  elements,
  selectedId,
  draggingId,
  onPointerDownElement,
}: {
  elements: DiagramElement[]
  selectedId?: string | null
  draggingId?: string | null
  onPointerDownElement?: (id: string, e: React.PointerEvent) => void
}) {
```

In the per-element `<g>` wrapper (`DiagramElements.tsx:101-105`), scale the whole group ~5% around its grab point while it's the one being dragged, and strengthen the existing drop-shadow filter:

```tsx
{elements.map((el) => {
  const isDragging = draggingId === el.id
  const { cx, cy } = grabPoint(el)
  return (
    <g
      key={el.id}
      onPointerDown={onPointerDownElement ? (e) => onPointerDownElement(el.id, e) : undefined}
      transform={isDragging ? `translate(${cx},${cy}) scale(1.05) translate(${-cx},${-cy})` : undefined}
      style={{
        cursor: onPointerDownElement ? 'pointer' : undefined,
        filter: isDragging
          ? 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))'
          : 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
      }}
    >
```

(Replace the existing `.map((el) => (` arrow-with-parens form with this `.map((el) => { ... return (...) })` block form, keeping everything below — the hit circle, the four kind conditionals, and the `selectedId === el.id` ring — unchanged inside the returned `<g>`.)

- [ ] **Step 3: Wire `draggingId` through from `DiagramEditor`**

In `src/components/diagrams/DiagramEditor.tsx`, find the `<DiagramElements .../>` call at line 388:

```tsx
<DiagramElements elements={previewElements} selectedId={selectedId} onPointerDownElement={handleElementDown} />
```

Change to:

```tsx
<DiagramElements
  elements={previewElements}
  selectedId={selectedId}
  draggingId={dragFrom?.el.id ?? null}
  onPointerDownElement={handleElementDown}
/>
```

- [ ] **Step 4: Manual QA (no automated test — this is pointer-interaction/visual behavior)**

Run: `npm run dev`, open `/drills/<any-drill-id>/diagrams/new`, place one of each element kind (shape, equipment, player, arrow).
Expected: clicking ~15px away from a player's outline or an arrow's line still grabs and drags it (previously required near-pixel-perfect clicks on the stroke); while actively dragging any element, it visibly scales up slightly and its shadow deepens; releasing returns it to normal size with the existing blue selection ring.

Run: `npx vitest run` — confirm the full suite (including Task 2's new file) still passes; this task has no new unit-testable logic (`grabPoint` is trivial arithmetic exercised implicitly by the manual QA above, and adding a test for it would just restate the implementation).

- [ ] **Step 5: Commit**

```bash
git add src/components/diagrams/DiagramElements.tsx src/components/diagrams/DiagramEditor.tsx
git commit -m "fix: generous hit target and active-drag scale for placed elements"
```

---

### Task 4: Redraw equipment and player icon artwork

**Files:**
- Modify: `src/components/diagrams/EquipmentIcon.tsx`
- Modify: `src/components/diagrams/DiagramEditor.tsx` (`ToolIcon`'s player-marker cases)

**Interfaces:**
- Consumes/produces: no signature changes — `EquipmentIcon({ type })` and `ToolIcon({ type })` keep their existing props; only the SVG markup inside each case changes. Both are rendered at 22–24px (palette and on-canvas), per the existing shared-artwork comment at `EquipmentIcon.tsx:1-14` — that constraint stays.

- [ ] **Step 1: Redraw the cone with a cleaner silhouette and consistent stroke**

In `EquipmentIcon.tsx`, replace the `'cone'` case:

```tsx
    case 'cone':
      return (
        <>
          <polygon points="12,4 6.5,20 17.5,20" fill="#ff6a1a" stroke="#c94f0f" strokeWidth={0.6} strokeLinejoin="round" />
          <rect x="9" y="13.5" width="6" height="2.2" rx={0.4} fill="#ffffff" />
          <ellipse cx="12" cy="20" rx="5.5" ry="1.2" fill="#c94f0f" />
        </>
      )
```

(Adds a subtle darker-orange outline for edge definition at small size, a slightly narrower/taller silhouette so it doesn't read as a triangle, and a darker ellipse base instead of same-color-as-fill so the base reads as a separate plane.)

- [ ] **Step 2: Redraw the ball with a visible seam pattern at small size**

Replace the `'ball'` case:

```tsx
    case 'ball':
      return (
        <>
          <circle cx="12" cy="12" r="9" fill="#ffffff" stroke="#101828" strokeWidth={1.2} />
          <circle cx="12" cy="12" r="3.2" fill="#101828" />
          <path d="M12,8.8 L12,3.5 M12,15.2 L12,20.5 M8.8,12 L3.5,12 M15.2,12 L20.5,12" stroke="#101828" strokeWidth={1} strokeLinecap="round" />
        </>
      )
```

(The old pentagon-only mark reads as a blob at 22px; a center pentagon plus four short seam lines reads unmistakably as a ball at both palette and on-canvas size.)

- [ ] **Step 3: Redraw the mannequin with clearer head/body separation**

Replace the `'mannequin'` case:

```tsx
    case 'mannequin':
      return (
        <>
          <circle cx="12" cy="5.5" r="2.6" fill="#f97316" stroke="#c2560a" strokeWidth={0.5} />
          <path
            d="M8.2,10 C8.2,8.6 9.9,7.8 12,7.8 C14.1,7.8 15.8,8.6 15.8,10 L14.8,20.5 C14.8,21.4 13.5,22 12,22 C10.5,22 9.2,21.4 9.2,20.5 Z"
            fill="#f97316"
            stroke="#c2560a"
            strokeWidth={0.5}
          />
          <rect x="6.8" y="12.5" width="10.4" height="1.8" rx={0.9} fill="#c2560a" />
        </>
      )
```

(Same silhouette shape, but a visible outline stroke and a slightly narrower head-to-body gap so it doesn't blur into one orange smear at small size.)

- [ ] **Step 4: Redraw the goal with rounded, higher-contrast netting**

Replace the `'goal-small'` case:

```tsx
    case 'goal-small':
      return (
        <>
          <path
            d="M4,20 L4,6.5 L20,6.5 L20,20"
            fill="none"
            stroke="#101828"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.8,8 L6.8,19 M9.6,8 L9.6,19 M14.4,8 L14.4,19 M17.2,8 L17.2,19"
            stroke="#9aa1ab"
            strokeWidth={0.9}
          />
          <path d="M4,8.5 L20,8.5 M4,11.5 L20,11.5 M4,14.5 L20,14.5 M4,17.5 L20,17.5" stroke="#9aa1ab" strokeWidth={0.6} />
        </>
      )
```

(Adds horizontal netting lines crossing the verticals, so it reads as a net rather than bare vertical bars, and darkens the netting color slightly from `#c7cbd1` to `#9aa1ab` for contrast against a light palette card.)

- [ ] **Step 5: Redraw ladder, pole, and wall for stroke-weight consistency**

Replace the `'ladder'`, `'pole'`, and `'wall'` cases:

```tsx
    case 'ladder':
      return (
        <>
          <rect x="6.2" y="3" width="1.8" height="18" rx={0.9} fill="#eab308" />
          <rect x="16" y="3" width="1.8" height="18" rx={0.9} fill="#eab308" />
          <rect x="7" y="6.2" width="10" height="1.5" fill="#eab308" />
          <rect x="7" y="11.2" width="10" height="1.5" fill="#eab308" />
          <rect x="7" y="16.2" width="10" height="1.5" fill="#eab308" />
        </>
      )
    case 'pole':
      return (
        <>
          <line x1="7.5" y1="3" x2="7.5" y2="21" stroke="#101828" strokeWidth={1.8} strokeLinecap="round" />
          <polygon points="8.3,4.2 15.5,6.6 8.3,9" fill="#dc2626" stroke="#a51c1c" strokeWidth={0.4} strokeLinejoin="round" />
        </>
      )
    case 'wall':
      return (
        <>
          <rect x="4" y="10.5" width="16" height="6.5" rx={2} fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
          <circle cx="8" cy="7.5" r="2.1" fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
          <circle cx="12" cy="7.5" r="2.1" fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
          <circle cx="16" cy="7.5" r="2.1" fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
        </>
      )
```

(Same silhouettes, each now has a subtly darker outline stroke — `#eab308`'s ladder stays fill-only since its rungs are already high-contrast against a white card, but pole and wall both gained outlines for edge definition, matching the treatment applied to cone/mannequin/goal above.)

- [ ] **Step 6: Redraw the four player markers in `DiagramEditor.tsx`'s `ToolIcon`**

In `src/components/diagrams/DiagramEditor.tsx`, replace the `'player-circle'` through `'player-omega'` cases (lines 53–60):

```tsx
    case 'player-circle':
      return <circle cx={12} cy={12} r={7.5} fill="none" stroke={ink} strokeWidth={2.2} />
    case 'player-filled':
      return <circle cx={12} cy={12} r={7.5} fill={ink} />
    case 'player-triangle':
      return <polygon points="12,4.5 4.5,19.5 19.5,19.5" fill="none" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" />
    case 'player-omega':
      return (
        <>
          <circle cx={12} cy={12} r={7.5} fill="none" stroke={ink} strokeWidth={1.4} />
          <text x={12} y={17} fontSize={13} fontWeight={700} textAnchor="middle" fill={ink}>&#937;</text>
        </>
      )
```

(`player-triangle` gets `strokeLinejoin="round"` so its corners don't look sharp/jagged at 22px; `player-omega` gains a thin surrounding circle so it reads as a distinct player marker rather than a bare glyph floating in the palette grid, and the Ω glyph itself is bolded and better-centered.)

The corresponding on-canvas render in `DiagramElements.tsx`'s `PlayerEl` (lines 41-52) already reuses `RADIUS['player-*'] = 14` and the same shape logic — no change needed there, since it already matches these proportions relative to its own coordinate space (14 is `24/2 * (7.5/12)`-equivalent scaling handled by the existing radius map, not something this task touches).

- [ ] **Step 7: Manual QA**

Run: `npm run dev`, open the diagram editor, visually compare the palette icons and their on-canvas placed versions against the previous artwork (git diff or a before/after screenshot).
Expected: every equipment and player icon has a visible outline/edge at both 22px (palette) and 24px (canvas) size, no two adjacent icons blur together, cone/ball/mannequin read as their real-world objects at a glance.

Run: `npx vitest run` — confirm the suite still passes (this task touches only SVG markup, no logic).

- [ ] **Step 8: Commit**

```bash
git add src/components/diagrams/EquipmentIcon.tsx src/components/diagrams/DiagramEditor.tsx
git commit -m "feat: redraw equipment and player icon artwork for clarity at small size"
```

---

### Task 5: Metadata + taxonomy sidebar in `DiagramEditor`, desktop and mobile

**Files:**
- Create: `src/components/diagrams/DrillMetadataPanel.tsx`
- Modify: `src/components/diagrams/DiagramEditor.tsx`
- Modify: `src/lib/drills.ts` (no signature change — `updateDrill` already accepts `Partial<DrillInput>`, this task just calls it with more fields)

**Interfaces:**
- Consumes: `DerivedDrillMetadata`/`deriveDrillMetadata` (Task 2), `Drill`/`DrillInput`/`AgeBand` (existing), `typesFor`/`typeLabel`/`AGE_BANDS` (existing, `src/lib/taxonomy.ts`), `updateDrill` (existing, `src/lib/drills.ts`).
- Produces:
  ```ts
  export function DrillMetadataPanel({
    drill,
    derived,
    onPatch,
    variant,
  }: {
    drill: Drill
    derived: DerivedDrillMetadata
    onPatch: (patch: Partial<DrillInput>) => void
    variant: 'sidebar' | 'chip'
  }): JSX.Element
  ```
  `onPatch` is called with user overrides (e.g. `{ players_min: 7 }` or `{ tags: [...] }`) — the caller (`DiagramEditor`) owns the actual `drill` state and persistence, this component is presentation + local expand/collapse state only.

- [ ] **Step 1: Build `DrillMetadataPanel`**

```tsx
// src/components/diagrams/DrillMetadataPanel.tsx
'use client'

import { useState } from 'react'
import type { Drill, DrillInput } from '@/lib/types'
import type { DerivedDrillMetadata } from '@/lib/diagram-metadata'
import { AGE_BANDS, typeLabel, typesFor } from '@/lib/taxonomy'

const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e4e7ec', borderRadius: 14,
  boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)',
}

/**
 * Shown only on the diagram-first entry path (spec: add-drill experience,
 * 2026-08-12) — editing an existing drill's second/third diagram via
 * DiagramGallery does not pass this in, since taxonomy is already set for
 * that drill. Two layouts: `sidebar` (desktop, always expanded) and `chip`
 * (mobile, collapsed to a summary pill until tapped).
 */
export function DrillMetadataPanel({
  drill,
  derived,
  onPatch,
  variant,
}: {
  drill: Drill
  derived: DerivedDrillMetadata
  onPatch: (patch: Partial<DrillInput>) => void
  variant: 'sidebar' | 'chip'
}) {
  const [expanded, setExpanded] = useState(variant === 'sidebar')
  const equipmentSummary = `${derived.conesNeeded} cones · ${derived.goalsNeeded} goals`
  const summary = `${derived.playerCount} players · ${equipmentSummary}`

  if (variant === 'chip' && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
          background: '#101828', color: '#ffffff', border: 'none', fontSize: 12, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {summary}
      </button>
    )
  }

  const content = (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#667085', marginBottom: 10 }}>
        Detected
      </div>
      <div style={{ fontSize: 13, color: '#101828', marginBottom: 4 }}>
        Players:{' '}
        <input
          type="number"
          min={0}
          value={drill.players_min ?? derived.playerCount}
          onChange={(e) => onPatch({ players_min: e.target.value === '' ? null : Number(e.target.value) })}
          style={{ width: 48, border: '1px solid #e4e7ec', borderRadius: 6, padding: '2px 6px' }}
        />
      </div>
      <div style={{ fontSize: 13, color: '#101828', marginBottom: 4 }}>{equipmentSummary}</div>

      {derived.suggestedTags.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 6 }}>Suggested tags</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {derived.suggestedTags.map((tag) => {
              const active = drill.tags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => onPatch({ tags: active ? drill.tags.filter((t) => t !== tag) : [...drill.tags, tag] })}
                  style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: active ? '#f0fdf4' : '#f9fafb',
                    border: active ? '1.5px solid #16a34a' : '1px solid #e4e7ec',
                    color: active ? '#16a34a' : '#475467',
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 6 }}>Age band</div>
        <select
          value={drill.age_band ?? ''}
          onChange={(e) => onPatch({ age_band: e.target.value === '' ? null : (e.target.value as Drill['age_band']) })}
          style={{ width: '100%', border: '1px solid #e4e7ec', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}
        >
          <option value="">Choose…</option>
          {AGE_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 6 }}>Type</div>
        <select
          value={drill.type}
          onChange={(e) => onPatch({ type: e.target.value as Drill['type'] })}
          style={{ width: '100%', border: '1px solid #e4e7ec', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}
        >
          {typesFor(drill.library).map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
      </div>
    </>
  )

  if (variant === 'sidebar') {
    return <div style={{ width: 220, flex: 'none', padding: 16, ...cardStyle }}>{content}</div>
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 10 }}>
      <div style={{ width: '100%', padding: 20, borderRadius: '18px 18px 0 0', ...cardStyle }}>
        {content}
        <button
          onClick={() => setExpanded(false)}
          style={{ marginTop: 14, width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer', background: '#101828', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13 }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire it into `DiagramEditor` behind a new `drillMeta` prop**

In `src/components/diagrams/DiagramEditor.tsx`, add a new optional prop and local state for the drill being edited alongside the diagram:

```tsx
export function DiagramEditor({
  drillId,
  position,
  existing,
  drillMeta,
}: {
  drillId: string
  position: number
  existing: Diagram | null
  /** Present only on the diagram-first entry path (Task 6) — shows the
      metadata/taxonomy panel and patches the drill on save. */
  drillMeta: Drill | null
}) {
```

Add imports at the top: `import { deriveDrillMetadata } from '@/lib/diagram-metadata'`, `import { DrillMetadataPanel } from './DrillMetadataPanel'`, `import { updateDrill } from '@/lib/drills'`, and add `Drill, DrillInput` to the existing `import type { ... } from '@/lib/types'` line.

Add local state right after the existing `elements` state (`DiagramEditor.tsx:114`):

```tsx
  const [drillPatch, setDrillPatch] = useState<Partial<DrillInput>>({})
```

Compute derived metadata and the effective drill (base + pending patch) right before the `if (!preset)` early return:

```tsx
  const derived = deriveDrillMetadata(elements)
  const effectiveDrill: Drill | null = drillMeta ? { ...drillMeta, ...drillPatch } : null
```

- [ ] **Step 3: Persist the patch on save, and render the panel**

In the `save()` function (`DiagramEditor.tsx:229-245`), after the existing diagram save succeeds and before `router.push`, add:

```tsx
      if (drillMeta && Object.keys(drillPatch).length > 0) {
        await updateDrill(drillMeta.id, drillPatch)
      }
```

In the main return's layout row (`DiagramEditor.tsx:319`, the `<div style={{ display: 'flex', flex: 1, ... }}>`), add the sidebar variant after the existing tool sidebar and before the canvas `<div>`, only on desktop widths — reuse the project's 900px breakpoint via a media-query-driven wrapper class rather than a JS width check, since every other responsive layout in this codebase (`globals.css:250`) is CSS-driven, not JS-driven. Add to `src/app/globals.css`, near the existing `.drill-detail-layout` rules:

```css
/* Diagram editor's metadata panel (add-drill experience design,
   2026-08-12): sidebar on desktop, floating chip on phone — same
   900px breakpoint the drill detail page already uses. */
.diagram-editor-meta-sidebar { display: none; }
.diagram-editor-meta-chip { display: block; }

@media (min-width: 900px) {
  .diagram-editor-meta-sidebar { display: block; }
  .diagram-editor-meta-chip { display: none; }
}
```

Then in `DiagramEditor.tsx`, wrap the two variants so CSS controls which renders:

```tsx
        {effectiveDrill && (
          <>
            <div className="diagram-editor-meta-sidebar">
              <DrillMetadataPanel
                drill={effectiveDrill}
                derived={derived}
                onPatch={(patch) => setDrillPatch((p) => ({ ...p, ...patch }))}
                variant="sidebar"
              />
            </div>
            <div className="diagram-editor-meta-chip">
              <DrillMetadataPanel
                drill={effectiveDrill}
                derived={derived}
                onPatch={(patch) => setDrillPatch((p) => ({ ...p, ...patch }))}
                variant="chip"
              />
            </div>
          </>
        )}
```

Place the sidebar `<div>` as a flex sibling right after the existing 240px tool sidebar `<div>` (still inside the `display: flex` row, `DiagramEditor.tsx:319-391`); place the chip `<div>` right after that same row closes (it's `position: fixed`, so its DOM position doesn't affect layout).

- [ ] **Step 4: Update the two diagram routes to pass `drillMeta={null}`**

`src/app/drills/[id]/diagrams/new/page.tsx` and `.../[diagramId]/edit/page.tsx` both already fetch `drill` via `getDrill(id)`. Update both `<DiagramEditor .../>` calls to add `drillMeta={null}` — these are the word-first / "add another diagram to an existing drill" entry points, not the diagram-first flow (Task 6 adds the route that passes real data):

```tsx
      <DiagramEditor drillId={id} position={existing.length} existing={null} drillMeta={null} />
```
```tsx
      <DiagramEditor drillId={id} position={diagram.position} existing={diagram} drillMeta={null} />
```

- [ ] **Step 5: Manual QA**

Run: `npm run dev`, open an existing drill's "+ New diagram" — confirm no metadata panel appears (unchanged from before this task) and the page still saves correctly.
Expected: existing diagram-editing flow is visually identical to before this task.

Run: `npx vitest run` — confirm full suite passes.

- [ ] **Step 6: Commit**

```bash
git add src/components/diagrams/DrillMetadataPanel.tsx src/components/diagrams/DiagramEditor.tsx src/app/globals.css "src/app/drills/[id]/diagrams/new/page.tsx" "src/app/drills/[id]/diagrams/[diagramId]/edit/page.tsx"
git commit -m "feat: add drill metadata/taxonomy panel to the diagram editor"
```

---

### Task 6: Dual entry point — "Start with a diagram"

**Files:**
- Create: `src/app/drills/new/diagram/page.tsx`
- Create: `src/app/drills/[id]/finish/page.tsx`
- Modify: `src/app/drills/new/page.tsx`
- Modify: `src/components/diagrams/DiagramEditor.tsx`

**Interfaces:**
- Consumes: `createDrill` (existing, `src/lib/drills.ts`), `DrillForm` (existing, `src/components/drills/DrillForm.tsx`), `DiagramEditor` (Task 5's `drillMeta` prop).
- Produces: `/drills/new/diagram?library=outfield` creates a bare draft drill server-side-unreachable (client-side `createDrill` call) and redirects into `/drills/<id>/diagrams/new`; `/drills/<id>/finish` renders `DrillForm` in `full` mode for a drill that already exists (title/notes still need filling in) instead of the plain `/drills/new` create flow.

- [ ] **Step 1: Add the entry-choice link to `/drills/new`**

In `src/app/drills/new/page.tsx`, add a link to the new diagram-first route next to the existing form. Modify the page body:

```tsx
  return (
    <main>
      <ScreenHeader
        title={library === 'outfield' ? 'New outfield drill' : 'New goalkeeping drill'}
        backHref="/drills"
        backLabel="Drills"
      />
      <div style={{ padding: '0 18px', marginBottom: 4 }}>
        <a href={`/drills/new/diagram?library=${library}`} style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
          Start with a diagram instead →
        </a>
      </div>
      <DrillForm library={library} initial={null} mode={mode} />
    </main>
  )
```

(Plain `<a>`, not `Button`/`Link`, since this is a same-app but cross-flow navigation with a query param the `Button` component's `href` prop already supports identically — using `Button variant="ghost" href={...}` is equally valid; either works, pick `Button` for consistency with the rest of the codebase's convention of not using raw `<a>` tags. Use:)

```tsx
      <div style={{ padding: '0 18px 4px' }}>
        <Button variant="ghost" href={`/drills/new/diagram?library=${library}`}>
          Start with a diagram instead →
        </Button>
      </div>
```

Add `import { Button } from '@/components/ui/Button'` to the top of the file.

- [ ] **Step 2: Create the diagram-first entry route**

```tsx
// src/app/drills/new/diagram/page.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createDrill } from '@/lib/drills'
import { typesFor } from '@/lib/taxonomy'
import type { DrillInput, Library } from '@/lib/types'

/**
 * "Start with a diagram" entry point (add-drill experience design,
 * 2026-08-12): creates a minimal draft drill immediately — drill_diagram
 * rows require an existing drill_id — then hands off to the diagram editor
 * itself. The coach never sees this screen; it's a one-tick redirect.
 */
export default function NewDrillFromDiagramPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const library: Library = searchParams.get('library') === 'goalkeeping' ? 'goalkeeping' : 'outfield'
    const input: DrillInput = {
      library, name: 'Untitled drill', type: typesFor(library)[0], age_band: null,
      suitable_from: null, duration_mins: null, players_min: null, players_max: null,
      goals_needed: 0, cones_needed: 0, bibs_needed: false, image_url: null,
      setup: [], how_it_works: [], coaching_points: [], progressions: null,
      source: null, tags: [], is_draft: true,
    }

    createDrill(input)
      .then((drill) => router.replace(`/drills/${drill.id}/diagrams/new?entry=diagram`))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to start drill'))
  }, [router, searchParams])

  return (
    <main style={{ padding: 40, textAlign: 'center' }}>
      {error ? (
        <p style={{ color: 'var(--accent)', fontSize: 13 }}>{error}</p>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--ink-45)' }}>Setting up your canvas…</p>
      )}
    </main>
  )
}
```

- [ ] **Step 3: Make the diagrams/new route pass `drillMeta` when arriving from this entry point**

Modify `src/app/drills/[id]/diagrams/new/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getDrill } from '@/lib/drills-server'
import { listDiagramsForDrill } from '@/lib/diagrams-server'
import { DiagramEditor } from '@/components/diagrams/DiagramEditor'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export const dynamic = 'force-dynamic'

export default async function NewDiagramPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ entry?: string }>
}) {
  const { id } = await params
  const { entry } = await searchParams
  const drill = await getDrill(id)
  if (!drill) notFound()

  const existing = await listDiagramsForDrill(id)

  return (
    <main>
      <ScreenHeader title={`New diagram · ${drill.name}`} backHref={`/drills/${id}`} backLabel={drill.name} />
      <DiagramEditor drillId={id} position={existing.length} existing={null} drillMeta={entry === 'diagram' ? drill : null} />
    </main>
  )
}
```

- [ ] **Step 4: Redirect to the "finish details" screen after saving, only for the diagram-first path**

In `src/components/diagrams/DiagramEditor.tsx`'s `save()` function, the existing `router.push(`/drills/${drillId}`)` (line 239) always goes to the drill detail page. Change it to go to `/finish` when this was a diagram-first creation:

```tsx
      router.push(drillMeta ? `/drills/${drillId}/finish` : `/drills/${drillId}`)
```

- [ ] **Step 5: Create the "finish details" screen**

```tsx
// src/app/drills/[id]/finish/page.tsx
import { notFound } from 'next/navigation'
import { getDrill } from '@/lib/drills-server'
import { DrillForm } from '@/components/drills/DrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export const dynamic = 'force-dynamic'

/**
 * Reached after saving a diagram-first drill's first diagram (add-drill
 * experience design, 2026-08-12) — the drill already exists with taxonomy
 * fields set from the diagram editor's metadata panel; this screen fills in
 * title/setup/how-it-works/coaching points, same form as editing any drill.
 */
export default async function FinishDrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const drill = await getDrill(id)
  if (!drill) notFound()

  return (
    <main>
      <ScreenHeader title={`Finish · ${drill.name}`} backHref={`/drills/${id}`} backLabel={drill.name} />
      <DrillForm library={drill.library} initial={drill} mode="full" />
    </main>
  )
}
```

- [ ] **Step 6: Manual QA — walk both entry paths end to end**

Run: `npm run dev`.
Path A (words-first): `/drills/new` → fill title/notes → save → lands on drill detail page. Expected: unchanged from before this task.
Path B (diagram-first): `/drills/new` → "Start with a diagram instead" → auto-redirects to a blank canvas with a visible metadata sidebar (desktop) → choose a pitch preset, place a few players/cones → confirm sidebar shows live counts and a suggested tag → Save → lands on `/drills/<id>/finish` with `DrillForm` pre-populated with whatever was set in the sidebar (age band, type, tags) → fill in title/notes → save → lands on drill detail page showing both the diagram and the notes.
Expected: both paths produce a complete, non-draft-if-fully-filled drill record; `Untitled drill` placeholder name is visible and editable on the finish screen.

Run: `npx vitest run` — confirm full suite passes.

- [ ] **Step 7: Commit**

```bash
git add "src/app/drills/new/diagram/page.tsx" "src/app/drills/[id]/finish/page.tsx" "src/app/drills/new/page.tsx" "src/app/drills/[id]/diagrams/new/page.tsx" src/components/diagrams/DiagramEditor.tsx
git commit -m "feat: add diagram-first drill creation entry point"
```

---

### Task 7: Step sequences — Step 1 / Step 2 tabs

**Files:**
- Modify: `src/components/diagrams/DiagramGallery.tsx`
- Modify: `src/components/diagrams/DiagramView.tsx` (no signature change needed — confirmed unused by this task beyond being rendered inside the new tab UI)
- Create: `src/components/diagrams/DiagramStepTabs.tsx`
- Test: `src/lib/diagram-steps.test.ts`
- Create: `src/lib/diagram-steps.ts`

**Interfaces:**
- Consumes: `Diagram[]` (existing).
- Produces:
  ```ts
  // src/lib/diagram-steps.ts
  export interface DiagramStepGroup {
    sequenceGroup: string | null   // null = a standalone diagram, not part of any sequence
    diagrams: Diagram[]            // ordered by position; length 1 for a standalone group
  }
  export function groupDiagramsIntoSteps(diagrams: Diagram[]): DiagramStepGroup[]
  ```
  Groups appear in the order their first diagram appears in the input (which is already position-ordered by every caller — `listDiagramsForDrill`, `diagramsByDrillId`). `DiagramStepTabs` renders one `DiagramStepGroup` as either a single `DiagramView` (length 1) or a tab strip (length > 1).

- [ ] **Step 1: Write the failing tests for `groupDiagramsIntoSteps`**

```ts
// src/lib/diagram-steps.test.ts
import { describe, expect, it } from 'vitest'
import { groupDiagramsIntoSteps } from './diagram-steps'
import type { Diagram } from './types'

function diagram(id: string, position: number, sequenceGroup: string | null): Diagram {
  return {
    id, drill_id: 'd1', position, title: null, pitch_preset: 'full', elements: [],
    sequence_group: sequenceGroup, created_at: '', updated_at: '',
  }
}

describe('groupDiagramsIntoSteps', () => {
  it('returns one standalone group per diagram when none share a sequence_group', () => {
    const diagrams = [diagram('a', 0, null), diagram('b', 1, null)]
    expect(groupDiagramsIntoSteps(diagrams)).toEqual([
      { sequenceGroup: null, diagrams: [diagrams[0]] },
      { sequenceGroup: null, diagrams: [diagrams[1]] },
    ])
  })

  it('groups diagrams sharing a sequence_group into one entry, in position order', () => {
    const diagrams = [diagram('a', 0, 'seq-1'), diagram('b', 1, 'seq-1')]
    expect(groupDiagramsIntoSteps(diagrams)).toEqual([
      { sequenceGroup: 'seq-1', diagrams: [diagrams[0], diagrams[1]] },
    ])
  })

  it('preserves overall order when standalone and grouped diagrams are mixed', () => {
    const diagrams = [diagram('a', 0, null), diagram('b', 1, 'seq-1'), diagram('c', 2, 'seq-1'), diagram('d', 3, null)]
    const result = groupDiagramsIntoSteps(diagrams)
    expect(result.map((g) => g.sequenceGroup)).toEqual([null, 'seq-1', null])
    expect(result[1].diagrams.map((d) => d.id)).toEqual(['b', 'c'])
  })

  it('returns an empty array for no diagrams', () => {
    expect(groupDiagramsIntoSteps([])).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/diagram-steps.test.ts`
Expected: FAIL — `Cannot find module './diagram-steps'`.

- [ ] **Step 3: Implement `groupDiagramsIntoSteps`**

```ts
// src/lib/diagram-steps.ts
import type { Diagram } from './types'

export interface DiagramStepGroup {
  sequenceGroup: string | null
  diagrams: Diagram[]
}

/**
 * Diagrams sharing a non-null `sequence_group` render as Step 1/Step 2/Step 3
 * tabs instead of separate gallery entries (add-drill experience design,
 * 2026-08-12). Callers already pass diagrams in `position` order
 * (listDiagramsForDrill, diagramsByDrillId) — this only groups, it doesn't
 * re-sort.
 */
export function groupDiagramsIntoSteps(diagrams: Diagram[]): DiagramStepGroup[] {
  const groups: DiagramStepGroup[] = []
  const groupIndexBySequence = new Map<string, number>()

  for (const diagram of diagrams) {
    if (diagram.sequence_group === null) {
      groups.push({ sequenceGroup: null, diagrams: [diagram] })
      continue
    }
    const existingIndex = groupIndexBySequence.get(diagram.sequence_group)
    if (existingIndex === undefined) {
      groupIndexBySequence.set(diagram.sequence_group, groups.length)
      groups.push({ sequenceGroup: diagram.sequence_group, diagrams: [diagram] })
    } else {
      groups[existingIndex].diagrams.push(diagram)
    }
  }

  return groups
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/diagram-steps.test.ts`
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Build `DiagramStepTabs`**

```tsx
// src/components/diagrams/DiagramStepTabs.tsx
'use client'

import { useState } from 'react'
import type { DiagramStepGroup } from '@/lib/diagram-steps'
import { DiagramView } from './DiagramView'

/** Renders one DiagramStepGroup: a single diagram directly, or a Step 1/Step
    2/... tab strip when the group has more than one (add-drill experience
    design, 2026-08-12). Read-only — used in the drill detail gallery, not
    the editor. */
export function DiagramStepTabs({ group, maxWidth = 260 }: { group: DiagramStepGroup; maxWidth?: number }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (group.diagrams.length === 1) {
    return <DiagramView diagram={group.diagrams[0]} maxWidth={maxWidth} />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {group.diagrams.map((diagram, i) => (
          <button
            key={diagram.id}
            onClick={() => setActiveIndex(i)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: i === activeIndex ? 'var(--accent)' : 'transparent',
              color: i === activeIndex ? 'var(--ground)' : 'var(--on-mat-muted)',
              border: i === activeIndex ? 'none' : '1px solid var(--hairline)',
            }}
          >
            Step {i + 1}
          </button>
        ))}
      </div>
      <DiagramView diagram={group.diagrams[activeIndex]} maxWidth={maxWidth} />
    </div>
  )
}
```

- [ ] **Step 6: Wire `DiagramStepTabs` into `DiagramGallery`**

Modify `src/components/diagrams/DiagramGallery.tsx` to group diagrams before rendering, replacing the flat `diagrams.map` with a grouped render. The per-diagram edit-link and delete-button stay per-diagram (editing/deleting always targets one specific diagram id, even inside a step group) — only the *view* inside each gallery card becomes a `DiagramStepTabs` when the diagram is part of a multi-item group:

```tsx
'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Diagram } from '@/lib/types'
import { groupDiagramsIntoSteps } from '@/lib/diagram-steps'
import { DiagramView } from './DiagramView'
import { DiagramStepTabs } from './DiagramStepTabs'
import { DeleteDiagramDialog } from './DeleteDiagramDialog'
import { Button } from '@/components/ui/Button'

export function DiagramGallery({ drillId, diagrams }: { drillId: string; diagrams: Diagram[] }) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const groups = groupDiagramsIntoSteps(diagrams)

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Diagrams</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map((group) => (
          <div key={group.diagrams[0].id} style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            {group.diagrams.length === 1 ? (
              <Link href={`/drills/${drillId}/diagrams/${group.diagrams[0].id}/edit`}>
                <DiagramView diagram={group.diagrams[0]} />
              </Link>
            ) : (
              <DiagramStepTabs group={group} />
            )}
            {group.diagrams[0].title && (
              <div style={{ fontSize: 11, color: 'var(--on-mat-muted)', marginTop: 4 }}>{group.diagrams[0].title}</div>
            )}
            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
              {group.diagrams.map((diagram, i) => (
                <Link key={diagram.id} href={`/drills/${drillId}/diagrams/${diagram.id}/edit`} style={{ fontSize: 11, color: 'var(--on-mat-muted)' }}>
                  {group.diagrams.length > 1 ? `Edit step ${i + 1}` : 'Edit'}
                </Link>
              ))}
              <Button variant="muted" onClick={() => setPendingDeleteId(group.diagrams[0].id)}>Delete</Button>
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

(This keeps the multi-item group's "Delete" button scoped to just its first diagram for now — deleting an individual step is a click on "Edit step N" followed by a delete from that diagram's own edit screen, which doesn't exist as a delete-from-editor action today either; this matches the plan's spec, which explicitly deferred drag-to-reorder and doesn't ask for per-step delete-from-gallery.)

- [ ] **Step 7: Manual QA**

Run: `npm run dev`. Since there's no UI yet to *set* `sequence_group` on creation (out of scope per the spec — "Creating a new step from an existing diagram duplicates that diagram's elements" describes behavior, not a UI this plan builds a dedicated control for), verify grouping behavior directly: open Supabase Studio (or `psql`) and manually set two existing diagrams on the same drill to the same `sequence_group` UUID, then reload the drill detail page.
Expected: those two diagrams now render as one gallery card with "Step 1"/"Step 2" tab buttons that switch the displayed `DiagramView`; every other diagram on that drill still renders as its own standalone card.

Run: `npx vitest run` — confirm full suite passes.

- [ ] **Step 8: Commit**

```bash
git add src/lib/diagram-steps.ts src/lib/diagram-steps.test.ts src/components/diagrams/DiagramStepTabs.tsx src/components/diagrams/DiagramGallery.tsx
git commit -m "feat: group diagrams sharing a sequence_group into Step tabs"
```

---

### Task 8: "+ New step" action — duplicate the current diagram into a new sequence member

**Files:**
- Modify: `src/components/diagrams/DiagramGallery.tsx`
- Modify: `src/lib/diagrams.ts`

**Interfaces:**
- Consumes: `createDiagram` (existing, `src/lib/diagrams.ts`), `Diagram` (existing).
- Produces:
  ```ts
  // src/lib/diagrams.ts — new export
  export async function createDiagramStep(source: Diagram, nextPosition: number): Promise<Diagram>
  ```
  Creates a new diagram that copies `source`'s `elements`/`pitch_preset`, assigns it `source.sequence_group ?? crypto.randomUUID()` (generating a fresh group id the first time a standalone diagram gains a second step), and — when a fresh id was generated — also patches `source` itself to carry that same `sequence_group` via `updateDiagram`, so both diagrams end up grouped.

- [ ] **Step 1: Implement `createDiagramStep`**

```ts
// src/lib/diagrams.ts — add below the existing updateDiagram function
/**
 * "+ New step" (add-drill experience design, 2026-08-12): starts the next
 * step in a sequence from a copy of `source`'s elements, since most step
 * transitions only move a few things rather than starting from a blank
 * canvas. If `source` isn't part of a sequence yet, this is the moment one
 * begins — a fresh group id is generated and written back onto `source` too,
 * so the two diagrams become Step 1 and Step 2 of the same group.
 */
export async function createDiagramStep(source: Diagram, nextPosition: number): Promise<Diagram> {
  const sequenceGroup = source.sequence_group ?? crypto.randomUUID()
  if (source.sequence_group === null) {
    await updateDiagram(source.id, { title: source.title, elements: source.elements, sequence_group: sequenceGroup })
  }

  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from('drill_diagram')
    .insert({
      drill_id: source.drill_id,
      position: nextPosition,
      title: null,
      pitch_preset: source.pitch_preset,
      elements: source.elements,
      sequence_group: sequenceGroup,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create diagram step: ${error.message}`)
  return data as Diagram
}
```

This calls `updateDiagram` with a `sequence_group` field, which its current type signature doesn't accept — widen it:

```ts
export async function updateDiagram(
  id: string,
  patch: { title: string | null; elements: DiagramInput['elements']; sequence_group?: string },
): Promise<Diagram> {
```

- [ ] **Step 2: Add the "+ New step" button to each gallery card**

In `src/components/diagrams/DiagramGallery.tsx`, add a router and the new action. Add `'use client'` imports:

```tsx
import { useRouter } from 'next/navigation'
import { createDiagramStep } from '@/lib/diagrams'
```

Inside the component, add:

```tsx
  const router = useRouter()
  const [creatingStepFor, setCreatingStepFor] = useState<string | null>(null)

  async function addStep(group: (typeof groups)[number]) {
    const last = group.diagrams[group.diagrams.length - 1]
    setCreatingStepFor(last.id)
    try {
      const created = await createDiagramStep(last, diagrams.length)
      router.push(`/drills/${drillId}/diagrams/${created.id}/edit`)
      router.refresh()
    } catch {
      setCreatingStepFor(null)
    }
  }
```

Add the button next to the existing "Edit step N" links, inside each group's action row:

```tsx
              <Button variant="muted" onClick={() => addStep(group)} disabled={creatingStepFor === group.diagrams[group.diagrams.length - 1].id}>
                + New step
              </Button>
```

- [ ] **Step 3: Manual QA**

Run: `npm run dev`, open a drill with one existing diagram, click "+ New step" on it.
Expected: a new diagram is created with the same elements/preset, the page navigates to that new diagram's edit screen, saving it and returning to the drill detail page now shows the original and the new diagram grouped as Step 1/Step 2 tabs (per Task 7's rendering).

Run: `npx vitest run` — confirm full suite passes (no new pure-logic tests here beyond what Task 7 already covers; `createDiagramStep`/`addStep` are thin Supabase-call wiring, exercised by the manual QA above, consistent with how `createDiagram`/`updateDiagram` themselves have no unit tests in this codebase — they're integration-tested manually, same pattern).

- [ ] **Step 4: Commit**

```bash
git add src/lib/diagrams.ts src/components/diagrams/DiagramGallery.tsx
git commit -m "feat: add + New step action to duplicate a diagram into a sequence"
```

---

### Task 9: Step tabs in the Session view and print sheet

**Files:**
- Modify: `src/components/sessions/SessionView.tsx` (find the diagram-rendering block referenced by `session-view-diagrams-list` in `globals.css:261`)

**Interfaces:**
- Consumes: `groupDiagramsIntoSteps` (Task 7), `DiagramStepTabs` (Task 7).

- [ ] **Step 1: Locate and update the diagram render block**

Run: `grep -n "session-view-diagrams-list\|DiagramView" src/components/sessions/SessionView.tsx` to find the exact block (this file wasn't read during planning — confirm the surrounding code before editing). Find the `.map` that renders each drill's diagrams via `<DiagramView diagram={...} />` inside the `session-view-diagrams-list` container.

- [ ] **Step 2: Swap the flat diagram list for grouped step tabs**

Replace the flat `diagrams.map((diagram) => <DiagramView diagram={diagram} .../>)` with:

```tsx
import { groupDiagramsIntoSteps } from '@/lib/diagram-steps'
import { DiagramStepTabs } from '@/components/diagrams/DiagramStepTabs'

// ...inside the render, replacing the existing diagrams.map call:
{groupDiagramsIntoSteps(diagrams).map((group) => (
  <DiagramStepTabs key={group.diagrams[0].id} group={group} maxWidth={220} />
))}
```

Match whatever `maxWidth` value (if any) the existing `<DiagramView>` call already used in this file — use that same value instead of `220` if it differs, so visual sizing doesn't change as a side effect of this task.

- [ ] **Step 3: Confirm print behavior is unaffected**

Read the `@media print` block in `src/app/globals.css` (starts at line 269) to confirm it doesn't reference `DiagramView` internals directly (it styles by class name, e.g. `.session-view-diagrams-list`), so swapping the child component doesn't require print-CSS changes. `DiagramStepTabs`'s tab buttons (`useState`-driven) will print whichever step is currently active in the browser at print time — acceptable, since the spec only requires diagrams to print, not an interactive step-picker on paper.

- [ ] **Step 4: Manual QA**

Run: `npm run dev`, open the pitchside Session view for a session containing the drill from Task 8's manual QA (the one with Step 1/Step 2).
Expected: the Session view shows the same Step 1/Step 2 tab control as the drill detail gallery; switching tabs updates which diagram is shown; opening print preview (`Cmd+P` / browser print dialog) shows the currently-active step's diagram on the printed sheet.

Run: `npx vitest run` — confirm full suite passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/sessions/SessionView.tsx
git commit -m "feat: render Step 1/Step 2 tabs for diagram sequences in Session view"
```

---

## Post-plan verification

- [ ] Run `npx vitest run` one final time — full suite green.
- [ ] Run `npx tsc --noEmit` (or the project's existing typecheck script, if one is defined in `package.json`) — no new type errors.
- [ ] Walk both entry paths from Task 6's manual QA once more end to end after all tasks are merged, since later tasks (7, 8, 9) touch files Task 6 also touches indirectly (`DiagramGallery.tsx`).
