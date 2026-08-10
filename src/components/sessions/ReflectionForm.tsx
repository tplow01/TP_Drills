'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveReflection } from '@/lib/sessions'
import { TextArea } from '@/components/ui/TextInput'
import { Button } from '@/components/ui/Button'
import type { SessionWithDrills } from '@/lib/types'

const RATINGS = [1, 2, 3, 4, 5] as const

// Generous for a coach's jotting, not a transcript. Enforced client-side via
// TextArea's maxLength so hitting it is visible (a counter appears), not a
// silent truncation on save.
const NOTE_MAX_LENGTH = 2000

interface Draft {
  rating: number | null
  note: string
}

function draftsFrom(session: SessionWithDrills): Record<string, Draft> {
  const drafts: Record<string, Draft> = {}
  for (const item of session.drills) {
    drafts[item.id] = { rating: item.rating, note: item.note ?? '' }
  }
  return drafts
}

/**
 * Post-session reflection (spec 7.8): a rating 1–5 and a note per drill,
 * plus one overall session note. Every field is optional — saving with
 * nothing filled in is the skip path, and it still sets `reflected_at`,
 * which is what clears the Reflect tag (session-status.ts). A completed
 * session's reflection stays fully editable (spec 7.4), so this form reads
 * back whatever was saved before rather than assuming a blank slate.
 */
export function ReflectionForm({ session }: { session: SessionWithDrills }) {
  const router = useRouter()
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => draftsFrom(session))
  const [sessionNotes, setSessionNotes] = useState(session.session_notes ?? '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function setRating(sessionDrillId: string, rating: number | null) {
    setDrafts((d) => ({ ...d, [sessionDrillId]: { ...d[sessionDrillId], rating } }))
  }

  function setNote(sessionDrillId: string, note: string) {
    setDrafts((d) => ({ ...d, [sessionDrillId]: { ...d[sessionDrillId], note } }))
  }

  async function handleSave() {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const entries = session.drills.map((item) => {
        const draft = drafts[item.id]
        const trimmedNote = draft.note.trim()
        return {
          sessionDrillId: item.id,
          rating: draft.rating,
          note: trimmedNote === '' ? null : trimmedNote,
        }
      })
      const trimmedSessionNotes = sessionNotes.trim()
      await saveReflection(session.id, entries, trimmedSessionNotes === '' ? null : trimmedSessionNotes)
      router.push(`/sessions/${session.id}`)
      router.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save reflection')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '18px 18px 40px', maxWidth: 640 }}>
      <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', marginBottom: 22 }}>
        Rate what worked, jot what didn&rsquo;t. Nothing here is required — save it blank and
        this session moves to Done.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {session.drills.map((item) => {
          const draft = drafts[item.id]
          const removed = item.drill.deleted_at !== null
          return (
            <div key={item.id} style={{ borderBottom: '1px solid var(--hairline)', paddingBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <h3 style={{ fontSize: 16 }}>{item.drill.name}</h3>
                {removed && (
                  <span className="lbl" style={{ color: 'var(--accent)' }}>Removed from library</span>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} role="radiogroup" aria-label={`Rating for ${item.drill.name}`}>
                {RATINGS.map((value) => {
                  const selected = draft.rating === value
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setRating(item.id, selected ? null : value)}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        fontSize: 14,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: selected ? 'var(--accent)' : 'var(--field-bg)',
                        color: selected ? 'var(--ground)' : 'var(--ink-45)',
                        border: selected ? 'none' : '1px solid var(--hairline)',
                      }}
                    >
                      {value}
                    </button>
                  )
                })}
              </div>

              <TextArea
                value={draft.note}
                onChange={(v) => setNote(item.id, v)}
                placeholder="What happened with this drill?"
                minHeight={60}
                maxLength={NOTE_MAX_LENGTH}
              />
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 8 }}>
        <p className="lbl" style={{ marginBottom: 6 }}>Session notes</p>
        <TextArea
          value={sessionNotes}
          onChange={setSessionNotes}
          placeholder="Overall, how did the session go?"
          minHeight={90}
          maxLength={NOTE_MAX_LENGTH}
        />
      </div>

      {saveError && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 16 }}>{saveError}</div>
      )}

      <div style={{ marginTop: 20 }}>
        <Button onClick={handleSave} disabled={saving} fullWidth>
          {saving ? 'Saving…' : 'Save reflection'}
        </Button>
      </div>
    </div>
  )
}
