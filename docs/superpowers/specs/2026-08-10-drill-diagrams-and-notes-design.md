# Drill diagrams and structured notes — design

## Context

TP_Drills currently gives each drill a single uploaded photo and three free-text-ish fields: `setup` (text), `how_it_works` (text), `coaching_points` (text[], already a repeating bullet list). On desktop the drill detail page is a single `maxWidth: 640` column, leaving the right half of the screen empty. There's no way to draw a tactical diagram — the closest thing is uploading a photo of one drawn elsewhere.

This spec adds:
1. An in-app drawing canvas for pitch diagrams, attached to a drill, editable and re-openable (not a flat image).
2. Structured bullet-point notes for `setup` and `how_it_works`, matching the existing `coaching_points` pattern.
3. A responsive two-column drill detail layout that uses the desktop width instead of leaving it blank.
4. Diagrams surfacing on the pitchside Session view and its print sheet, not just the drill library.

## Data model

### `drill.setup` / `drill.how_it_works`: `text` → `text[]`

Migration converts existing values by splitting on `\n` and dropping blank lines, matching how `coaching_points` is already trimmed/filtered on save (`DrillForm.save`). Both columns get `not null default '{}'`, same as `coaching_points`.

`src/lib/validation.ts`'s `blank()` check for these two fields changes from "string is empty after trim" to "array has zero entries" — `missingFields` behavior is otherwise unchanged (an empty Setup/How it works still keeps a drill a draft).

### New table: `drill_diagram`

```sql
create table drill_diagram (
  id            uuid primary key default gen_random_uuid(),
  drill_id      uuid not null references drill(id) on delete cascade,
  position      int not null,
  title         text,
  pitch_preset  text not null check (pitch_preset in ('full', 'half', 'grid')),
  elements      jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index drill_diagram_drill_idx on drill_diagram (drill_id);
```

Same wide-open anon RLS policies as `drill` (this app has no auth by design — spec 12 of the original Phase 2 design).

`position` orders diagrams within a drill (creation order in v1 — no drag-to-reorder; the optional `title` field, e.g. "Phase 2", is enough to keep a multi-stage sequence readable without adding reorder UI now).

### Element shape (inside `elements` jsonb array)

Plain JSON objects, one per placed item on the canvas:

```ts
interface DiagramElement {
  id: string
  kind: 'shape' | 'equipment' | 'player' | 'arrow'
  type: string       // e.g. 'square' | 'circle' | 'cone' | 'ball' | 'mannequin'
                      //      | 'goal' | 'ladder' | 'pole' | 'wall'
                      //      | 'player-circle' | 'player-omega' | 'player-triangle' | 'player-filled'
                      //      | 'arrow-solid' | 'arrow-dashed' | 'arrow-wavy'
  color: string       // one of a fixed palette (green/blue/yellow/red/black/gray), matching the reference tool
  x: number
  y: number
  x2?: number         // arrows/lines and drag-sized shapes only
  y2?: number
  label?: string
}
```

Point elements (equipment, players) have `x`/`y` only. Shapes (drawn by drag-out) and arrows/lines (drawn point-to-point) use `x`/`y` plus `x2`/`y2`. This is the full serialized state of a diagram — reopening it for editing means reading this array back into canvas state, no reconstruction logic needed beyond rendering.

## Editor architecture

**Approach: plain SVG + React state, hand-rolled drag via the Pointer Events API. No canvas library dependency.**

Rejected alternative — `react-konva`/Konva.js: a proven canvas library with built-in drag/select/transform. Loses on two things that matter here: a `<canvas>` element has to be rasterized to an image before it prints reliably, which fights the app's existing "one component, one stylesheet with a print block" pitchside print architecture; and it's a new dependency in an app that currently has zero beyond Supabase/Next.

