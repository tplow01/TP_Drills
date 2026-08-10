'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteSession, duplicateSession, updateSession } from '@/lib/sessions'
import type { Session, SessionInput } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'

interface Draft {
  name: string
  date: string
  start_time: string
  location: string
  target_minutes: string
}

function draftFrom(session: Session): Draft {
  return {
    name: session.name,
    date: session.date ?? '',
    start_time: session.start_time ? session.start_time.slice(0, 5) : '',
    location: session.location ?? '',
    target_minutes: String(session.target_minutes),
  }
}

/**
 * Name, date, start time, location, target minutes. No team picker — teams
 * are Phase 3. Only name is required (spec 7.4): date, time, location and
 * target minutes are all optional and all editable here, whatever their
 * value was at creation. Nothing here locks once a session's date has
 * passed — a completed session stays fully editable (spec 7.4, 7.8, 11).
 *
 * The caller renders this keyed by `session.id` (see planner/page.tsx), so
 * selecting a different session remounts the form instead of needing an
 * effect to resync local state away from a stale previous session.
 */
export function SessionDetailsForm({
  session,
  drillCount,
}: {
  session: Session
  drillCount: number
}) {
  const router = useRouter()
  const [draft, setDraft] = useState<Draft>(() => draftFrom(session))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [duplicating, setDuplicating] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  const original = draftFrom(session)
  const dirty =
    draft.name !== original.name ||
    draft.date !== original.date ||
    draft.start_time !== original.start_time ||
    draft.location !== original.location ||
    draft.target_minutes !== original.target_minutes

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  async function handleSave() {
    const trimmedName = draft.name.trim()
    if (trimmedName === '' || saving) return

    // Garbage or non-positive input must not silently become 45 — reject it
    // visibly instead, same treatment as SessionBuilder's duration override
    // (finding 3: the two sibling forms must agree on this).
    const parsedMinutes = Number(draft.target_minutes)
    if (!Number.isFinite(parsedMinutes) || !Number.isInteger(parsedMinutes) || parsedMinutes <= 0) {
      setSaveError('Enter a whole number of minutes greater than 0.')
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const patch: Partial<SessionInput> = {
        name: trimmedName,
        date: draft.date === '' ? null : draft.date,
        start_time: draft.start_time === '' ? null : `${draft.start_time}:00`,
        location: draft.location.trim() === '' ? null : draft.location.trim(),
        target_minutes: parsedMinutes,
      }
      await updateSession(session.id, patch)
      router.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteSession(session.id)
      router.push('/planner')
      router.refresh()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete session')
      setDeleting(false)
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    setDuplicateError(null)
    try {
      // No date, no reflection data — a duplicate is a starting point, not a
      // record of what happened (see lib/sessions.ts duplicateSession).
      const copy = await duplicateSession(session.id, `${session.name} (copy)`)
      router.push(`/planner?session=${copy.id}`)
      router.refresh()
    } catch (e) {
      setDuplicateError(e instanceof Error ? e.message : 'Failed to duplicate session')
      setDuplicating(false)
    }
  }

  // Spec 9/11: the confirmation names the consequence, not a generic
  // warning. Same message the old window.confirm carried, now in an
  // in-app dialog matching DeleteDrillDialog's visual treatment (Phase 1)
  // instead of an unstyled native dialog.
  const deleteConsequence = `It has ${drillCount} drill${drillCount === 1 ? '' : 's'}. This can't be undone.`

  return (
    <div style={{ padding: '18px 18px 28px', maxWidth: 460 }}>
      <div className="mobile-only" style={{ marginBottom: 14 }}>
        <Button variant="ghost" href="/planner">← Back to sessions</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, flex: 1, minWidth: 0 }}>{session.name}</h2>
        <Button variant="secondary" onClick={handleDuplicate} disabled={duplicating}>
          {duplicating ? 'Duplicating…' : 'Duplicate'}
        </Button>
        <Button variant="secondary" onClick={() => setConfirmingDelete(true)} disabled={deleting}>
          Delete
        </Button>
      </div>

      {duplicateError && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 14 }}>{duplicateError}</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Name">
          <TextInput value={draft.name} onChange={(v) => set('name', v)} placeholder="Tuesday U9s" />
        </Field>
        <Field label="Date">
          <TextInput type="date" value={draft.date} onChange={(v) => set('date', v)} />
        </Field>
        <Field label="Start time">
          <TextInput type="time" value={draft.start_time} onChange={(v) => set('start_time', v)} />
        </Field>
        <Field label="Location">
          <TextInput
            value={draft.location}
            onChange={(v) => set('location', v)}
            placeholder="Home ground"
          />
        </Field>
        <Field label="Target minutes">
          <TextInput
            type="number"
            min={1}
            value={draft.target_minutes}
            onChange={(v) => set('target_minutes', v)}
          />
        </Field>
      </div>

      {saveError && (
        <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>{saveError}</div>
      )}

      {dirty && (
        <div style={{ marginTop: 18 }}>
          <Button onClick={handleSave} disabled={saving || draft.name.trim() === ''} fullWidth>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}

      {confirmingDelete && (
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
            <h3 style={{ fontSize: 18 }}>Delete {session.name}?</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 10 }}>{deleteConsequence}</p>
            {deleteError && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>{deleteError}</div>
            )}
            <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
              <Button onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setConfirmingDelete(false)
                  setDeleteError(null)
                }}
                disabled={deleting}
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
