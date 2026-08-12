// src/components/diagrams/DiagramEditor.tsx
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDiagram, updateDiagram } from '@/lib/diagrams'
import { PITCH_DIMENSIONS, PitchBackground } from './PitchBackground'
import { DiagramElements } from './DiagramElements'
import { EquipmentIcon } from './EquipmentIcon'
import { clamp, elementColorHex, normalizeRect } from '@/lib/diagram-elements'
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
  ['Shapes', 'Click + drag', 'shape', SHAPE_TOOLS],
  ['Equipment', 'Drag onto pitch', 'equipment', EQUIPMENT_TOOLS],
  ['Players', 'Drag onto pitch', 'player', PLAYER_TOOLS],
  ['Arrows + lines', 'Click + drag', 'arrow', ARROW_TOOLS],
] as const

/** Small 24x24 preview icon per tool type, dark-on-white so it reads on the light palette cards — the tactile "icon button" look the tactics-board direction asked for. */
function ToolIcon({ type }: { type: string }) {
  const ink = '#344054'
  switch (type) {
    case 'square':
      return <rect x={5} y={5} width={14} height={14} rx={2} fill="none" stroke={ink} strokeWidth={2} />
    case 'circle':
      return <circle cx={12} cy={12} r={7} fill="none" stroke={ink} strokeWidth={2} />
    case 'cone':
    case 'ball':
    case 'mannequin':
    case 'goal-small':
    case 'ladder':
    case 'pole':
    case 'wall':
      return <EquipmentIcon type={type} />
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
    case 'arrow-solid':
      return (
        <g stroke={ink} strokeWidth={2.5}>
          <line x1={4} y1={20} x2={18} y2={6} />
          <polygon points="18,4 22,6 18,10" fill={ink} stroke="none" />
        </g>
      )
    case 'arrow-dashed':
      return (
        <g stroke={ink} strokeWidth={2.5}>
          <line x1={4} y1={20} x2={18} y2={6} strokeDasharray="4 3" />
          <polygon points="18,4 22,6 18,10" fill={ink} stroke="none" />
        </g>
      )
    case 'arrow-wavy':
      return (
        <g stroke={ink} strokeWidth={2.5} fill="none">
          <path d="M4,20 Q9,12 12,14 Q15,16 18,6" />
          <polygon points="18,4 22,6 18,10" fill={ink} stroke="none" />
        </g>
      )
    case 'line-solid':
      return <line x1={4} y1={20} x2={20} y2={4} stroke={ink} strokeWidth={2.5} />
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
        draft.kind === 'shape' && draft.x2 !== undefined && draft.y2 !== undefined
          ? normalizeRect(draft.x, draft.y, draft.x2, draft.y2)
          : { x: draft.x, y: draft.y, x2: draft.x2, y2: draft.y2 }
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
        await createDiagram({ drill_id: drillId, position, title: title.trim() || null, pitch_preset: preset, elements, sequence_group: null })
      }
      router.push(`/drills/${drillId}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  if (!preset) {
    const presetOptions: { value: PitchPreset; label: string; sub: string }[] = [
      { value: 'full', label: 'Full pitch', sub: 'Both goals, halfway line, centre circle' },
      { value: 'half', label: 'Half pitch', sub: 'One goal, no halfway line' },
      { value: 'grid', label: 'Grid, no markings', sub: 'Plain grid — draw your own lines' },
    ]
    return (
      <div style={{ background: '#f4f5f7', minHeight: '100dvh', padding: '40px 24px' }}>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#667085', marginBottom: 14 }}>
            Choose a background
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {presetOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPreset(opt.value)}
                style={{
                  textAlign: 'left', padding: '16px 18px', borderRadius: 14, cursor: 'pointer',
                  background: '#ffffff', border: '1px solid #e4e7ec',
                  boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>{opt.label}</div>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 3 }}>{opt.sub}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const { width, height } = PITCH_DIMENSIONS[preset]
  const previewElements = draft ? [...elements, draft] : elements
  const cardStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #e4e7ec', borderRadius: 14,
    boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: '#f4f5f7' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', ...cardStyle, borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled diagram"
          style={{ flex: 1, background: '#f9fafb', border: '1px solid #e4e7ec', borderRadius: 10, padding: '10px 14px', color: '#101828', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}
        />
        {selectedId && (
          <button
            onClick={deleteSelected}
            style={{ padding: '10px 16px', borderRadius: 10, cursor: 'pointer', background: '#fef3f2', border: '1px solid #fecdca', color: '#b42318', fontWeight: 700, fontSize: 13 }}
          >
            Delete element
          </button>
        )}
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '10px 20px', borderRadius: 10, cursor: saving ? 'default' : 'pointer',
            background: '#16a34a', border: 'none', color: '#ffffff', fontWeight: 700, fontSize: 13,
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {error && <div style={{ padding: '10px 18px', fontSize: 12, fontWeight: 600, color: '#b42318', background: '#fef3f2' }}>{error}</div>}

      <div style={{ display: 'flex', flex: 1, minHeight: 0, gap: 16, padding: 16 }}>
        <div style={{ width: 240, flex: 'none', overflowY: 'auto', padding: 16, ...cardStyle }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#667085', marginBottom: 10 }}>
            Color
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {PALETTE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                style={{
                  width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
                  border: color === c ? '3px solid #101828' : '1px solid #e4e7ec',
                  boxShadow: color === c ? '0 0 0 2px #ffffff inset' : 'none',
                  background: elementColorHex(c),
                }}
              />
            ))}
          </div>

          {TOOL_GROUPS.map(([heading, sub, kind, tools]) => (
            <div key={kind} style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#101828' }}>{heading}</div>
              <div style={{ fontSize: 10, color: '#98a2b3', marginBottom: 8 }}>{sub}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {tools.map((tool) => {
                  const isArmed = armed?.kind === kind && armed.type === tool.type
                  return (
                    <button
                      key={tool.type}
                      onPointerDown={(e) => handlePaletteDown(kind, tool.type, e)}
                      onPointerMove={handlePaletteMove}
                      onPointerUp={handlePaletteUp}
                      title={tool.label}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                        padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                        border: isArmed ? '2px solid #16a34a' : '1px solid #e4e7ec',
                        background: isArmed ? '#f0fdf4' : '#f9fafb',
                      }}
                    >
                      <svg width={22} height={22} viewBox="0 0 24 24"><ToolIcon type={tool.type} /></svg>
                      <span style={{ fontSize: 9, fontWeight: 600, color: '#475467', lineHeight: 1.1 }}>{tool.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}

          <button
            onClick={() => setElements([])}
            style={{ width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer', background: 'none', border: '1px solid #fecdca', color: '#b42318', fontWeight: 700, fontSize: 12 }}
          >
            Clear all
          </button>
        </div>

        <div style={{ flex: 1, display: 'grid', placeItems: 'center', ...cardStyle, padding: 16 }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: '100%', maxWidth: width, touchAction: 'none' }}
            onPointerDown={handleCanvasDown}
            onPointerMove={handleCanvasMove}
            onPointerUp={handleCanvasUp}
          >
            <PitchBackground preset={preset} />
            <DiagramElements
              elements={previewElements}
              selectedId={selectedId}
              draggingId={dragFrom?.el.id ?? null}
              onPointerDownElement={handleElementDown}
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
