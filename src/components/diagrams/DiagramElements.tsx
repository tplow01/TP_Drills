// src/components/diagrams/DiagramElements.tsx
'use client'

import type { DiagramElement } from '@/lib/types'
import { elementColorHex, normalizeRect, wavyPath } from '@/lib/diagram-elements'
import { EquipmentIcon } from './EquipmentIcon'

const RADIUS: Record<string, number> = {
  circle: 14,
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
      <rect x={0} y={0} width={24} height={24} fill="transparent" />
      <EquipmentIcon type={el.type} />
    </g>
  )
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

// 3.5 (up from 2) so arrows read clearly at a glance on the pitchside sheet
// (diagram editor revamp, 2026-08-13) — the arrowhead marker in DiagramElements'
// <defs> block is enlarged to match.
const ARROW_STROKE_WIDTH = 3.5

function ArrowEl({ el }: { el: DiagramElement }) {
  const color = elementColorHex(el.color)
  const x2 = el.x2 ?? el.x
  const y2 = el.y2 ?? el.y
  const markerId = `arrowhead-${el.id}`
  if (el.type === 'arrow-wavy') {
    return <path d={wavyPath(el.x, el.y, x2, y2)} fill="none" stroke={color} strokeWidth={ARROW_STROKE_WIDTH} markerEnd={`url(#${markerId})`} />
  }
  return (
    <line
      x1={el.x} y1={el.y} x2={x2} y2={y2}
      stroke={color}
      strokeWidth={ARROW_STROKE_WIDTH}
      strokeDasharray={el.type === 'arrow-dashed' ? '6 5' : undefined}
      markerEnd={el.type !== 'line-solid' ? `url(#${markerId})` : undefined}
    />
  )
}

function grabPoint(el: DiagramElement): { cx: number; cy: number } {
  if (el.x2 === undefined || el.y2 === undefined) return { cx: el.x, cy: el.y }
  return { cx: (el.x + el.x2) / 2, cy: (el.y + el.y2) / 2 }
}

/**
 * Renders one diagram's elements as SVG. Shared by every place a diagram
 * shows up — read-only (`DiagramView`) and the editable canvas
 * (`DiagramEditor`) — so the exact same markup that gets saved is what gets
 * displayed everywhere. `selectedId`/`draggingId`/`onPointerDownElement` are
 * only passed by the editor; a read-only render omits them.
 */
export function DiagramElements({
  elements,
  selectedId,
  draggingId,
  onPointerDownElement,
  onPointerDownHandle,
}: {
  elements: DiagramElement[]
  selectedId?: string | null
  draggingId?: string | null
  onPointerDownElement?: (id: string, e: React.PointerEvent) => void
  /** Arrow-endpoint resize handles — editable context only (diagram editor
      revamp, 2026-08-13). Rendered for the selected arrow when provided;
      never passed by the read-only DiagramView. */
  onPointerDownHandle?: (id: string, endpoint: 'start' | 'end', e: React.PointerEvent) => void
}) {
  return (
    <>
      <defs>
        {elements
          .filter((el) => el.kind === 'arrow')
          .map((el) => (
            <marker key={el.id} id={`arrowhead-${el.id}`} markerWidth={14} markerHeight={14} refX={11} refY={7} orient="auto">
              <path d="M0,0 L14,7 L0,14 z" fill={elementColorHex(el.color)} />
            </marker>
          ))}
      </defs>
      {elements.map((el) => {
        const isDragging = draggingId === el.id
        const { cx, cy } = grabPoint(el)
        const showResizeHandles =
          onPointerDownHandle && el.kind === 'arrow' && el.id === selectedId && el.x2 !== undefined && el.y2 !== undefined
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
            {onPointerDownElement && <circle cx={cx} cy={cy} r={18} fill="transparent" />}
            {el.kind === 'shape' && <ShapeEl el={el} />}
            {el.kind === 'equipment' && <EquipmentEl el={el} />}
            {el.kind === 'player' && <PlayerEl el={el} />}
            {el.kind === 'arrow' && <ArrowEl el={el} />}
            {selectedId === el.id && (
              <circle cx={el.x} cy={el.y} r={22} fill="none" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="4 3" />
            )}
            {showResizeHandles && (
              <>
                <circle
                  cx={el.x}
                  cy={el.y}
                  r={7}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onPointerDownHandle(el.id, 'start', e)
                  }}
                />
                <circle
                  cx={el.x2}
                  cy={el.y2}
                  r={7}
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth={2}
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => {
                    e.stopPropagation()
                    onPointerDownHandle(el.id, 'end', e)
                  }}
                />
              </>
            )}
          </g>
        )
      })}
    </>
  )
}
