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
 * Spec 6.2/7.4: "+ New session" is pinned above the list, sessions list
 * below it — unplanned first, then planned, then undated ("Not scheduled"),
 * then past. Selecting a row is a plain navigation to `?session=<id>`, so
 * back/refresh both just work without any client-side selection state here.
 *
 * `today` comes from the server-rendering parent (planner/page.tsx) rather
 * than being computed here from the browser clock — a shared source of
 * truth with the Hub, Schedule and reflect route guard so the same session
 * can't show a different state tag depending on which screen rendered it
 * (finding 4).
 */
export function PlannerSessionList({
  sessions,
  drillCounts,
  plannedMinutes,
  selectedId,
  today,
}: {
  sessions: Session[]
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
  selectedId: string | null
  today: string
}) {
  const router = useRouter()

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
                  plannedMinutes={plannedMinutes[session.id] ?? 0}
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
