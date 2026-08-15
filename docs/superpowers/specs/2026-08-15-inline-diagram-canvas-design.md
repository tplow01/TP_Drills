# Inline diagram canvas — design

## Context

The diagram editor (`DiagramEditor.tsx`) currently only exists as a full-page tool: reaching it always means a navigation (from the Add Drill screen's diagram box, or from a drill's "+ New diagram"/"Edit" links), it renders a green striped pitch background with a full/half/grid preset picker, and its toolbar/controls are styled as a light card floating inside the app's otherwise-dark theme. The tool icons (cone, ball, mannequin, goal, ladder, pole, wall) are small (22px) and hard to tell apart at a glance.

This spec removes the navigation entirely — the canvas becomes an always-live, embedded part of whichever screen you're on — and replaces the pitch with an open, minimally-marked surface, since a diagram here is a general sketch space (players, equipment, arrows), not literally a football pitch. It also redraws the toolbar to fit the app's dark theme with bigger, clearer icons.

## Visual redesign

**Surface:** the pitch (`PitchBackground.tsx`'s mow-stripe green rectangle, preset picker) is replaced by a single fixed surface: dark background (`#161a20`, matching the app's card tone) with a faint dot grid (`radial-gradient`, ~1px dots on a 20px pitch, ~13% opacity) for a sense of scale — barely visible, never mistaken for pitch markings. No preset options; there is exactly one surface. Same portrait proportions as today (540×960, i.e. the existing `PITCH_DIMENSIONS` constant), unaffected by where it's embedded — mobile and desktop both keep the canvas portrait, sized to fit available width with that aspect ratio preserved.

**Toolbar:** the four existing tool groups (Shapes, Equipment, Players, Arrows + lines) become tabs above the canvas — `[Shapes] [Equipment] [Players] [Arrows]` — with only the active group's tools shown as a row of icon buttons below the tabs. Icons grow from 22px to 44px and get redrawn: current artwork uses near-black strokes (`#101828`) tuned for a white card background, which would be nearly invisible on the new dark toolbar, so every icon needs re-coloring (lighter strokes/fills, kept literal — a cone still looks like a cone) as well as simplifying for legibility at the larger size. Player and shape tools carry the coach's selected palette color as before; equipment keeps its fixed illustrative colors, adjusted for dark-background contrast.

