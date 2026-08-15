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
