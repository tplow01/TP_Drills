// src/components/diagrams/DiagramView.tsx
import { PITCH_DIMENSIONS, PitchBackground } from './PitchBackground'
import { DiagramElements } from './DiagramElements'
import type { Diagram } from '@/lib/types'

/** Read-only render of a diagram — no pointer handlers. Used in the drill detail gallery and the pitchside Session view/print sheet. */
export function DiagramView({ diagram, maxWidth = 260 }: { diagram: Diagram; maxWidth?: number }) {
  const { width, height } = PITCH_DIMENSIONS[diagram.pitch_preset]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth, display: 'block' }}>
      <PitchBackground preset={diagram.pitch_preset} />
      <DiagramElements elements={diagram.elements} />
    </svg>
  )
}
