# Add-drill experience revamp — design

## Context

The diagram editor shipped 2026-08-10 (`DiagramEditor.tsx`, `drill_diagram` table) covers pitch presets, drag-and-drop equipment/players, and solid/dashed/wavy arrow notation. Adding a drill today still means: fill out `DrillForm` (title, type, age band, players, setup/how-it-works/coaching-points text) first, save, then separately go add a diagram. Manually-typed fields (`players_min`/`players_max`, `cones_needed`, `goals_needed`, `bibs_needed`) duplicate information that's already implicit in whatever gets drawn on the canvas.

This spec covers the add-drill flow end to end: how a drill gets started, how the canvas and the drill's metadata inform each other, and fixing two concrete interaction problems in the existing editor (element re-grab difficulty, weak icon artwork). Field View / high-contrast print mode is out of scope — that's a separate, already-partially-covered concern (existing `print-only`/`no-print` stylesheet).

## Entry flow: dual entry point

"+ New Drill" offers two starting choices, both landing on the same drill record:

- **Start with words** — today's `DrillForm` flow (title, type, age band, text fields) first; canvas comes after.
- **Start with a diagram** — the canvas opens immediately (title optional, defaults to "Untitled drill"); text fields come after.

Neither path is primary. A coach who already knows the shape of the drill in their head reaches for words; a coach building it visually reaches for the canvas. Both converge on the same drill detail/edit screen once both halves are filled in — this is only about which door gets opened first, not a second data model.

## Auto-extraction from the canvas

A pure function over the diagram's existing `DiagramElement[]` (`src/lib/diagram-elements.ts`) derives, on every change:

- `player_count` — count of `kind: 'player'` elements
- team split (e.g. "4 green vs 2 red") — grouped by `color` among player elements, rendered as a suggested tag like `4v2`
- equipment tally — `kind: 'equipment'` elements grouped by `type`, mapped to `cones_needed`/`goals_needed`/`bibs_needed` where a direct column exists, otherwise surfaced as free text (e.g. "1 ladder, 2 poles")

No new detection framework — this reuses the same `elements` array already serialized to `drill_diagram.elements`. It runs client-side, live, as the coach places/moves/deletes elements.

## Where derived metadata surfaces

**Desktop**: a persistent sidebar next to the canvas (replacing/extending today's 240px tool sidebar, or a second panel alongside it) shows the live-derived values as editable fields — tap `Players: 6` to override, tap the `4v2` suggested tag to accept/reject/edit it. No separate confirmation screen: hitting **Save** on the drill is the confirmation. This sidebar is also where the existing taxonomy fields live — `age_band` (see below) and `type` as pick-list chips, plus the freeform `tags` array with auto-suggested values (like `4v2`) pre-populated but removable.

**Mobile**: full-width canvas (no room for a persistent sidebar). A floating summary chip (e.g. "6 players · 4 cones") sits at the bottom of the canvas; tapping it expands the same editable fields inline, then collapses back.

## Data model changes

- **`age_band` enum**: currently `U6-U8` / `U9-U11` only. Widen with an additive `ALTER TYPE age_band ADD VALUE`, adding `U12-U14` and `U15-U18` — no data migration, the column comment in `0001_drills.sql` already anticipated this.
- **No new taxonomy columns.** `type` (drill_type enum) already covers warm-up/passing/dribbling/tactical categories; `tags text[]` already exists as a freeform bucket — auto-suggested values like `4v2` or a technical-focus tag land there rather than a new structured column. This keeps the taxonomy surface exactly as wide as SoccerDrive's reference model without adding schema the app doesn't otherwise need.
- **`players_min`/`players_max`, `cones_needed`, `goals_needed`, `bibs_needed`**: stay as-is structurally, but are now pre-filled from canvas auto-extraction instead of typed blind. Still user-editable (a drill can specify a player range wider than what one example diagram shows).
- **Step sequences**: add `sequence_group uuid null` to `drill_diagram`. Diagrams sharing a non-null `sequence_group` render as **Step 1 / Step 2 / Step 3** tabs (ordered by existing `position`) instead of a plain gallery, in the editor, drill detail gallery, Session view, and print sheet. Creating a new step from an existing diagram duplicates that diagram's `elements` as the starting point (most steps only move a few elements) rather than opening a blank canvas.

## Editor interaction fixes

Two concrete problems with today's `DiagramEditor.tsx`, both scoped to this spec:

### 1. Placed elements are hard to re-grab

Today, `EquipmentEl` has an explicit 24×24 invisible hit rect, but `PlayerEl`/`ShapeEl`/`ArrowEl` only hit-test their thin (2–2.5px) stroke path — grabbing a player outline or an arrow line to move it means clicking exactly on a few pixels of stroke.

Fix: every placed element gets a uniform invisible ~36px-diameter hit target (matching the existing blue dashed selection ring's radius, `DiagramElements.tsx:111`), regardless of the element's own visual size or stroke weight. Applies to all four kinds — equipment already has this, players/shapes/arrows currently don't.

While an element is actively being dragged (`dragFrom` state in `DiagramEditor.tsx`), it renders ~5% larger and with a stronger drop-shadow/highlight than its resting or merely-selected state — a visible "you're holding this" cue distinct from the existing static blue selection ring, which only means "this is selected," not "this is currently moving."

Placement itself (drag from the palette icon, drop on canvas) is unchanged — that gesture isn't the problem.

### 2. Icon artwork redesign

The current equipment icon set (`EquipmentIcon.tsx` — cone, ball, mannequin, goal, ladder, pole, wall) and player markers (circle/filled/triangle/omega) need a visual pass: cleaner linework, more distinct silhouettes at the small palette size (22×22) and the on-canvas size (24×24, per `DiagramElements.tsx`'s `EquipmentEl`). This is a visual-design task against the existing single-source-of-truth architecture (`EquipmentIcon` renders identically in the palette and on the canvas) — no structural change to how icons are wired in, just new artwork.

## Testing

- Pure-logic unit tests: auto-extraction function (element array → player count / team split / equipment tally), age_band enum migration, step-sequence grouping/ordering.
- Manual QA (mouse and touch, desktop and mobile breakpoints): start a drill from words, start a drill from a diagram, confirm both converge on the same record; place and re-grab each element kind (confirm hit target and drag-scale feel); create a Step 2 from an existing diagram and confirm it starts as a duplicate; verify auto-extracted values pre-fill and remain editable; confirm sidebar (desktop) vs floating chip (mobile) both surface the same editable fields.

## Out of scope

- Field View / high-contrast mode, PDF export (already partially covered by the existing print stylesheet; revisit separately).
- Multi-select / group-move of multiple elements at once.
- Diagram version history / undo-redo (already out of scope per the 2026-08-10 spec).
- Concurrent multi-editor conflict handling (no auth, single coach — not a real scenario for this app).
