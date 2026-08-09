'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createDrill, updateDrill } from '@/lib/drills'
import { AGE_BANDS, typeLabel, typesFor } from '@/lib/taxonomy'
import type { Drill, DrillInput, DrillType, Library } from '@/lib/types'
import { fieldLabel, invalidFields, invalidLabel, missingFields } from '@/lib/validation'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TextInput, TextArea } from '@/components/ui/TextInput'
import { PhotoField } from './PhotoField'

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
 * Equipment counts are never negative and never blank — the `min={0}` on a
 * number input is only advisory, so the floor is applied here too.
 */
function count(raw: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

function emptyInput(library: Library): DrillInput {
  return {
    library, name: '', type: typesFor(library)[0], age_band: null,
    suitable_from: null, duration_mins: null, players_min: null, players_max: null,
    goals_needed: 0, cones_needed: 0, bibs_needed: false, image_url: null,
    setup: '', how_it_works: '', coaching_points: [''], progressions: null,
    source: null, tags: [], is_draft: true,
  }
}

export function DrillForm({
  library,
  initial,
  mode,
}: {
  library: Library
  initial: Drill | null
  mode: 'quick' | 'full'
}) {
  const router = useRouter()
  const [full, setFull] = useState(mode === 'full')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [draft, setDraft] = useState<DrillInput>(() => {
    if (!initial) return emptyInput(library)
    const { id: _i, deleted_at: _d, created_at: _c, updated_at: _u, ...rest } = initial
    return { ...rest, coaching_points: rest.coaching_points.length ? rest.coaching_points : [''] }
  })

  const set = <K extends keyof DrillInput>(key: K, value: DrillInput[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const missing = missingFields(draft)
  // A missing field is deferrable — it just keeps the drill a draft. An
  // invalid one is not: the database's positive_numbers / players_range_sane
  // CHECKs apply to drafts too, so saving must be blocked until it is fixed.
  const invalid = invalidFields(draft)

  async function save() {
    if (invalid.length > 0) return
    setSaving(true)
    setError(null)
    try {
      const payload: DrillInput = {
        ...draft,
        // Library is fixed at creation and never changes (spec 5.4).
        library: initial ? initial.library : library,
        coaching_points: draft.coaching_points.map((p) => p.trim()).filter(Boolean),
        // A drill with anything missing stays a draft, whichever button was used.
        is_draft: missing.length > 0,
        age_band: draft.library === 'goalkeeping' ? null : draft.age_band,
        suitable_from: draft.library === 'outfield' ? null : draft.suitable_from,
      }
      const saved = initial ? await updateDrill(initial.id, payload) : await createDrill(payload)
      router.push(`/drills/${saved.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 640 }}>
      <div style={{ marginBottom: 15 }}>
        <Field label="Name">
          <TextInput value={draft.name} onChange={(value) => set('name', value)} placeholder="Four-Goal Rondo" />
        </Field>
      </div>

      <div style={{ marginBottom: 15 }}>
        <Field label="Type">
          <select
            style={selectStyle}
            value={draft.type}
            onChange={(e) => set('type', e.target.value as DrillType)}
          >
            {typesFor(draft.library).map((t) => (
              <option key={t} value={t}>{typeLabel(t)}</option>
            ))}
          </select>
        </Field>
      </div>

      {!full && (
        <>
          <div style={{ marginBottom: 15 }}>
            <Field label="Notes — tidy it up later">
              <TextArea
                minHeight={110}
                value={draft.setup}
                onChange={(value) => set('setup', value)}
                placeholder="Anything you want to remember. This lands in Setup."
              />
            </Field>
          </div>
          <div style={{ marginBottom: 18 }}>
            <Button variant="ghost" onClick={() => setFull(true)}>
              Add the full details now →
            </Button>
          </div>
        </>
      )}

      {full && (
        <>
          {draft.library === 'outfield' ? (
            <div style={{ marginBottom: 15 }}>
              <Field label="Age band">
                <select
                  style={selectStyle}
                  value={draft.age_band ?? ''}
                  onChange={(e) => set('age_band', e.target.value === '' ? null : (e.target.value as Drill['age_band']))}
                >
                  <option value="">Choose…</option>
                  {AGE_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </Field>
            </div>
          ) : (
            <div style={{ marginBottom: 15 }}>
              <Field label="Suitable from (optional)">
                <TextInput
                  value={draft.suitable_from ?? ''}
                  onChange={(value) => set('suitable_from', value || null)}
                  placeholder="e.g. confident divers only"
                />
              </Field>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Duration (mins)">
              <TextInput
                type="number"
                min={1}
                value={draft.duration_mins === null ? '' : String(draft.duration_mins)}
                onChange={(value) => set('duration_mins', value === '' ? null : Number(value))}
              />
            </Field>
            <Field label="Min players">
              <TextInput
                type="number"
                min={1}
                value={draft.players_min === null ? '' : String(draft.players_min)}
                onChange={(value) => set('players_min', value === '' ? null : Number(value))}
              />
            </Field>
            <Field label="Max (blank = any)">
              <TextInput
                type="number"
                min={1}
                value={draft.players_max === null ? '' : String(draft.players_max)}
                onChange={(value) => set('players_max', value === '' ? null : Number(value))}
              />
            </Field>
          </div>

          <div style={{ marginTop: 15, marginBottom: 15 }}>
            <Field label="Setup">
              <TextArea minHeight={80} value={draft.setup} onChange={(value) => set('setup', value)} />
            </Field>
          </div>

          <div style={{ marginBottom: 15 }}>
            <Field label="How it works">
              <TextArea minHeight={80} value={draft.how_it_works} onChange={(value) => set('how_it_works', value)} />
            </Field>
          </div>

          {/* A repeating list, never one text box (spec 7.2). */}
          <div style={{ marginBottom: 15 }}>
            <Field label="Coaching points — at least one">
              <>
                {draft.coaching_points.map((point, i) => (
                  <div key={i} style={{ display: 'flex', gap: 7, marginBottom: 7 }}>
                    <div style={{ flex: 1 }}>
                      <TextInput
                        value={point}
                        placeholder={i === 0 ? 'Scan before receiving' : 'Another point'}
                        onChange={(value) => {
                          const next = [...draft.coaching_points]
                          next[i] = value
                          set('coaching_points', next)
                        }}
                      />
                    </div>
                    {draft.coaching_points.length > 1 && (
                      <Button
                        variant="muted"
                        onClick={() => set('coaching_points', draft.coaching_points.filter((_, j) => j !== i))}
                      >
                        ×
                      </Button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" onClick={() => set('coaching_points', [...draft.coaching_points, ''])}>
                  + Add coaching point
                </Button>
              </>
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Goals">
              <TextInput
                type="number"
                min={0}
                value={String(draft.goals_needed)}
                onChange={(value) => set('goals_needed', count(value))}
              />
            </Field>
            <Field label="Cones">
              <TextInput
                type="number"
                min={0}
                value={String(draft.cones_needed)}
                onChange={(value) => set('cones_needed', count(value))}
              />
            </Field>
            <Field label="Bibs">
              {/* Bibs needed is a live state, so accent is legitimate here
                  (unlike the coaching-point "×"). Box shape stays a plain
                  secondary control; only the label colour carries the state,
                  matching the brief's original cue. */}
              <Button variant="secondary" onClick={() => set('bibs_needed', !draft.bibs_needed)} fullWidth>
                <span style={{ color: draft.bibs_needed ? 'var(--accent)' : 'var(--ink-45)' }}>
                  {draft.bibs_needed ? 'Needed' : 'Not needed'}
                </span>
              </Button>
            </Field>
          </div>

          <div style={{ marginTop: 15, marginBottom: 15 }}>
            <Field label="Progressions (optional)">
              <TextArea
                minHeight={60}
                value={draft.progressions ?? ''}
                onChange={(value) => set('progressions', value || null)}
              />
            </Field>
          </div>

          <div style={{ marginBottom: 15 }}>
            <Field label="Source (optional)">
              <TextInput
                value={draft.source ?? ''}
                onChange={(value) => set('source', value || null)}
                placeholder="Coaching course, Instagram, a colleague…"
              />
            </Field>
          </div>

          <div style={{ marginBottom: 15 }}>
            <Field label="Tags (comma separated)">
              <TextInput
                value={draft.tags.join(', ')}
                onChange={(value) => set('tags', value.split(',').map((t) => t.trim()).filter(Boolean))}
              />
            </Field>
          </div>

          <div style={{ marginBottom: 18 }}>
            <PhotoField value={draft.image_url} onChange={(url) => set('image_url', url)} />
          </div>
        </>
      )}

      {invalid.length > 0 && (
        <div style={{ border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 15 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            Cannot save — not even as a draft. Fix this first:
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--ink-70)' }}>
            {invalid.map((f) => <li key={f}>{invalidLabel(f)}</li>)}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div style={{ border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 15 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            Saves as a draft. Still needed before it can go in a session:
          </div>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--ink-70)' }}>
            {missing.map((f) => <li key={f}>{fieldLabel(f)}</li>)}
          </ul>
        </div>
      )}

      {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>{error}</div>}

      <Button onClick={save} disabled={saving || invalid.length > 0 || draft.name.trim() === ''}>
        {saving ? 'Saving…' : missing.length > 0 ? 'Save draft' : 'Save drill'}
      </Button>
    </div>
  )
}