Why SVG wins for this app specifically:
- The rendered SVG elements map 1:1 to the saved JSON — no export/import translation step.
- SVG prints natively and crisply through the *existing* print stylesheet (`SessionView.tsx`'s `print-only`/`no-print` classes) — this is the one piece of the whole feature that's genuinely load-bearing, since diagrams need to show up on a printed pitchside sheet.
- Pointer Events (not separate mouse/touch handlers) unify mouse, touch, and pen — needed since the editor must work on a phone/tablet, not just desktop. `touch-action: none` is set on the canvas surface during an active drag so dragging an element doesn't also scroll the page.

### Interaction model

- **Shapes** (`Shapes` palette, click+drag): pointerdown on canvas starts a drag-out rectangle/circle at the clicked color/type; pointerup commits `x,y,x2,y2`.
- **Equipment / Players** (drag from palette): pointerdown on a palette icon, pointermove tracks a ghost preview, pointerup over the canvas places the element at that point (`x,y`).
- **Arrows + Lines** (click+drag): pointerdown sets the start point, pointerup sets the end point (`x,y,x2,y2`), with solid/dashed/wavy rendered via SVG `stroke-dasharray` (wavy uses a repeating path, not `stroke-dasharray`).
- **Selecting an element**: tap/click an element → it highlights and a floating **Delete** button appears near it; tap/click empty canvas deselects. No drag-to-trash, no keyboard-only delete — identical behavior on mouse and touch.
- **Toolbar**: pitch-preset picker (full / half / grid — chosen once, at diagram creation), Clear all, Toggle grid, Save.

### Pitch presets

Three fixed SVG backgrounds selected at diagram creation: full pitch (goals top+bottom, halfway line — matches the reference screenshot), half pitch, and a plain grid with no pitch markings. Preset is stored once per diagram (`pitch_preset` column) and isn't editable after creation — starting a new diagram with a different preset is simpler than in-place preset switching and matches how little this needs to flex.

### Routes and data access

- `/drills/[id]/diagrams/new` and `/drills/[id]/diagrams/[diagramId]/edit` — full-screen routes, same pattern as the Session Builder having its own screen rather than a modal.
- `src/lib/diagrams.ts` (client mutations) + `src/lib/diagrams-server.ts` (server reads) — mirrors the existing `drills.ts`/`drills-server.ts` split.
- A shared **read-only** `<DiagramView elements pitchPreset />` component renders the identical SVG markup with no pointer handlers — used everywhere a diagram is displayed but not edited (drill detail gallery thumbnails, Session view, print sheet).

## Drill detail page

### Layout

Desktop (≥ some breakpoint, e.g. 900px) switches from the current single `maxWidth: 640` column to a two-column CSS grid:

- **Main column**: Setup, How it works, Coaching points, Progressions, Reflection history.
- **Sidebar**: Photo, Diagrams gallery, Equipment, Tags, Source, Usage.

Below the breakpoint, one column — sidebar content flows after the main column via grid-template-areas reordering, not a separate mobile component.

### Diagrams gallery

A row of diagram thumbnails (rendered via `<DiagramView>` at small size) in the sidebar, plus a "+ New diagram" action. Tapping a thumbnail opens it directly in the editor (nothing is destructive before Save, so no read-only detour is needed first). Deleting a diagram reuses the existing `DeleteDrillDialog` confirm pattern (a small "Delete this diagram?" dialog), for consistency with how every other destructive action in the app already works.

### Notes as bullet lists

`Setup` and `How it works` become repeating point-list fields in `DrillForm`, identical editing pattern to `Coaching points` — one "+ Add point" flow, three fields, same shape. On the detail page they render as `<ul>` bullets, same treatment `Coaching points` already gets, replacing the current `whiteSpace: 'pre-wrap'` paragraph block.

## Session view integration

Each drill in the pitchside Session view (`SessionView.tsx`) shows all of its diagrams via `<DiagramView>`, in creation order. Layout adapts per device rather than being fixed: stacked full-width on mobile and in the print sheet, allowed to sit side-by-side in a row when there's enough width on a larger screen. Included in the existing print stylesheet via the same `print-only`/`no-print` class convention already in use — SVG prints natively, no extra print-specific rendering path needed.

## Testing

- Pure-logic unit tests: element serialization round-trip (elements array → saved JSON → reconstructed canvas state is identity), the `setup`/`how_it_works` newline-split migration helper, `validation.ts`'s updated `blank()` behavior for array fields.
- Manual QA (both mouse and touch): draw one of each element type, drag-reposition a placed element, select + delete an element, save and reload a diagram (state round-trips correctly), print preview with diagrams present.

## Out of scope (v1)

- Diagram version history / undo-redo.
- Standalone PNG/image export or sharing outside the app.
- Resizing or rotating placed icons after placement (equipment/players are fixed-size at drop, matching the reference tool; shapes are sized once via their initial drag-out).
- Drag-to-reorder diagrams within a drill (creation order + optional `title` is enough for v1).
- Concurrent multi-editor conflict handling (single coach, no auth — not a real scenario for this app).
