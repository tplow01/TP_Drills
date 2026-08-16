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
// equipment: pick a color, drag one marker onto the canvas. Older diagrams
// may still contain the retired 'player-circle'/'player-triangle'/
// 'player-omega' types; those keep rendering correctly (DiagramElements.tsx's
// PlayerEl), they just can't be placed again from this palette.
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
              type="button"
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
              type="button"
              onClick={() => setColor(c)}
              aria-label={c}
              aria-pressed={color === c}
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
