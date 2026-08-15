# Inline Diagram Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the full-page pitch-background diagram editor with an always-embedded, dark-themed canvas on a faint dot-grid surface — no navigation to open it, no pitch, bigger/clearer tool icons — used inline on the Add Drill screen and on an existing drill's detail page.

**Architecture:** Extract the element-editing logic from `DiagramEditor.tsx` into a new presentational `DiagramCanvas` component with no routing/page knowledge (controlled `elements`/`onChange`, optional `onSave`/`onCancel`). Embed it directly in `AddDrillForm` (local unsaved state until the drill saves) and in `DiagramGallery` (inline expand/collapse instead of navigating to a dedicated route). Delete the now-unreachable full-page routes.

**Tech Stack:** Next.js 15 (App Router), React client components, Supabase (`createDiagram`/`updateDiagram`/`createDiagramStep` in `src/lib/diagrams.ts`), no new dependencies.

## Global Constraints

- No data model changes — `DiagramElement`, `Diagram`, `DiagramInput`, `drill_diagram` columns (including `pitch_preset`, left in place but no longer user-selectable — every new diagram is created with `pitch_preset: 'full'`) are unchanged.
- Follow existing component conventions: inline `style` objects, dark theme tokens from `src/app/globals.css` (`--field-bg`, `--hairline`, `--radius`, `--radius-sm`, `--accent`, `--accent-tint`, `--accent-border`, `--ink`, `--ink-45`, `--ink-70`, `--ground`).
- No component test suite exists in this codebase — verification is manual QA, not new test files. `deriveDrillMetadata`, `diagram-elements.ts`, `diagram-steps.ts` are unchanged, so no lib-level test changes are needed either.
- Canvas stays portrait (540×960 aspect ratio) at every embed site and breakpoint.

---

### Task 1: Dot-grid surface

**Files:**
- Create: `src/components/diagrams/DotGridBackground.tsx`
- Delete: `src/components/diagrams/PitchBackground.tsx`
- Modify: `src/components/diagrams/DiagramView.tsx`

**Interfaces:**
- Produces: `DIAGRAM_DIMENSIONS: { width: number; height: number }` (replaces `PITCH_DIMENSIONS`), `DotGridBackground(): JSX.Element` (replaces `PitchBackground({ preset })`) — both from `src/components/diagrams/DotGridBackground.tsx`.

- [ ] **Step 1: Write `DotGridBackground.tsx`**

```tsx
// src/components/diagrams/DotGridBackground.tsx
import { useId } from 'react'

/** One shared canvas size for every diagram — editor, gallery, Session view,
    print (inline diagram canvas redesign, 2026-08-15, replacing the old
    per-preset PITCH_DIMENSIONS). Portrait 16:9-ish, unchanged from before. */
export const DIAGRAM_DIMENSIONS = { width: 540, height: 960 }

const DOT = 'rgba(242,244,246,0.13)'
const SURFACE = '#161a20'

/**
 * The one open drawing surface every diagram uses now — a faint dot grid
 * for a sense of scale, no pitch markings (a diagram here is a general
 * sketch space, not literally a football pitch). Replaces
 * `PitchBackground`'s three presets with a single fixed look.
 *
 * `useId()` keys the `<pattern>` id per instance so multiple diagrams
 * rendered on one page (e.g. a drill's full gallery) don't collide on a
 * shared id — duplicate SVG ids in one document would make every instance
 * resolve to whichever pattern the browser saw first.
 */
export function DotGridBackground() {
  const patternId = `diagram-dot-grid-${useId()}`
  const { width, height } = DIAGRAM_DIMENSIONS
  return (
    <>
      <defs>
        <pattern id={patternId} width={20} height={20} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill={DOT} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={width} height={height} rx={8} fill={SURFACE} />
      <rect x={0} y={0} width={width} height={height} rx={8} fill={`url(#${patternId})`} />
    </>
  )
}
```

- [ ] **Step 2: Delete `PitchBackground.tsx`**

```bash
git rm src/components/diagrams/PitchBackground.tsx
```

- [ ] **Step 3: Update `DiagramView.tsx` to use the new surface**

Replace the full contents of `src/components/diagrams/DiagramView.tsx` with:

```tsx
// src/components/diagrams/DiagramView.tsx
import { DIAGRAM_DIMENSIONS, DotGridBackground } from './DotGridBackground'
import { DiagramElements } from './DiagramElements'
import type { Diagram } from '@/lib/types'

