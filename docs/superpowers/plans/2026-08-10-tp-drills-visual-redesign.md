# TP_Drills Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the new design system decided in `docs/superpowers/specs/2026-08-10-tp-drills-visual-redesign.md`: swap the app's accent color from orange to pitch green, swap the headline font from Hubot Sans (bold italic uppercase) to Plus Jakarta Sans (upright), and give the diagram editor's seven equipment tools (cone, ball, mannequin, goal, ladder, pole/flag, wall) literal, detailed icon artwork instead of plain geometric placeholders — in both the tool palette and on the actual pitch canvas.

**Architecture:** The color and typography changes are token-level (`globals.css`/`layout.tsx`), so they propagate to every screen automatically — no per-component changes needed there. The equipment icon artwork is extracted into one new shared component (`EquipmentIcon`) so the palette preview (`DiagramEditor.tsx`'s `ToolIcon`) and the actual placed element (`DiagramElements.tsx`'s `EquipmentEl`) render identically, the same "one source of truth" principle the diagrams feature already uses everywhere else.

**Tech Stack:** Next.js (App Router), `next/font/google` (new — Plus Jakarta Sans, self-hosted automatically at build time, no runtime third-party requests), plain inline-style/CSS React — no new runtime dependencies.

## Global Constraints

- Equipment icons render with **fixed intrinsic colors** (e.g. the cone is always orange-red, the goal frame always black) — they do **not** use the coach's selected palette color. This is a deliberate consequence of "literal, detailed equipment" from the spec: a multi-color illustrated cone can't be reduced to one flat swatch color the way a shape/player/arrow can. Shapes, players, and arrows are unaffected — they keep using `el.color` exactly as today.
- The `color` field is still stored on equipment `DiagramElement`s for schema consistency (no type change needed), it's just unused at render time for that `kind`.
- No change to player markers, shape tools, or arrow styles — confirmed staying as already built.
- No change to the dark shell's layout/navigation structure, only its accent color.
- `next/font/google`'s Plus Jakarta Sans replaces the self-hosted `HubotSans-Italic.woff2` (removed once nothing references it) — `MonaSans.woff2` (body font) is untouched.

---

### Task 1: Accent color — orange to pitch green

**Files:**
- Modify: `src/app/globals.css:5,15,29`

**Interfaces:** None — pure CSS custom property values, no consumers change.

- [ ] **Step 1: Update the three accent tokens**

In `src/app/globals.css`, change:

```css
  --accent: #f15e22;
```

to:

```css
  --accent: #16a34a;
```

Change:

```css
  --accent-border: rgba(241, 94, 34, 0.40);
```

to:

```css
  --accent-border: rgba(22, 163, 74, 0.40);
```

Change:

```css
  --accent-tint: rgba(241, 94, 34, 0.14);
```

to:

```css
  --accent-tint: rgba(22, 163, 74, 0.14);
```

Leave the surrounding comments as they are — they describe the *role* of each token (draft banner edge, reflect-tag tint), which hasn't changed, only the color has.

- [ ] **Step 2: Manual QA**

Run `npm run dev`, open the Hub, Drills list, a drill detail page, and the Planner. Confirm every place that used to be orange (draft banners, the reflect tag, focus/selected states, the pitchside "current drill" marker border) is now green, and nothing looks broken or low-contrast against the dark background.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors (this is a CSS-only change, typecheck is a sanity check that nothing else broke).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: accent color moves from orange to pitch green"
```

---

### Task 2: Typography — Plus Jakarta Sans replaces Hubot Sans

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css:56-63`
- Delete: `src/fonts/HubotSans-Italic.woff2`

**Interfaces:** None — `--font-jakarta` is a new CSS variable consumed only by the `.hl, h1, h2, h3, h4` rule this task also updates.

- [ ] **Step 1: Add Plus Jakarta Sans via `next/font/google`, remove the Hubot Sans local font**

Current `src/app/layout.tsx`:

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

Replace it with:

