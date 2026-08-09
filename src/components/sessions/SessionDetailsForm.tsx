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
  const [busy, setBusy] = useState(false)

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
    setSaving(true)
    try {
      const patch: Partial<SessionInput> = {
        name: trimmedName,
        date: draft.date === '' ? null : draft.date,
        start_time: draft.start_time === '' ? null : `${draft.start_time}:00`,
        location: draft.location.trim() === '' ? null : draft.location.trim(),
        target_minutes: Math.max(1, Math.round(Number(draft.target_minutes)) || 45),
      }
      await updateSession(session.id, patch)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const ok = window.confirm(
      `Delete "${session.name}"? It has ${drillCount} drill${drillCount === 1 ? '' : 's'}. This can't be undone.`,
    )
    if (!ok) return
    setBusy(true)
    try {
      await deleteSession(session.id)
      router.push('/planner')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate() {
    setBusy(true)
    try {
      // No date, no reflection data — a duplicate is a starting point, not a
      // record of what happened (see lib/sessions.ts duplicateSession).
      const copy = await duplicateSession(session.id, `${session.name} (copy)`)
      router.push(`/planner?session=${copy.id}`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ padding: '18px 18px 28px', maxWidth: 460 }}>
      <div className="mobile-only" style={{ marginBottom: 14 }}>
        <Button variant="ghost" href="/planner">← Back to sessions</Button>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, flex: 1, minWidth: 0 }}>{session.name}</h2>
        <Button variant="secondary" onClick={handleDuplicate} disabled={busy}>
          Duplicate
        </Button>
        <Button variant="secondary" onClick={handleDelete} disabled={busy}>
          Delete
        </Button>
      </div>

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

      {dirty && (
        <div style={{ marginTop: 18 }}>
          <Button onClick={handleSave} disabled={saving || draft.name.trim() === ''} fullWidth>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      )}
    </div>
  )
}