/** Read-only render of a diagram — no pointer handlers. Used in the drill detail gallery and the pitchside Session view/print sheet. */
export function DiagramView({ diagram, maxWidth = 260 }: { diagram: Diagram; maxWidth?: number }) {
  const { width, height } = DIAGRAM_DIMENSIONS
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth, display: 'block' }}>
      <DotGridBackground />
      <DiagramElements elements={diagram.elements} />
    </svg>
  )
}
```

Note: `diagram.pitch_preset` is no longer read here — the diagram's stored preset value is now display-irrelevant (Global Constraints: the column stays in the database, just unused for rendering).

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors will surface in `DiagramEditor.tsx` (still imports `PitchBackground`) — that's expected, Task 3 fixes it. Confirm there are no errors in `DotGridBackground.tsx` or `DiagramView.tsx` specifically.

- [ ] **Step 5: Commit**

```bash
git add src/components/diagrams/DotGridBackground.tsx src/components/diagrams/DiagramView.tsx
git rm src/components/diagrams/PitchBackground.tsx 2>/dev/null || true
git commit -m "feat: replace pitch background with a dot-grid drawing surface"
```

---

### Task 2: Dark-theme, larger tool icons

**Files:**
- Modify: `src/components/diagrams/EquipmentIcon.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `EquipmentIcon({ type }): JSX.Element` — same signature, only internal colors change. Callers (Task 3's `DiagramCanvas`) render it at a larger size (44px button, 32px inner `<svg>`) via the same "draw once, scale via the caller's `<svg width/height>`" pattern already documented in this file's header comment — no prop changes needed for the size bump.

Two of the seven equipment icons use a near-black stroke (`#101828`) as their only visible color on a transparent background — invisible against the new dark toolbar. The other five (cone, ball, mannequin, ladder, wall) already use colors bright/saturated enough to read on dark backgrounds and are left unchanged.

- [ ] **Step 1: Recolor the `goal-small` case**

In `src/components/diagrams/EquipmentIcon.tsx`, find the `case 'goal-small':` block (its main frame `<path>` uses `stroke="#101828"`). Change that one stroke value:

```tsx
    case 'goal-small':
      return (
        <>
          <path
            d="M4,20 L4,6.5 L20,6.5 L20,20"
            fill="none"
            stroke="#f2f4f6"
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

(Only the first `<path>`'s `stroke` changed from `#101828` to `#f2f4f6`; the two net-line paths keep their existing medium-gray `#9aa1ab`, which already has enough contrast against a dark background.)

- [ ] **Step 2: Recolor the `pole` case**

Find `case 'pole':` (its pole shaft `<line>` uses `stroke="#101828"`). Change that stroke value:

```tsx
    case 'pole':
      return (
        <>
          <line x1="7.5" y1="3" x2="7.5" y2="21" stroke="#f2f4f6" strokeWidth={1.8} strokeLinecap="round" />
          <polygon points="8.3,4.2 15.5,6.6 8.3,9" fill="#dc2626" stroke="#a51c1c" strokeWidth={0.4} strokeLinejoin="round" />
        </>
      )
```

(Only the `<line>`'s `stroke` changed from `#101828` to `#f2f4f6`; the red flag polygon is unchanged — it was already high-contrast.)

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from this file (pre-existing errors from Task 1's `DiagramEditor.tsx` import breakage are unrelated and still expected at this point).

- [ ] **Step 4: Commit**

```bash
git add src/components/diagrams/EquipmentIcon.tsx
git commit -m "fix: recolor goal and pole icons for dark-theme visibility"
```

---

### Task 3: Build `DiagramCanvas`, remove `DiagramEditor`/`DrillMetadataPanel`

**Files:**
- Create: `src/components/diagrams/DiagramCanvas.tsx`
- Delete: `src/components/diagrams/DiagramEditor.tsx`
- Delete: `src/components/diagrams/DrillMetadataPanel.tsx`

**Interfaces:**
- Consumes: `DotGridBackground`, `DIAGRAM_DIMENSIONS` (Task 1); `EquipmentIcon` (Task 2); `DiagramElements` (unchanged, `src/components/diagrams/DiagramElements.tsx`, props `{ elements, selectedId?, draggingId?, onPointerDownElement?, onPointerDownHandle? }`); `clamp`, `elementColorHex`, `normalizeRect` from `src/lib/diagram-elements.ts`; `DiagramElement`, `ElementColor`, `ElementKind` from `src/lib/types.ts`.
- Produces: `DiagramCanvas(props): JSX.Element` — a controlled, drill-agnostic canvas. Consumed by Task 5 (`AddDrillForm`) and Task 6 (`DiagramGallery`). Full prop signature:
  ```ts
  {
    elements: DiagramElement[]
    onChange: (elements: DiagramElement[]) => void
    title?: string
    onTitleChange?: (title: string) => void
    onSave?: () => void
    onCancel?: () => void
    saving?: boolean
    error?: string | null
  }
  ```
  Omitting `title`/`onTitleChange` hides the title field entirely. Omitting `onSave` hides the Save/Cancel row entirely (the surrounding form owns saving). `onCancel` only renders if both `onSave` and `onCancel` are given.

- [ ] **Step 1: Write `DiagramCanvas.tsx`**

```tsx
// src/components/diagrams/DiagramCanvas.tsx
'use client'

import { useRef, useState } from 'react'
import { DIAGRAM_DIMENSIONS, DotGridBackground } from './DotGridBackground'
import { DiagramElements } from './DiagramElements'
import { EquipmentIcon } from './EquipmentIcon'
import { clamp, elementColorHex, normalizeRect } from '@/lib/diagram-elements'
import type { DiagramElement, ElementColor, ElementKind } from '@/lib/types'

const PALETTE_COLORS: ElementColor[] = ['green', 'blue', 'yellow', 'red', 'black', 'gray']

const SHAPE_TOOLS = [{ type: 'square', label: 'Square' }, { type: 'circle', label: 'Circle' }]
const EQUIPMENT_TOOLS = [
  { type: 'cone', label: 'Cone' }, { type: 'ball', label: 'Ball' }, { type: 'mannequin', label: 'Mannequin' },
  { type: 'goal-small', label: 'Goal' }, { type: 'ladder', label: 'Ladder' },
  { type: 'pole', label: 'Pole' }, { type: 'wall', label: 'Wall' },
]
// One shape, color-only (carried over from the previous diagram editor
// revamp, 2026-08-13) — placing a player is the same interaction as placing
// equipment: pick a color, drag one marker onto the canvas.
const PLAYER_TOOLS = [{ type: 'player-filled', label: 'Player' }]
const ARROW_TOOLS = [
  { type: 'arrow-solid', label: 'Solid' }, { type: 'arrow-dashed', label: 'Dashed' },
  { type: 'arrow-wavy', label: 'Wavy' }, { type: 'line-solid', label: 'Line' },
]

const TOOL_GROUPS = [
  ['Shapes', 'shape', SHAPE_TOOLS],
  ['Equipment', 'equipment', EQUIPMENT_TOOLS],
  ['Players', 'player', PLAYER_TOOLS],
  ['Arrows', 'arrow', ARROW_TOOLS],
] as const

type GroupKind = (typeof TOOL_GROUPS)[number][1]

const ICON_INK = '#f2f4f6'

/** 24x24-space tool preview icon, light-on-dark so it reads on the app's dark toolbar (inline diagram canvas redesign, 2026-08-15). */
function ToolIcon({ type }: { type: string }) {
  switch (type) {
    case 'square':
      return <rect x={5} y={5} width={14} height={14} rx={2} fill="none" stroke={ICON_INK} strokeWidth={2} />
    case 'circle':
      return <circle cx={12} cy={12} r={7} fill="none" stroke={ICON_INK} strokeWidth={2} />
    case 'cone':
    case 'ball':
    case 'mannequin':
    case 'goal-small':
    case 'ladder':
    case 'pole':
    case 'wall':
      return <EquipmentIcon type={type} />
    case 'player-filled':
      return <circle cx={12} cy={12} r={7.5} fill={ICON_INK} />
    case 'arrow-solid':
      return (
        <g stroke={ICON_INK} strokeWidth={3.5}>
          <line x1={4} y1={20} x2={18} y2={6} />
          <polygon points="18,4 22,6 18,10" fill={ICON_INK} stroke="none" />
        </g>
      )
    case 'arrow-dashed':
      return (
        <g stroke={ICON_INK} strokeWidth={3.5}>
          <line x1={4} y1={20} x2={18} y2={6} strokeDasharray="4 3" />
          <polygon points="18,4 22,6 18,10" fill={ICON_INK} stroke="none" />
        </g>
      )
    case 'arrow-wavy':
      return (
        <g stroke={ICON_INK} strokeWidth={3.5} fill="none">
          <path d="M4,20 Q9,12 12,14 Q15,16 18,6" />
          <polygon points="18,4 22,6 18,10" fill={ICON_INK} stroke="none" />
        </g>
      )
    case 'line-solid':
      return <line x1={4} y1={20} x2={20} y2={4} stroke={ICON_INK} strokeWidth={3.5} />
    default:
      return null
  }
}

interface ArmedTool {
  kind: ElementKind
  type: string
  /** 'draw': arm via a palette click, then click+drag on the canvas (shapes, arrows). 'place': drag straight from the palette icon onto the canvas (equipment, players). */
  mode: 'place' | 'draw'
}

function newElementId(): string {
  return `el-${crypto.randomUUID()}`
}

export function DiagramCanvas({
  elements,
  onChange,
  title,
  onTitleChange,
  onSave,
  onCancel,
  saving = false,
  error = null,
}: {
  elements: DiagramElement[]
  onChange: (elements: DiagramElement[]) => void
  /** Omit both title props to hide the title field entirely — used when a
      surrounding form (AddDrillForm) already has its own Name field. */
  title?: string
  onTitleChange?: (title: string) => void
  /** Omit both to render the canvas with no Save/Cancel controls of its own
      — used when a surrounding form owns the single save action instead. */
  onSave?: () => void
  onCancel?: () => void
  saving?: boolean
  error?: string | null
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [activeGroup, setActiveGroup] = useState<GroupKind>('shape')
  const [color, setColor] = useState<ElementColor>('green')
  const [armed, setArmed] = useState<ArmedTool | null>(null)
  const [draft, setDraft] = useState<DiagramElement | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragFrom, setDragFrom] = useState<{ pointerX: number; pointerY: number; el: DiagramElement } | null>(null)
  const [resizingEndpoint, setResizingEndpoint] = useState<{ id: string; endpoint: 'start' | 'end' } | null>(null)

  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const point = svg.createSVGPoint()
    point.x = clientX
    point.y = clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return { x: 0, y: 0 }
    const local = point.matrixTransform(ctm.inverse())
    return { x: clamp(local.x, 0, DIAGRAM_DIMENSIONS.width), y: clamp(local.y, 0, DIAGRAM_DIMENSIONS.height) }
  }

  function handlePaletteDown(kind: ElementKind, type: string, e: React.PointerEvent) {
    if (kind === 'shape' || kind === 'arrow') {
      setArmed({ kind, type, mode: 'draw' })
      setSelectedId(null)
      return
    }
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
    onChange([...elements, { id: newElementId(), kind: armed.kind, type: armed.type, color, x, y }])
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
    if (resizingEndpoint) {
      onChange(
        elements.map((el) =>
          el.id === resizingEndpoint.id
            ? resizingEndpoint.endpoint === 'start'
              ? { ...el, x, y }
              : { ...el, x2: x, y2: y }
            : el,
        ),
      )
      return
    }
    if (dragFrom) {
      const dx = x - dragFrom.pointerX
      const dy = y - dragFrom.pointerY
      const base = dragFrom.el
      onChange(
        elements.map((el) =>
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
        draft.kind === 'shape' && draft.x2 !== undefined && draft.y2 !== undefined
          ? normalizeRect(draft.x, draft.y, draft.x2, draft.y2)
          : { x: draft.x, y: draft.y, x2: draft.x2, y2: draft.y2 }
      onChange([...elements, { ...draft, ...normalized, id: newElementId() }])
      setDraft(null)
      setArmed(null)
    }
    setDragFrom(null)
    setResizingEndpoint(null)
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

  function handleHandleDown(id: string, endpoint: 'start' | 'end', e: React.PointerEvent) {
    if (armed) return
    svgRef.current?.setPointerCapture(e.pointerId)
    setSelectedId(id)
    setResizingEndpoint({ id, endpoint })
  }

  function deleteSelected() {
    if (!selectedId) return
    onChange(elements.filter((el) => el.id !== selectedId))
    setSelectedId(null)
  }

  const { width, height } = DIAGRAM_DIMENSIONS
  const previewElements = draft ? [...elements, draft] : elements
  const activeTools = TOOL_GROUPS.find(([, kind]) => kind === activeGroup)![2]

  return (
    <div>
      {(title !== undefined || selectedId) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {title !== undefined && (
            <input
              value={title}
              onChange={(e) => onTitleChange?.(e.target.value)}
              placeholder="Untitled diagram"
              style={{
                flex: 1, background: 'var(--field-bg)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-sm)',
                padding: '10px 12px', color: 'var(--ink)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
              }}
            />
          )}
          {selectedId && (
            <button
              onClick={deleteSelected}
              style={{
                padding: '10px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', flex: 'none',
                background: 'none', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: 12,
              }}
            >
              Delete element
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
        {TOOL_GROUPS.map(([heading, kind]) => (
          <button
            key={kind}
            type="button"
            onClick={() => setActiveGroup(kind)}
            style={{
              padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12, fontWeight: 600, border: 'none',
              background: activeGroup === kind ? 'var(--accent-tint)' : 'transparent',
              color: activeGroup === kind ? 'var(--accent)' : 'var(--ink-45)',
            }}
          >
            {heading}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {activeTools.map((tool) => {
          const isArmed = armed?.kind === activeGroup && armed.type === tool.type
          return (
            <button
              key={tool.type}
              onPointerDown={(e) => handlePaletteDown(activeGroup, tool.type, e)}
              onPointerMove={handlePaletteMove}
              onPointerUp={handlePaletteUp}
              title={tool.label}
              style={{
                width: 44, height: 44, display: 'grid', placeItems: 'center', borderRadius: 'var(--radius-sm)', cursor: 'pointer', flex: 'none',
                border: isArmed ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                background: isArmed ? 'var(--accent-tint)' : 'var(--field-bg)',
              }}
            >
              <svg width={32} height={32} viewBox="0 0 24 24"><ToolIcon type={tool.type} /></svg>
            </button>
          )
        })}

        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', flexWrap: 'wrap' }}>
          {PALETTE_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={c}
              style={{
                width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', flex: 'none',
                border: color === c ? '2px solid var(--ink)' : '1px solid var(--hairline)',
                background: elementColorHex(c),
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ position: 'relative', border: '1px solid var(--hairline)', borderRadius: 'var(--radius)', padding: 10, display: 'grid', placeItems: 'center' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxWidth: width, touchAction: 'none' }}
          onPointerDown={handleCanvasDown}
          onPointerMove={handleCanvasMove}
          onPointerUp={handleCanvasUp}
        >
          <DotGridBackground />
          <DiagramElements
            elements={previewElements}
            selectedId={selectedId}
            draggingId={dragFrom?.el.id ?? null}
            onPointerDownElement={handleElementDown}
            onPointerDownHandle={handleHandleDown}
          />
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onChange([])}
          style={{ padding: '8px 14px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}
        >
          Clear all
        </button>

        {onSave && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'none', border: '1px solid var(--hairline)', color: 'var(--ink-70)', fontWeight: 700, fontSize: 12 }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: saving ? 'default' : 'pointer',
                background: 'var(--accent)', border: 'none', color: 'var(--ground)', fontWeight: 700, fontSize: 12, opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>

      {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>{error}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Delete `DiagramEditor.tsx` and `DrillMetadataPanel.tsx`**

```bash
git rm src/components/diagrams/DiagramEditor.tsx src/components/diagrams/DrillMetadataPanel.tsx
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: errors will surface in the two route files that still import `DiagramEditor` (`src/app/drills/[id]/diagrams/new/page.tsx`, `src/app/drills/[id]/diagrams/[diagramId]/edit/page.tsx`) and in `AddDrillForm.tsx`'s diagram-box button (still references the old flow) — all expected, fixed by Tasks 5 and 6. Confirm there are no errors specifically in `DiagramCanvas.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/diagrams/DiagramCanvas.tsx
git commit -m "feat: add DiagramCanvas, a routing-free embeddable diagram editor"
```

---

### Task 4: Manual visual check of `DiagramCanvas` in isolation

Since `AddDrillForm` and `DiagramGallery` aren't wired up yet (Tasks 5-6), this task temporarily mounts `DiagramCanvas` to verify it renders and behaves correctly before it's load-bearing elsewhere — catching layout/interaction bugs here is cheaper than debugging them once two call sites depend on it.

**Files:**
- Temporarily modify (then revert): `src/app/drills/new/page.tsx`

- [ ] **Step 1: Temporarily render `DiagramCanvas` standalone**

Add a throwaway route addition purely for manual verification — do not commit this. In a scratch copy, render:

```tsx
'use client'
import { useState } from 'react'
import { DiagramCanvas } from '@/components/diagrams/DiagramCanvas'
import type { DiagramElement } from '@/lib/types'

export default function ScratchPage() {
  const [elements, setElements] = useState<DiagramElement[]>([])
  return <div style={{ padding: 20, maxWidth: 500 }}><DiagramCanvas elements={elements} onChange={setElements} /></div>
}
```

Temporarily drop this into any existing page component's return (e.g. swap `src/app/drills/new/page.tsx`'s body) or create a scratch file under `src/app/` outside version control review — whichever is fastest to reach in a browser. This is a manual-only, non-committed step.

- [ ] **Step 2: Manual check**

Run: `npm run dev`, visit the scratch page. Confirm: dot-grid dark surface renders, portrait proportions hold; tabs switch between Shapes/Equipment/Players/Arrows and only the active group's tools show; tapping/dragging a Shape tool draws a rect/circle on click+drag; dragging an Equipment or Player tool from the palette places it at the drop point; icons are legible at 44px and visible against the dark background (especially the goal and pole icons fixed in Task 2); selecting a placed element and no Save/Cancel row appears (since `onSave` wasn't passed) but "Clear all" works; dragging a placed element moves it; an arrow's endpoints can be dragged to resize it.

- [ ] **Step 3: Revert the scratch change**

```bash
git checkout -- src/app/drills/new/page.tsx
```

(Or delete the scratch file if one was created instead.) Confirm `git status` shows no leftover scratch changes before continuing.

- [ ] **Step 4: No commit for this task**

This task produces no commit — it's a verification checkpoint only. If Step 2 surfaced a bug, fix it in `DiagramCanvas.tsx` now, amend Task 3's understanding, and re-run Step 2 before moving on.

---

### Task 5: Embed `DiagramCanvas` in `AddDrillForm`

**Files:**
- Modify: `src/components/drills/AddDrillForm.tsx`

**Interfaces:**
- Consumes: `DiagramCanvas` (Task 3); `createDiagram(input: DiagramInput): Promise<Diagram>` from `src/lib/diagrams.ts` (signature: `DiagramInput` is `{ drill_id, position, sequence_group, title, pitch_preset, elements }`).

- [ ] **Step 1: Replace `AddDrillForm.tsx`'s diagram box with the live canvas**

Replace the full contents of `src/components/drills/AddDrillForm.tsx` with:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createDrill } from '@/lib/drills'
import { createDiagram } from '@/lib/diagrams'
import { typeLabel, typesFor } from '@/lib/taxonomy'
import type { DiagramElement, DrillInput, DrillType, Library } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'
import { DiagramCanvas } from '@/components/diagrams/DiagramCanvas'

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--field-bg)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontFamily: 'inherit',
  fontWeight: 500,
  fontSize: 14,
  color: 'var(--ink)',
}

/**
 * Every drill created here is missing the fields a session needs (setup
 * beyond one note, coaching points, etc.), so it always saves as a draft.
 * Name defaults to "Untitled drill" when left blank — saving with only a
 * drawing and no name is a deliberate, supported path (inline diagram
 * canvas redesign, 2026-08-15): there is only one save action on this
 * screen now, so it can't gate on name the way a separate "start from a
 * diagram" button once did.
 */
function draftInput(library: Library, name: string, type: DrillType, note: string): DrillInput {
  const trimmedNote = note.trim()
  return {
    library,
    name: name.trim() || 'Untitled drill',
    type,
    age_band: null,
    suitable_from: null,
    duration_mins: null,
    players_min: null,
    players_max: null,
    goals_needed: 0,
    cones_needed: 0,
    bibs_needed: false,
    image_url: null,
    setup: trimmedNote ? [trimmedNote] : [],
    how_it_works: [],
    coaching_points: [],
    progressions: null,
    source: null,
    tags: [],
    is_draft: true,
  }
}

export function AddDrillForm({ library }: { library: Library }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState<DrillType>(typesFor(library)[0])
  const [note, setNote] = useState('')
  const [elements, setElements] = useState<DiagramElement[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const drill = await createDrill(draftInput(library, name, type, note))
      if (elements.length > 0) {
        await createDiagram({
          drill_id: drill.id, position: 0, title: null, pitch_preset: 'full', elements, sequence_group: null,
        })
      }
      router.push(`/drills/${drill.id}/edit`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 900 }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div style={{ marginBottom: 15 }}>
            <Field label="Name">
              <TextInput value={name} onChange={setName} placeholder="Four-Goal Rondo" />
            </Field>
          </div>

          <div style={{ marginBottom: 15 }}>
            <Field label="Type">
              <select
                style={selectStyle}
                value={type}
                onChange={(e) => setType(e.target.value as DrillType)}
              >
                {typesFor(library).map((t) => (
                  <option key={t} value={t}>{typeLabel(t)}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginBottom: 18 }}>
            <Field label="Note (optional)">
              <TextInput
                value={note}
                onChange={setNote}
                placeholder="Anything you want to remember. This lands in Setup."
              />
            </Field>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>{error}</div>}

          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Add drill'}
          </Button>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <Field label="Diagram (optional)">
            <DiagramCanvas elements={elements} onChange={setElements} />
          </Field>
        </div>
      </div>
    </div>
  )
}
```

Note the behavior change from before this plan: the "Add drill" button is no longer disabled when Name is blank (only while `saving`) — see the comment above `draftInput`. This is intentional: with the diagram box no longer a separate clickable action, name-required-to-save would make "start from a drawing" impossible, which contradicts this redesign's goal.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `AddDrillForm.tsx`.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, visit `/drills/new?library=outfield`. Confirm: the dashed placeholder box is gone, replaced by the live `DiagramCanvas` (tabs + toolbar + dot-grid canvas) sitting directly in the right column, no click needed. Draw a couple of elements, leave Name blank, click "Add drill" — confirm it creates an "Untitled drill" draft with a diagram containing what was drawn, and lands on `/drills/<id>/edit`. Repeat with Name filled and the canvas left empty — confirm no diagram row gets created (the drill's diagram gallery, visible after this flow via `/drills/<id>`, should be empty).

- [ ] **Step 4: Commit**

```bash
git add src/components/drills/AddDrillForm.tsx
git commit -m "feat: embed the live diagram canvas directly in AddDrillForm"
```

---

### Task 6: Inline diagram add/edit on the drill detail page; delete the old routes

**Files:**
- Modify: `src/components/diagrams/DiagramGallery.tsx`
- Delete: `src/app/drills/[id]/diagrams/new/page.tsx`
- Delete: `src/app/drills/[id]/diagrams/[diagramId]/edit/page.tsx`
- Delete: `src/app/drills/[id]/finish/page.tsx`

**Interfaces:**
- Consumes: `DiagramCanvas` (Task 3); `createDiagram`, `updateDiagram`, `createDiagramStep`, `deleteDiagram` from `src/lib/diagrams.ts` (`updateDiagram(id, { title, elements, sequence_group? })`; `createDiagramStep(source: Diagram, nextPosition: number): Promise<Diagram>`, already duplicates `source.elements` server-side — unchanged).
- Produces: `DiagramGallery({ drillId, diagrams }): JSX.Element` — same external signature as before (its caller, `src/app/drills/[id]/page.tsx`, needs no changes).

- [ ] **Step 1: Replace `DiagramGallery.tsx`'s full contents**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Diagram, DiagramElement } from '@/lib/types'
import { groupDiagramsIntoSteps } from '@/lib/diagram-steps'
import { createDiagram, createDiagramStep, updateDiagram } from '@/lib/diagrams'
import { DiagramCanvas } from './DiagramCanvas'
import { DiagramView } from './DiagramView'
import { DiagramStepTabs } from './DiagramStepTabs'
import { DeleteDiagramDialog } from './DeleteDiagramDialog'
import { Button } from '@/components/ui/Button'

/**
 * Local, keyed-by-target save/cancel wrapper around `DiagramCanvas`. Keying
 * this component by `diagram?.id ?? 'new'` at the call site (below) means
 * switching which diagram is expanded remounts fresh `title`/`elements`
 * state automatically, instead of manually syncing state to a changing prop.
 */
function InlineDiagramEditor({
  drillId,
  diagram,
  position,
  onSaved,
  onCancel,
}: {
  drillId: string
  /** null = creating a brand-new diagram at `position`. */
  diagram: Diagram | null
  position: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(diagram?.title ?? '')
  const [elements, setElements] = useState<DiagramElement[]>(diagram?.elements ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      if (diagram) {
        await updateDiagram(diagram.id, { title: title.trim() || null, elements })
      } else {
        await createDiagram({
          drill_id: drillId, position, title: title.trim() || null, pitch_preset: 'full', elements, sequence_group: null,
        })
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <DiagramCanvas
      elements={elements}
      onChange={setElements}
      title={title}
      onTitleChange={setTitle}
      onSave={save}
      onCancel={onCancel}
      saving={saving}
      error={error}
    />
  )
}

/**
 * Adding, editing, and stepping a diagram all happen inline now (inline
 * diagram canvas redesign, 2026-08-15) — no more navigating to
 * `/drills/[id]/diagrams/new` or `/diagrams/[diagramId]/edit`, both deleted.
 * `expanded` holds at most one target at a time — `'new'`, a diagram id, or
 * `null` — so opening a second editor always collapses whichever was open.
 */
export function DiagramGallery({ drillId, diagrams }: { drillId: string; diagrams: Diagram[] }) {
  const router = useRouter()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [creatingStepFor, setCreatingStepFor] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | 'new' | null>(null)
  const groups = groupDiagramsIntoSteps(diagrams)

  function handleSaved() {
    setExpanded(null)
    router.refresh()
  }

  async function addStep(group: (typeof groups)[number]) {
    const last = group.diagrams[group.diagrams.length - 1]
    setCreatingStepFor(last.id)
    setStepError(null)
    try {
      const nextPosition = Math.max(-1, ...diagrams.map((d) => d.position)) + 1
      const created = await createDiagramStep(last, nextPosition)
      setExpanded(created.id)
      router.refresh()
    } catch (e) {
      setStepError(e instanceof Error ? e.message : 'Failed to create step')
    } finally {
      setCreatingStepFor(null)
    }
  }

  const nextPosition = Math.max(-1, ...diagrams.map((d) => d.position)) + 1

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Diagrams</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map((group) => (
          <div key={group.diagrams[0].id} style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            {group.diagrams.length === 1 ? (
              <button
                type="button"
                onClick={() => setExpanded(group.diagrams[0].id)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <DiagramView diagram={group.diagrams[0]} />
              </button>
            ) : (
              <DiagramStepTabs group={group} />
            )}
            {group.diagrams[0].title && (
              <div style={{ fontSize: 11, color: 'var(--on-mat-muted)', marginTop: 4 }}>{group.diagrams[0].title}</div>
            )}
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {group.diagrams.length > 1 &&
                group.diagrams.map((diagram, i) => (
                  <button
                    key={diagram.id}
                    type="button"
                    onClick={() => setExpanded(diagram.id)}
                    style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: 'var(--on-mat-muted)' }}
                  >
                    Edit step {i + 1}
                  </button>
                ))}
              <Button variant="muted" onClick={() => addStep(group)} disabled={creatingStepFor === group.diagrams[group.diagrams.length - 1].id}>
                + New step
              </Button>
              <Button variant="muted" onClick={() => setPendingDeleteId(group.diagrams[0].id)}>Delete</Button>
            </div>
            {stepError && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>{stepError}</div>}

            {group.diagrams
              .filter((d) => d.id === expanded)
              .map((d) => (
                <div key={d.id} style={{ marginTop: 10 }}>
                  <InlineDiagramEditor
                    drillId={drillId}
                    diagram={d}
                    position={d.position}
                    onSaved={handleSaved}
                    onCancel={() => setExpanded(null)}
                  />
                </div>
              ))}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" onClick={() => setExpanded('new')} fullWidth>
          + New diagram
        </Button>
        {expanded === 'new' && (
          <div style={{ marginTop: 10 }}>
            <InlineDiagramEditor
              drillId={drillId}
              diagram={null}
              position={nextPosition}
              onSaved={handleSaved}
              onCancel={() => setExpanded(null)}
            />
          </div>
        )}
      </div>

      {pendingDeleteId && (
        <DeleteDiagramDialog diagramId={pendingDeleteId} onClose={() => setPendingDeleteId(null)} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Delete the three now-dead routes**

```bash
git rm -r src/app/drills/[id]/diagrams/new src/app/drills/[id]/diagrams/[diagramId]/edit
git rm src/app/drills/[id]/finish/page.tsx
```

- [ ] **Step 3: Confirm nothing else references the deleted routes/component**

Run: `grep -rn "diagrams/new\|diagrams/\[diagramId\]/edit\|drills/\${.*}/finish\|DiagramEditor\|DrillMetadataPanel" src`
Expected: no matches. (The `/drills/[id]/finish` route itself is gone; nothing should still construct a link to it.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors anywhere in the project — this is the task that resolves every "expected" error noted in Tasks 1, 3, and 5.

- [ ] **Step 5: Manual check**

Run: `npm run dev`. On an existing drill's detail page (`/drills/[id]`): click "+ New diagram" — confirm it expands `DiagramCanvas` inline right there (no navigation), draw something, click Save — confirm it collapses and the new diagram now shows in the gallery. Click an existing diagram's thumbnail — confirm it expands inline pre-loaded with its elements; edit and Save; confirm the change persists. Expand one diagram, then click a different diagram (or "+ New diagram") without saving — confirm the first one collapses (only one expanded at a time) and its edits are discarded. Click "+ New step" on a diagram — confirm it opens inline already containing the duplicated elements from the source diagram. Confirm visiting the old routes directly (`/drills/[id]/diagrams/new`, `/drills/[id]/diagrams/<diagramId>/edit`, `/drills/[id]/finish`) now 404s.

- [ ] **Step 6: Commit**

```bash
git add src/components/diagrams/DiagramGallery.tsx
git rm -r src/app/drills/[id]/diagrams/new src/app/drills/[id]/diagrams/[diagramId]/edit 2>/dev/null || true
git rm src/app/drills/[id]/finish/page.tsx 2>/dev/null || true
git commit -m "feat: make diagram add/edit inline on the drill detail page"
```

---

### Task 7: Full end-to-end manual QA

No code changes — a final walkthrough confirming Tasks 1-6 work together, plus a regression pass over the parts of the app that render diagrams read-only.

- [ ] **Step 1: Run the full test suite**

Run: `npm run test`
Expected: all existing `src/lib/*.test.ts` tests still pass (none of them touch the files changed in this plan).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: builds clean, no type errors, no missing-route issues from the deleted pages.

- [ ] **Step 3: Add Drill, diagram-first (no name)**

`/drills/new?library=outfield` → draw on the canvas, leave Name blank, click "Add drill". Confirm: draft named "Untitled drill" created, its diagram contains what was drawn, lands on `/drills/<id>/edit`.

- [ ] **Step 4: Add Drill, text-first (no drawing)**

`/drills/new?library=outfield` → fill Name/Type/Note, leave canvas untouched, click "Add drill". Confirm: draft created, `/drills/<id>` shows an empty diagram gallery (no diagram row created).

- [ ] **Step 5: Existing drill — new diagram, edit, step, delete**

On a drill with at least one diagram: expand "+ New diagram" inline, save it; expand an existing diagram inline, edit and save; use "+ New step" and confirm it opens inline with duplicated elements; delete a diagram via the existing `DeleteDiagramDialog` flow (unaffected by this plan) and confirm it disappears from the gallery.

- [ ] **Step 6: Mobile breakpoint**

Resize to a phone width (or use dev tools device toolbar). Repeat Steps 3 and 5. Confirm: the canvas stays portrait, the tool tabs/icons remain usable (not cramped or overflowing), and the icon set (especially goal/pole) is legible.

- [ ] **Step 7: Read-only diagram rendering still works**

Visit a drill with diagrams and confirm the gallery thumbnails render the dot-grid surface correctly (not broken/blank from the `PitchBackground` → `DotGridBackground` swap). If the app's Session view or print sheet renders diagrams (`DiagramView`/`DiagramStepTabs`, both already updated by Tasks 1 and unchanged by Task 6), spot-check one session that includes a drill with a diagram and confirm it still renders there too.

- [ ] **Step 8: Final commit (if any QA fixes were needed)**

If Steps 1-7 surfaced any fixes, commit them individually with descriptive messages before considering this plan complete. If no fixes were needed, this task requires no commit.