The color palette swatches, "Clear all", and Save controls stay, restyled to match the dark theme (currently `cardStyle`'s white/light look).

## Where the canvas lives

### Add Drill screen (new drill)

Already embedded per the entry-simplification work (`AddDrillForm.tsx`) as a placeholder box; this spec replaces that placeholder with the live canvas itself — no click required to "open" it. Because the drill doesn't exist yet, drawn elements live in local component state (a `DiagramElement[]` array, same shape `DiagramEditor` already manages) until "Add drill" is pressed. At that point: `createDrill` runs first (as today), then — only if any elements were placed — `createDiagram({ drill_id: created.id, position: 0, title: null, elements })`. An empty canvas (no elements placed) saves no diagram row at all, same as leaving it untouched today.

`AddDrillForm` already collects Name and Type in its own fields, so the canvas here does not render its own taxonomy pickers (unlike today's `DrillMetadataPanel`, which only existed because the old diagram-first entry route had no name/type fields yet — that route is already gone). Instead, a small read-out under the canvas shows what's been detected as you draw: `deriveDrillMetadata(elements)` renders as e.g. "6 players · 4 cones · 0 goals" — informational only, not editable fields. The actual `goals_needed`/`cones_needed`/`bibs_needed`/suggested tags still get applied the same way they do today (via `deriveDrillMetadata`, at save time), just without a visible edit UI on this screen — the coach can adjust them afterward on `/drills/[id]/edit`, same as any other auto-filled field.

### Existing drill's page (`/drills/[id]`)

`DiagramGallery`'s "+ New diagram", each diagram's "Edit", and "+ New step" currently navigate to `/drills/[id]/diagrams/new` and `/drills/[id]/diagrams/[diagramId]/edit`. These become inline expansions instead:

- "+ New diagram" toggles an expanded canvas section directly under the gallery (local `expanded` state in `DiagramGallery`), pre-populated empty, with a Save/Cancel pair in place of the old page's Save button. Save calls `createDiagram` and collapses back to the gallery with the new diagram now shown; Cancel just collapses, discarding local state.
- Tapping a diagram thumbnail (today: navigates to its edit page) instead expands that diagram inline in the same spot, loaded with its existing `elements`. Save calls `updateDiagram`; Cancel collapses without saving.
- "+ New step" keeps calling `createDiagramStep` (unchanged — it duplicates the source diagram's elements server-side) but instead of `router.push` to the new step's edit page, it expands the newly-created step inline, already in edit mode.

Only one diagram (or the new-diagram form) can be expanded at a time — expanding a second one collapses whichever was open, so the gallery never shows two open canvases at once.

`/drills/[id]/diagrams/new/page.tsx` and `/drills/[id]/diagrams/[diagramId]/edit/page.tsx` are deleted; their logic (create/update calls, `existing`/`drillMeta` props) moves into `DiagramGallery`'s inline expansion.

## Component structure

- **`DiagramCanvas`** (new, replaces `DiagramEditor`): the toolbar (tabbed groups, bigger icons), the dot-grid surface, and all existing element-manipulation logic (`DiagramElements.tsx`'s render, pointer-drag placement/resize, `handlePaletteDown`/`Move`/`Up`, color palette, "Clear all") — everything `DiagramEditor` does today except the page shell (`ScreenHeader`, sticky top bar with a title input, the background-preset picker, the light `cardStyle` theming, and the `DrillMetadataPanel` sidebar/chip). Props: `elements: DiagramElement[]`, `onChange: (elements: DiagramElement[]) => void`, `onSave: () => void`, `onCancel?: () => void` (omitted where there's no "back out" concept, e.g. embedded in `AddDrillForm` before the drill exists), `saving: boolean`. No `drillId`/routing knowledge — purely a controlled canvas over an elements array plus a save/cancel action pair.
- **`PitchBackground.tsx`** is replaced by a new `DotGridBackground.tsx` (same `{ width, height }` shape as `PITCH_DIMENSIONS`, no `preset` prop — one surface, not three) rendering the dot grid as a plain repeating SVG pattern. `DiagramCanvas` uses it directly; `DiagramView.tsx` (which renders a diagram read-only in the drill detail gallery, Session view, and print sheet) swaps its `PitchBackground` import for `DotGridBackground` so every rendering of a diagram — editable or not — shows the same surface. `PitchBackground.tsx` and the now-unused `pitch_preset` rendering branch are deleted; the `drill_diagram.pitch_preset` column itself is left in place (untouched data, no migration) since it's not read anymore but dropping a column is out of scope for a visual change.
- **`EquipmentIcon.tsx`** keeps its role (literal per-type artwork shared between palette and on-canvas rendering) but every case gets redrawn: bigger default viewBox assumptions aren't needed (still 24×24 internally, same "draw once, scale via the caller's `<svg width/height>`" pattern that already lets the palette and canvas share one source) — only the actual paths/colors change for dark-background legibility and clarity at 44px.
- **`AddDrillForm.tsx`**: the "Diagram (optional)" placeholder `<button>` is replaced with `<DiagramCanvas elements={elements} onChange={setElements} ... />` (no `onSave`/`onCancel` — it's just part of the form; the outer "Add drill" button is the only save action). `elements` starts as `[]`.
- **`DiagramGallery.tsx`**: gains `expandedId: string | 'new' | null` state; renders `DiagramCanvas` inline wherever expanded, wired to `createDiagram`/`updateDiagram`/`createDiagramStep`.
- **`DrillMetadataPanel.tsx`** is deleted — its only caller (the old diagram-first route) no longer exists, and the Add Drill screen's simplified "detected" read-out (above) replaces its role without duplicating taxonomy fields `AddDrillForm` already has.

## Data model changes

None. `DiagramElement[]`, `drill_diagram` (`elements`, `sequence_group`, `position`), and `Drill`/`DrillInput` are all unchanged — this is a rendering/interaction and entry-flow change only.

## Testing

- Manual QA (desktop and mobile breakpoints): draw on the Add Drill screen's canvas with no drill saved yet, confirm elements persist into the created drill's first diagram on save; save with an empty canvas and confirm no diagram row is created; on an existing drill, expand "+ New diagram", draw, save, confirm it appears in the gallery; tap an existing diagram, confirm it expands inline pre-loaded with its elements, edit and save; confirm only one gallery item can be expanded at a time; create a step via "+ New step" and confirm it opens inline already containing the duplicated elements; confirm dark-theme toolbar/icon legibility at both breakpoints; confirm tabs correctly isolate each tool group.
- No lib-level test changes needed — `deriveDrillMetadata`, `diagram-elements.ts`, and `diagram-steps.ts` are unchanged; this spec only touches component structure and visuals.

## Out of scope

- Any change to the underlying element-manipulation logic (drag/resize/color handling in `DiagramElements.tsx`) beyond what's needed to host it outside a page shell.
- Redesigning `DiagramStepTabs` (Step 1/Step 2 switcher) — unaffected by this change, continues to sit above whichever diagram (now inline-expandable) is showing.
