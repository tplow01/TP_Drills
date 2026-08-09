'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSession } from '@/lib/sessions'
import { deriveStatus, sortSessionsForPlanner } from '@/lib/session-status'
import type { Library, Session } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Segment } from '@/components/ui/Segment'
import { TextInput } from '@/components/ui/TextInput'
import { SessionRow } from './SessionRow'

/**
 * The coach's local calendar date, computed from the browser clock rather
 * than a UTC timestamp — a session at 17:30 must not read as past because a
 * server elsewhere in the world is already into tomorrow (spec 7.4/7.8).
 */
function todayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Spec 6.2/7.4: "+ New session" is pinned above the list, sessions list
 * below it — unplanned first, then planned, then undated ("Not scheduled"),
 * then past. Selecting a row is a plain navigation to `?session=<id>`, so
 * back/refresh both just work without any client-side selection state here.
 */
export function PlannerSessionList({
  sessions,
  drillCounts,
  selectedId,
}: {
  sessions: Session[]
  drillCounts: Record<string, number>
  selectedId: string | null
}) {
  const router = useRouter()
  // Computed once per mount, not on every render, so the group a session
  // falls into doesn't shift under the coach's finger mid-interaction.
  const today = useMemo(() => todayLocal(), [])

  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [library, setLibrary] = useState<Library>('outfield')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sorted = useMemo(
    () => sortSessionsForPlanner(sessions, drillCounts, today),
    [sessions, drillCounts, today],
  )

  // Index of the first undated session in the sorted list, so the "Not
  // scheduled" heading (spec 11) is inserted exactly once, right before it.
  const firstNoDateIndex = useMemo(
    () => sorted.findIndex((s) => deriveStatus(s, drillCounts[s.id] ?? 0, today) === 'no_date'),
    [sorted, drillCounts, today],
  )

  async function handleCreate() {
    const trimmed = name.trim()
    if (trimmed === '' || saving) return
    setSaving(true)
    setError(null)
    try {
      const created = await createSession({
        team_id: null,
        name: trimmed,
        library,
        date: null,
        start_time: null,
        location: null,
        // 45 matches the database default (0004_sessions.sql) — the client
        // never diverges from the schema's own fallback.
        target_minutes: 45,
        age_band: null,
        session_notes: null,
      })
      setCreating(false)
      setName('')
      setLibrary('outfield')
      router.push(`/planner?session=${created.id}`)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create session')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: '18px 16px 28px' }}>
      {!creating ? (
        <Button fullWidth onClick={() => setCreating(true)}>+ New session</Button>
      ) : (
        <div
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Field label="Name">
            <TextInput
              value={name}
              onChange={setName}
              placeholder="Tuesday U9s"
            />
          </Field>
          <Field label="Library">
            <Segment value={library} onChange={setLibrary} />
          </Field>
          {error && (
            <div style={{ fontSize: 12, color: 'var(--accent)' }}>{error}</div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={handleCreate} disabled={name.trim() === '' || saving} fullWidth>
              {saving ? 'Creating…' : 'Create'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setCreating(false)
                setName('')
                setLibrary('outfield')
                setError(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !creating && (
        <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', marginTop: 20 }}>
          No sessions yet. Start one above.
        </p>
      )}

      <div style={{ marginTop: 14 }}>
        {sorted.map((session, index) => {
          const status = deriveStatus(session, drillCounts[session.id] ?? 0, today)
          const showHeading = index === firstNoDateIndex

          return (
            <div key={session.id}>
              {showHeading && (
                <div className="lbl" style={{ margin: '18px 0 4px' }}>
                  Not scheduled
                </div>
              )}
              <div
                style={{
                  background: selectedId === session.id ? 'var(--card)' : 'transparent',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <SessionRow
                  session={session}
                  status={status}
                  drillCount={drillCounts[session.id] ?? 0}
                  href={`/planner?session=${session.id}`}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
