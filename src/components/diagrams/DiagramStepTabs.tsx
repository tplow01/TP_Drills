'use client'

import { useState } from 'react'
import type { DiagramStepGroup } from '@/lib/diagram-steps'
import { DiagramView } from './DiagramView'

/** Renders one DiagramStepGroup: a single diagram directly, or a Step 1/Step
    2/... tab strip when the group has more than one (add-drill experience
    design, 2026-08-12). Read-only — used in the drill detail gallery, not
    the editor. */
export function DiagramStepTabs({ group, maxWidth = 260 }: { group: DiagramStepGroup; maxWidth?: number }) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (group.diagrams.length === 1) {
    return <DiagramView diagram={group.diagrams[0]} maxWidth={maxWidth} />
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {group.diagrams.map((diagram, i) => (
          <button
            key={diagram.id}
            onClick={() => setActiveIndex(i)}
            style={{
              padding: '3px 10px', borderRadius: 999, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              background: i === activeIndex ? 'var(--accent)' : 'transparent',
              color: i === activeIndex ? 'var(--ground)' : 'var(--on-mat-muted)',
              border: i === activeIndex ? 'none' : '1px solid var(--hairline)',
            }}
          >
            Step {i + 1}
          </button>
        ))}
      </div>
      <DiagramView diagram={group.diagrams[activeIndex]} maxWidth={maxWidth} />
    </div>
  )
}
