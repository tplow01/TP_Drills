'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Diagram } from '@/lib/types'
import { groupDiagramsIntoSteps } from '@/lib/diagram-steps'
import { createDiagramStep } from '@/lib/diagrams'
import { DiagramView } from './DiagramView'
import { DiagramStepTabs } from './DiagramStepTabs'
import { DeleteDiagramDialog } from './DeleteDiagramDialog'
import { Button } from '@/components/ui/Button'

/**
 * Tapping a thumbnail opens the editor directly — nothing is destructive
 * before Save, so no read-only detour is needed first (design doc,
 * 2026-08-10). Diagrams sharing a sequence_group render as one card with
 * Step 1/Step 2 tabs instead of separate gallery entries (add-drill
 * experience design, 2026-08-12).
 */
export function DiagramGallery({ drillId, diagrams }: { drillId: string; diagrams: Diagram[] }) {
  const router = useRouter()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [creatingStepFor, setCreatingStepFor] = useState<string | null>(null)
  const groups = groupDiagramsIntoSteps(diagrams)

  async function addStep(group: (typeof groups)[number]) {
    const last = group.diagrams[group.diagrams.length - 1]
    setCreatingStepFor(last.id)
    try {
      const created = await createDiagramStep(last, diagrams.length)
      router.push(`/drills/${drillId}/diagrams/${created.id}/edit`)
      router.refresh()
    } catch {
      setCreatingStepFor(null)
    }
  }

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Diagrams</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map((group) => (
          <div key={group.diagrams[0].id} style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            {group.diagrams.length === 1 ? (
              <Link href={`/drills/${drillId}/diagrams/${group.diagrams[0].id}/edit`}>
                <DiagramView diagram={group.diagrams[0]} />
              </Link>
            ) : (
              <DiagramStepTabs group={group} />
            )}
            {group.diagrams[0].title && (
              <div style={{ fontSize: 11, color: 'var(--on-mat-muted)', marginTop: 4 }}>{group.diagrams[0].title}</div>
            )}
            <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
              {group.diagrams.map((diagram, i) => (
                <Link key={diagram.id} href={`/drills/${drillId}/diagrams/${diagram.id}/edit`} style={{ fontSize: 11, color: 'var(--on-mat-muted)' }}>
                  {group.diagrams.length > 1 ? `Edit step ${i + 1}` : 'Edit'}
                </Link>
              ))}
              <Button variant="muted" onClick={() => addStep(group)} disabled={creatingStepFor === group.diagrams[group.diagrams.length - 1].id}>
                + New step
              </Button>
              <Button variant="muted" onClick={() => setPendingDeleteId(group.diagrams[0].id)}>Delete</Button>
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