```tsx
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-jakarta',
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
    <html lang="en" className={`${jakarta.variable} ${mona.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Update the headline CSS rule**

In `src/app/globals.css`, change:

```css
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
```

to:

```css
/* Headline. Every h1-h4 and anything marked .hl. */
.hl, h1, h2, h3, h4 {
  font-family: var(--font-jakarta), system-ui, sans-serif;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.05;
  margin: 0;
}
```

(No `font-style`/`text-transform` overrides — Plus Jakarta Sans headlines are upright, sentence case, per the approved design direction.)

- [ ] **Step 3: Delete the now-unused Hubot Sans font file**

```bash
rm src/fonts/HubotSans-Italic.woff2
```

- [ ] **Step 4: Manual QA**

Run `npm run dev`, open the Hub, a drill detail page, and the diagram editor's title bar. Confirm every heading now renders in Plus Jakarta Sans (upright, not italic, not all-caps) and body text is still Mona Sans, unchanged. Confirm no layout breaks — some headings may wrap differently now that the uppercase transform is gone and line-height changed from 0.92 to 1.05; skim each screen for anything that now looks cramped or overlapping.

- [ ] **Step 5: Typecheck and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, all tests still passing (this change touches no logic, only layout/CSS).

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git rm src/fonts/HubotSans-Italic.woff2
git commit -m "feat: headline font moves from Hubot Sans to Plus Jakarta Sans"
```

---

### Task 3: Shared `EquipmentIcon` component — 7 detailed equipment icons

**Files:**
- Create: `src/components/diagrams/EquipmentIcon.tsx`

**Interfaces:**
- Produces: `<EquipmentIcon type={el.type} />` — returns raw SVG shape nodes (no wrapping `<svg>`/`<g>`) drawn in a 24×24 coordinate space, centered at (12,12). Consumed by Task 4 (`DiagramEditor.tsx`'s `ToolIcon`, wrapped in a 24×24 `<svg viewBox="0 0 24 24">`) and Task 5 (`DiagramElements.tsx`'s `EquipmentEl`, wrapped in `<g transform="translate(cx-12, cy-12)">`) — same markup, two different wrappers, so the palette preview and the on-canvas element are pixel-identical in shape.
- Handles exactly these 7 `type` values: `'cone' | 'ball' | 'mannequin' | 'goal-small' | 'ladder' | 'pole' | 'wall'`. Returns `null` for anything else (defensive — every caller only ever passes one of these seven, per the equipment tool list).

- [ ] **Step 1: Write the component**

```tsx
// src/components/diagrams/EquipmentIcon.tsx
/**
 * The seven equipment tools' icon artwork, drawn literally (a cone that
 * looks like a cone, a ball that looks like a ball) rather than the plain
 * geometric placeholders used before — design doc, 2026-08-10. Fixed
 * intrinsic colors, not the coach's selected palette color: a multi-color
 * illustrated cone can't be reduced to one flat swatch the way a shape,
 * player, or arrow can.
 *
 * Drawn in a 24x24 space centered at (12,12) with no wrapping `<svg>`/`<g>`
 * of its own, so callers can drop it into either a small fixed-size palette
 * icon or a `<g transform="translate(...)">` on the pitch canvas — same
 * shape, two different sizes/positions, one source of truth.
 */
export function EquipmentIcon({ type }: { type: string }) {
  switch (type) {
    case 'cone':
      return (
        <>
          <polygon points="12,3 5,21 19,21" fill="#ff6a1a" />
          <rect x="8.75" y="13.5" width="6.5" height="2.5" fill="#ffffff" />
          <ellipse cx="12" cy="21" rx="4.5" ry="1" fill="#ff6a1a" />
        </>
      )
    case 'ball':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" fill="#ffffff" stroke="#101828" strokeWidth={1.4} />
          <polygon points="12,9 14.2,10.6 13.4,13.2 10.6,13.2 9.8,10.6" fill="#101828" />
        </>
      )
    case 'mannequin':
      return (
        <>
          <ellipse cx="12" cy="5.5" rx="3" ry="3.2" fill="#f97316" />
          <path
            d="M8.5,9 C8.5,7.8 10,7 12,7 C14,7 15.5,7.8 15.5,9 L14.5,20.5 C14.5,21.4 13.4,22 12,22 C10.6,22 9.5,21.4 9.5,20.5 Z"
            fill="#f97316"
          />
          <rect x="7" y="12.5" width="10" height="2" rx={1} fill="#ea580c" />
        </>
      )
    case 'goal-small':
      return (
        <>
          <path
            d="M4,20 L4,7 L20,7 L20,20"
            fill="none"
            stroke="#101828"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5,8.5 L6.5,19 M9.5,8.5 L9.5,19 M14.5,8.5 L14.5,19 M17.5,8.5 L17.5,19"
            stroke="#c7cbd1"
            strokeWidth={0.6}
          />
        </>
      )
    case 'ladder':
      return (
        <>
          <rect x="6" y="3" width="2" height="18" rx={1} fill="#facc15" />
          <rect x="16" y="3" width="2" height="18" rx={1} fill="#facc15" />
          <rect x="7" y="6" width="10" height="1.6" fill="#facc15" />
          <rect x="7" y="11.2" width="10" height="1.6" fill="#facc15" />
          <rect x="7" y="16.4" width="10" height="1.6" fill="#facc15" />
        </>
      )
    case 'pole':
      return (
        <>
          <line x1="7" y1="3" x2="7" y2="21" stroke="#101828" strokeWidth={1.6} strokeLinecap="round" />
          <polygon points="7.8,4 15,6.5 7.8,9" fill="#dc2626" />
        </>
      )
    case 'wall':
      return (
        <>
          <rect x="4" y="10" width="16" height="7" rx={2} fill="#94a3b8" />
          <circle cx="8" cy="7.5" r="2" fill="#94a3b8" />
          <circle cx="12" cy="7.5" r="2" fill="#94a3b8" />
          <circle cx="16" cy="7.5" r="2" fill="#94a3b8" />
        </>
      )
    default:
      return null
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors. (This component isn't consumed anywhere yet — Tasks 4 and 5 wire it up — so this only confirms it compiles standalone.)

- [ ] **Step 3: Commit**

```bash
git add src/components/diagrams/EquipmentIcon.tsx
git commit -m "feat: add detailed equipment icon artwork"
```

---

### Task 4: Wire `EquipmentIcon` into the tool palette

**Files:**
- Modify: `src/components/diagrams/DiagramEditor.tsx`

**Interfaces:**
- Consumes: `<EquipmentIcon type />` from `./EquipmentIcon` (Task 3).

- [ ] **Step 1: Import `EquipmentIcon`**

At the top of `src/components/diagrams/DiagramEditor.tsx`, add:

```ts
import { EquipmentIcon } from './EquipmentIcon'
```

- [ ] **Step 2: Replace the equipment cases in `ToolIcon`**

In `ToolIcon`, the current equipment cases are:

```tsx
    case 'cone':
      return <polygon points="12,4 5,20 19,20" fill={ink} />
    case 'ball':
      return <circle cx={12} cy={12} r={6} fill="none" stroke={ink} strokeWidth={2} />
    case 'mannequin':
      return <rect x={7} y={7} width={10} height={10} fill={ink} />
    case 'goal-small':
      return <rect x={4} y={9} width={16} height={7} fill="none" stroke={ink} strokeWidth={2} />
    case 'ladder':
      return (
        <g stroke={ink} strokeWidth={2}>
          <line x1={7} y1={4} x2={7} y2={20} />
          <line x1={17} y1={4} x2={17} y2={20} />
          <line x1={7} y1={8} x2={17} y2={8} />
          <line x1={7} y1={13} x2={17} y2={13} />
          <line x1={7} y1={18} x2={17} y2={18} />
        </g>
      )
    case 'pole':
      return <line x1={12} y1={4} x2={12} y2={20} stroke={ink} strokeWidth={3} strokeLinecap="round" />
    case 'wall':
      return <rect x={4} y={9} width={16} height={7} fill={ink} />
```

Replace all seven with a single case that delegates to the shared component:

```tsx
    case 'cone':
    case 'ball':
    case 'mannequin':
    case 'goal-small':
    case 'ladder':
    case 'pole':
    case 'wall':
      return <EquipmentIcon type={type} />
```

Leave every other case in `ToolIcon` (`square`, `circle`, `player-*`, `arrow-*`, `line-solid`) exactly as they are — those are unaffected by this task.

- [ ] **Step 3: Manual QA**

Run `npm run dev`, open `/drills/<any-drill-id>/diagrams/new`, pick a pitch preset, and look at the Equipment row in the palette. Confirm all seven tools now show the detailed artwork (orange cone, ball with a centered pentagon, orange mannequin figure, black goal frame with faint net lines, yellow ladder, pole with a red flag, gray wall with three head-dots) instead of the old plain shapes.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/diagrams/DiagramEditor.tsx
git commit -m "feat: use detailed equipment icons in the tool palette"
```

---

### Task 5: Wire `EquipmentIcon` into the on-canvas rendering

**Files:**
- Modify: `src/components/diagrams/DiagramElements.tsx`

**Interfaces:**
- Consumes: `<EquipmentIcon type />` from `./EquipmentIcon` (Task 3).

This is the task that makes the palette and the actual pitch consistent — right now the palette shows a placeholder shape but the placed element on the canvas is a different, even simpler shape (and, until Task 4, the palette was too). After this task both render the exact same artwork.

- [ ] **Step 1: Import `EquipmentIcon`**

At the top of `src/components/diagrams/DiagramElements.tsx`, add:

```ts
import { EquipmentIcon } from './EquipmentIcon'
```

- [ ] **Step 2: Replace `EquipmentEl`**

Current:

```tsx
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
```

Replace it with:

```tsx
/**
 * Equipment renders the same literal artwork as the tool palette
 * (`EquipmentIcon`, drawn in a 24x24 space centered at (12,12)), translated
 * so that origin lands on the element's placed (x, y) — same shape at
 * palette-icon size and on-canvas size, one source of truth (design doc,
 * 2026-08-10). Unlike shapes/players/arrows, equipment ignores the coach's
 * picked color entirely: the artwork has its own fixed, literal coloring.
 */
function EquipmentEl({ el }: { el: DiagramElement }) {
  return (
    <g transform={`translate(${el.x - 12}, ${el.y - 12})`}>
      <EquipmentIcon type={el.type} />
    </g>
  )
}
```

- [ ] **Step 3: Remove the now-unused equipment entries from `RADIUS`**

`RADIUS` currently is:

```ts
const RADIUS: Record<string, number> = {
  circle: 14, cone: 6, ball: 6, mannequin: 8,
  'player-circle': 14, 'player-omega': 14, 'player-triangle': 14, 'player-filled': 14,
}
```

`cone`, `ball`, and `mannequin` were only ever read by the old `EquipmentEl`, which no longer uses `RADIUS` at all (its size is now fixed by `EquipmentIcon`'s own 24×24 artwork, not a lookup). Remove them, keeping only the shape/player entries still in use elsewhere (`ShapeEl`'s `circle` case, `PlayerEl`):

```ts
const RADIUS: Record<string, number> = {
  circle: 14,
  'player-circle': 14, 'player-omega': 14, 'player-triangle': 14, 'player-filled': 14,
}
```

- [ ] **Step 4: Manual QA — the actual round trip that matters**

Run `npm run dev`, open a diagram (or create one), place a few different equipment items on the canvas (a cone, a ball, a goal), and confirm each one renders with the same detailed artwork as its palette button — not the old flat shapes. Save the diagram, then view it read-only on the drill detail gallery and (if the drill is in a session) the pitchside Session view, and confirm the same artwork shows up there too, since `DiagramElements` is the shared renderer for all three.

- [ ] **Step 5: Typecheck and run tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 0 errors, all tests passing. (No test exercises `DiagramElements`' rendering output directly — it's SVG JSX, consistent with how this component has been treated throughout the diagrams feature — so this step confirms nothing else broke, not new coverage.)

- [ ] **Step 6: Commit**

```bash
git add src/components/diagrams/DiagramElements.tsx
git commit -m "feat: render placed equipment with the same detailed artwork as the palette"
```

---

### Task 6: Full regression pass

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: PASS, every test file green.

- [ ] **Step 2: Full typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, zero errors across the whole project.

- [ ] **Step 3: End-to-end visual walkthrough**

Run `npm run dev` and walk through: the Hub (headline font, green accent) → Drills list (filter chips, green active states) → a drill detail page (headings, gallery) → the diagram editor (palette icons, equipment on canvas, Save button) → back to the drill detail gallery (thumbnail shows the new equipment artwork) → a session containing that drill in the pitchside Session view (diagram still renders correctly) → print-preview that session (confirm the new green accent and equipment icons still read fine on the light print stylesheet, which forces white backgrounds).

- [ ] **Step 4: Commit (only if Step 3 surfaced fixes)**

If the walkthrough found nothing to fix, there's nothing to commit here. If it surfaced a small fix, make it, re-run Steps 1-2, and commit with a message describing what the walkthrough caught.
