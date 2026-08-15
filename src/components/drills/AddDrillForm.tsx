'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createDrill } from '@/lib/drills'
import { typeLabel, typesFor } from '@/lib/taxonomy'
import type { DrillInput, DrillType, Library } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'

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

const diagramBoxStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  minHeight: 180,
  background: 'var(--field-bg)',
  border: '1px dashed var(--hairline)',
  borderRadius: 'var(--radius)',
  color: 'var(--ink-45)',
  fontSize: 13,
  fontFamily: 'inherit',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
})

/**
 * Every drill created here is missing the fields a session needs (setup
 * beyond one note, coaching points, etc.), so it always saves as a draft —
 * unlike `DrillForm`, there's no need to compute `missingFields`.
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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveAndGo(destination: (id: string) => string) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const drill = await createDrill(draftInput(library, name, type, note))
      router.push(destination(drill.id))
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

          <Button
            onClick={() => saveAndGo((id) => `/drills/${id}/edit`)}
            disabled={saving || name.trim() === ''}
          >
            {saving ? 'Saving…' : 'Add drill'}
          </Button>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <Field label="Diagram (optional)">
            <button
              type="button"
              onClick={() => saveAndGo((id) => `/drills/${id}/diagrams/new?entry=diagram`)}
              disabled={saving}
              style={diagramBoxStyle(saving)}
            >
              Tap to sketch the pitch layout
            </button>
          </Field>
        </div>
      </div>
    </div>
  )
}
