'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Diagram } from '@/lib/types'
import { DiagramView } from './DiagramView'
import { DeleteDiagramDialog } from './DeleteDiagramDialog'
import { Button } from '@/components/ui/Button'

/**
 * Tapping a thumbnail opens the editor directly — nothing is destructive
 * before Save, so no read-only detour is needed first (design doc,
 * 2026-08-10).
 */
export function DiagramGallery({ drillId, diagrams }: { drillId: string; diagrams: Diagram[] }) {
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Diagrams</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {diagrams.map((diagram) => (
          <div key={diagram.id} style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            <Link href={`/drills/${drillId}/diagrams/${diagram.id}/edit`}>
              <DiagramView diagram={diagram} />
            </Link>
            {diagram.title && (
              <div style={{ fontSize: 11, color: 'var(--on-mat-muted)', marginTop: 4 }}>{diagram.title}</div>
            )}
            <div style={{ marginTop: 6 }}>
              <Button variant="muted" onClick={() => setPendingDeleteId(diagram.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" href={`/drills/${drillId}/diagrams/new`} fullWidth>
          + New diagram
        </Button>
      </div>

      {pendingDeleteId && (
        <DeleteDiagramDialog diagramId={pendingDeleteId} onClose={() => setPendingDeleteId(null)} />
      )}
    </div>
  )
}
