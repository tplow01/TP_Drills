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
