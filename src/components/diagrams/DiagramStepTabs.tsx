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
      {/* Interactive tab strip + the active diagram: screen-only. Printing
          drops everything but whichever step happened to be active in the
          browser, so it's hidden from the print sheet in favor of the
          stacked print-only render below (review finding 3). */}
      <div className="no-print">
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

      {/* Print-only: every step, stacked, so a multi-step drill doesn't lose
          steps on the printed page. */}
      <div className="print-only">
        {group.diagrams.map((diagram, i) => (
          <div key={diagram.id} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 4 }}>Step {i + 1}</div>
            <DiagramView diagram={diagram} maxWidth={maxWidth} />
          </div>
        ))}
      </div>
    </div>
  )
}
