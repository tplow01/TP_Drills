'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Diagram, DiagramElement } from '@/lib/types'
import { groupDiagramsIntoSteps } from '@/lib/diagram-steps'
import { createDiagram, createDiagramStep, updateDiagram } from '@/lib/diagrams'
import { DiagramCanvas } from './DiagramCanvas'
import { DiagramView } from './DiagramView'
import { DiagramStepTabs } from './DiagramStepTabs'
import { DeleteDiagramDialog } from './DeleteDiagramDialog'
import { Button } from '@/components/ui/Button'

/**
 * Local save/cancel wrapper around `DiagramCanvas`. Only ever rendered
 * while its target (a specific diagram, or the "new diagram" slot) is the
 * gallery's single expanded item — mounting and unmounting with that
 * condition gives it fresh `title`/`elements` state for free each time a
 * different target is expanded, instead of manually syncing state to a
 * changing prop.
 */
function InlineDiagramEditor({
  drillId,
  diagram,
  position,
  onSaved,
  onCancel,
}: {
  drillId: string
  /** null = creating a brand-new diagram at `position`. */
  diagram: Diagram | null
  position: number
  onSaved: () => void
  onCancel: () => void
}) {
  const [title, setTitle] = useState(diagram?.title ?? '')
  const [elements, setElements] = useState<DiagramElement[]>(diagram?.elements ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      if (diagram) {
        await updateDiagram(diagram.id, { title: title.trim() || null, elements })
      } else {
        await createDiagram({
          drill_id: drillId, position, title: title.trim() || null, pitch_preset: 'full', elements, sequence_group: null,
        })
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <DiagramCanvas
      elements={elements}
      onChange={setElements}
      title={title}
      onTitleChange={setTitle}
      onSave={save}
      onCancel={onCancel}
      saving={saving}
      error={error}
    />
  )
}

/**
 * Adding, editing, and stepping a diagram all happen inline now (inline
 * diagram canvas redesign, 2026-08-15) — no more navigating to
 * `/drills/[id]/diagrams/new` or `/diagrams/[diagramId]/edit`, both deleted.
 * `expanded` holds at most one target at a time — `'new'`, a diagram id, or
 * `null` — so opening a second editor always collapses whichever was open.
 */
export function DiagramGallery({ drillId, diagrams }: { drillId: string; diagrams: Diagram[] }) {
  const router = useRouter()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [creatingStepFor, setCreatingStepFor] = useState<string | null>(null)
  const [stepError, setStepError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | 'new' | null>(null)
  const groups = groupDiagramsIntoSteps(diagrams)

  function handleSaved() {
    setExpanded(null)
    router.refresh()
  }

  async function addStep(group: (typeof groups)[number]) {
    const last = group.diagrams[group.diagrams.length - 1]
    setCreatingStepFor(last.id)
    setStepError(null)
    try {
      const nextPosition = Math.max(-1, ...diagrams.map((d) => d.position)) + 1
      const created = await createDiagramStep(last, nextPosition)
      setExpanded(created.id)
      router.refresh()
    } catch (e) {
      setStepError(e instanceof Error ? e.message : 'Failed to create step')
    } finally {
      setCreatingStepFor(null)
    }
  }

  const nextPosition = Math.max(-1, ...diagrams.map((d) => d.position)) + 1

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Diagrams</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {groups.map((group) => (
          <div key={group.diagrams[0].id} style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 8 }}>
            {group.diagrams.length === 1 ? (
              <button
                type="button"
                onClick={() => setExpanded(group.diagrams[0].id)}
                style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }}
              >
                <DiagramView diagram={group.diagrams[0]} />
              </button>
            ) : (
              <DiagramStepTabs group={group} />
            )}
            {group.diagrams[0].title && (
              <div style={{ fontSize: 11, color: 'var(--on-mat-muted)', marginTop: 4 }}>{group.diagrams[0].title}</div>
            )}
            <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {group.diagrams.length > 1 &&
                group.diagrams.map((diagram, i) => (
                  <button
                    key={diagram.id}
                    type="button"
                    onClick={() => setExpanded(diagram.id)}
                    style={{ all: 'unset', cursor: 'pointer', fontSize: 11, color: 'var(--on-mat-muted)' }}
                  >
                    Edit step {i + 1}
                  </button>
                ))}
              <Button variant="muted" onClick={() => addStep(group)} disabled={creatingStepFor === group.diagrams[group.diagrams.length - 1].id}>
                + New step
              </Button>
              <Button variant="muted" onClick={() => setPendingDeleteId(group.diagrams[0].id)}>Delete</Button>
            </div>
            {stepError && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 8 }}>{stepError}</div>}

            {group.diagrams
              .filter((d) => d.id === expanded)
              .map((d) => (
                <div key={d.id} style={{ marginTop: 10 }}>
                  <InlineDiagramEditor
                    drillId={drillId}
                    diagram={d}
                    position={d.position}
                    onSaved={handleSaved}
                    onCancel={() => setExpanded(null)}
                  />
                </div>
              ))}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <Button variant="secondary" onClick={() => setExpanded('new')} fullWidth>
          + New diagram
        </Button>
        {expanded === 'new' && (
          <div style={{ marginTop: 10 }}>
            <InlineDiagramEditor
              drillId={drillId}
              diagram={null}
              position={nextPosition}
              onSaved={handleSaved}
              onCancel={() => setExpanded(null)}
            />
          </div>
        )}
      </div>

      {pendingDeleteId && (
        <DeleteDiagramDialog diagramId={pendingDeleteId} onClose={() => setPendingDeleteId(null)} />
      )}
    </div>
  )
}
