'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  removeSessionDrill,
  reorderSessionDrills,
  setDurationOverride,
} from '@/lib/sessions'
import { effectiveDuration, timingSummary } from '@/lib/session-timing'
import type { SessionDrillWithDrill, SessionWithDrills } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'

/**
 * The right pane of the planner: the drills inside a session, in order,
 * with their timings (spec 7.4). Adding drills happens on the Drills screen
 * (Task 8's session tray), not here — the empty state and "add drill"
 * affordance below just route there with the session id on the URL.
 */
export function SessionBuilder({
  session,
}: {
  session: SessionWithDrills
}) {
  const router = useRouter()
  const drills = session.drills

  const summary = useMemo(
    () => timingSummary(drills, session.target_minutes),
    [drills, session.target_minutes],
  )

  const [rowError, setRowError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)
  // Local drafts for the duration inputs: typing must not fire a write (and
  // a router.refresh) on every keystroke. Keyed by session_drill id, cleared
  // once the value is committed on blur.
  const [durationDrafts, setDurationDrafts] = useState<Record<string, string>>({})

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= drills.length) return
    const ids = drills.map((d) => d.id)
    const tmp = ids[index]
    ids[index] = ids[target]
    ids[target] = tmp

    setRowError(null)
    setBusyId(drills[index].id)
    try {
      await reorderSessionDrills(session.id, ids)
      router.refresh()
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Failed to reorder drills')
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemove(id: string) {
    setRowError(null)
    setBusyId(id)
    try {
      await removeSessionDrill(id)
      setConfirmRemoveId(null)
      router.refresh()
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Failed to remove drill')
    } finally {
      setBusyId(null)
    }
  }

  async function commitDuration(item: SessionDrillWithDrill) {
    const raw = durationDrafts[item.id]
    if (raw === undefined) return
    setRowError(null)
    const trimmed = raw.trim()

    const clearDraft = () =>
      setDurationDrafts((d) => {
        const { [item.id]: _omit, ...rest } = d
        void _omit
        return rest
      })

    // Blank clears the override, reverting to the drill's own default —
    // never a value that mutates duration_mins itself (spec 7.4).
    if (trimmed === '') {
      if (effectiveDuration(item) === item.drill.duration_mins) {
        clearDraft()
        return
      }
      setBusyId(item.id)
      try {
        await setDurationOverride(item.id, null)
        clearDraft()
        router.refresh()
      } catch (e) {
        setRowError(e instanceof Error ? e.message : 'Failed to update duration')
      } finally {
        setBusyId(null)
      }
      return
    }

    // Garbage or non-positive input (spec: duration_override_positive check
    // requires > 0) must not silently write 0 or clear the override — leave
    // the previous value in place and say why.
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) {
      setRowError('Enter a whole number of minutes greater than 0.')
      return
    }
    const mins = parsed

    if (mins === effectiveDuration(item)) {
      clearDraft()
      return
    }
    setBusyId(item.id)
    try {
      await setDurationOverride(item.id, mins)
      clearDraft()
      router.refresh()
    } catch (e) {
      setRowError(e instanceof Error ? e.message : 'Failed to update duration')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ padding: '18px 18px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h2 style={{ fontSize: 16 }}>Drills</h2>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: 'var(--radius-sm)',
          background: summary.isOver ? 'var(--accent-tint)' : 'var(--chip-bg)',
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: summary.isOver ? 'var(--accent)' : 'var(--ink-70)' }}>
          {summary.planned} / {summary.target} min
        </span>
        <span style={{ fontSize: 12, color: summary.isOver ? 'var(--accent)' : 'var(--ink-45)' }}>
          {summary.isOver
            ? `${Math.abs(summary.remaining)} min over`
            : `${summary.remaining} min left`}
        </span>
      </div>

      {rowError && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>{rowError}</div>
      )}

      {drills.length === 0 ? (
        <div
          style={{
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius)',
            padding: 18,
            marginBottom: 18,
            textAlign: 'center',
          }}
        >
          <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', marginBottom: 12 }}>
            No drills in this session yet.
          </p>
          <Button variant="secondary" href={`/drills?session=${session.id}`}>
            Add from the library
          </Button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {drills.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                opacity: busyId === item.id ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0 || busyId !== null}
                  aria-label="Move up"
                  style={{
                    background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer',
                    color: 'var(--ink-45)', fontSize: 12, padding: 2, opacity: index === 0 ? 0.4 : 1,
                  }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === drills.length - 1 || busyId !== null}
                  aria-label="Move down"
                  style={{
                    background: 'none', border: 'none',
                    cursor: index === drills.length - 1 ? 'not-allowed' : 'pointer',
                    color: 'var(--ink-45)', fontSize: 12, padding: 2,
                    opacity: index === drills.length - 1 ? 0.4 : 1,
                  }}
                >
                  ▼
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={`/drills/${item.drill.id}?session=${session.id}`}
                  style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                >
                  {item.drill.name}
                </Link>
                {item.drill.deleted_at && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
                    Removed from library
                  </div>
                )}
              </div>

              <div style={{ width: 64 }}>
                <TextInput
                  type="number"
                  min={1}
                  value={durationDrafts[item.id] ?? String(effectiveDuration(item))}
                  onChange={(v) => setDurationDrafts((d) => ({ ...d, [item.id]: v }))}
                  onBlur={() => commitDuration(item)}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--ink-45)' }}>min</span>

              <Button
                variant="muted"
                onClick={() => setConfirmRemoveId(item.id)}
                disabled={busyId === item.id}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      {drills.length > 0 && (
        <Button variant="secondary" href={`/drills?session=${session.id}`}>+ Add drill</Button>
      )}

      {confirmRemoveId && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'var(--scrim)',
            display: 'grid', placeItems: 'center', padding: 20, zIndex: 30,
          }}
        >
          <div
            style={{
              background: 'var(--card)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius)', padding: 20, maxWidth: 400,
            }}
          >
            <h3 style={{ fontSize: 18 }}>Remove this drill from the session?</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 10 }}>
              It stays in the library, untouched.
            </p>
            {rowError && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>{rowError}</div>
            )}
            <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
              <Button onClick={() => handleRemove(confirmRemoveId)} disabled={busyId === confirmRemoveId}>
                {busyId === confirmRemoveId ? 'Removing…' : 'Remove'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirmRemoveId(null)
                  setRowError(null)
                }}
                disabled={busyId === confirmRemoveId}
              >
                Keep it
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
