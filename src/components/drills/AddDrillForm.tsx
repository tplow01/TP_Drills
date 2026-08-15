'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createDrill } from '@/lib/drills'
import { createDiagram } from '@/lib/diagrams'
import { typeLabel, typesFor } from '@/lib/taxonomy'
import type { DiagramElement, DrillInput, DrillType, Library } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'
import { DiagramCanvas } from '@/components/diagrams/DiagramCanvas'

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--field-bg)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontFamily: 'inherit',
  fontWeight: 500,
  fontSize: 14,
  color: 'var(--ink)',
}

/**
 * Every drill created here is missing the fields a session needs (setup
 * beyond one note, coaching points, etc.), so it always saves as a draft.
 * Name defaults to "Untitled drill" when left blank — saving with only a
 * drawing and no name is a deliberate, supported path (inline diagram
 * canvas redesign, 2026-08-15): there is only one save action on this
 * screen now, so it can't gate on name the way a separate "start from a
 * diagram" button once did.
 */
function draftInput(library: Library, name: string, type: DrillType, note: string): DrillInput {
  const trimmedNote = note.trim()
  return {
    library,
    name: name.trim() || 'Untitled drill',
    type,
    age_band: null,
    suitable_from: null,
    duration_mins: null,
    players_min: null,
    players_max: null,
    goals_needed: 0,
    cones_needed: 0,
    bibs_needed: false,
    image_url: null,
    setup: trimmedNote ? [trimmedNote] : [],
    how_it_works: [],
    coaching_points: [],
    progressions: null,
    source: null,
    tags: [],
    is_draft: true,
  }
}

export function AddDrillForm({ library }: { library: Library }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState<DrillType>(typesFor(library)[0])
  const [note, setNote] = useState('')
  const [elements, setElements] = useState<DiagramElement[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const drill = await createDrill(draftInput(library, name, type, note))
      if (elements.length > 0) {
        await createDiagram({
          drill_id: drill.id, position: 0, title: null, pitch_preset: 'full', elements, sequence_group: null,
        })
      }
      router.push(`/drills/${drill.id}/edit`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 900 }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div style={{ marginBottom: 15 }}>
            <Field label="Name">
              <TextInput value={name} onChange={setName} placeholder="Four-Goal Rondo" />
            </Field>
          </div>

          <div style={{ marginBottom: 15 }}>
            <Field label="Type">
              <select
                style={selectStyle}
                value={type}
                onChange={(e) => setType(e.target.value as DrillType)}
              >
                {typesFor(library).map((t) => (
                  <option key={t} value={t}>{typeLabel(t)}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginBottom: 18 }}>
            <Field label="Note (optional)">
              <TextInput
                value={note}
                onChange={setNote}
                placeholder="Anything you want to remember. This lands in Setup."
              />
            </Field>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>{error}</div>}

          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Add drill'}
          </Button>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <Field label="Diagram (optional)">
            <DiagramCanvas elements={elements} onChange={setElements} />
          </Field>
        </div>
      </div>
    </div>
  )
}
