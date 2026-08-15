'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSession } from '@/lib/sessions'
import { CalendarConnect } from '../teams/CalendarConnect'
import type { Library, Team } from '@/lib/types'

/**
 * The date/team form is the primary and only step now — the earlier
 * "choose manual vs. calendar-link" fork (`NewSessionChoice`) added a click
 * with no decision value for the common case. Calendar-link connect is
 * still here, just folded in as a collapsed secondary option (spec 2026-08-14
 * IA rebuild, phase 2).
 */
export function ManualSessionForm({
  teams,
  defaultTeamId,
  defaultDate,
}: {
  teams: Team[]
  defaultTeamId: string | null
  defaultDate: string | null
}) {
  const router = useRouter()
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? '')
  const [date, setDate] = useState(defaultDate ?? '')
  const [saving, setSaving] = useState(false)
  const [showCalendarConnect, setShowCalendarConnect] = useState(false)

  const selectedTeam = teams.find((t) => t.id === teamId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTeam) return
    setSaving(true)
    try {
      const session = await createSession({
        team_id: selectedTeam.id,
        name: selectedTeam.name,
        library: selectedTeam.library as Library,
        date: date === '' ? null : date,
        start_time: null,
        location: null,
        target_minutes: 60,
        age_band: selectedTeam.age_band,
        session_notes: null,
        themes: [],
        external_uid: null,
      })
      router.push(`/sessions/${session.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label>
          <div className="lbl" style={{ marginBottom: 4 }}>Team</div>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
          >
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label>
          <div className="lbl" style={{ marginBottom: 4 }}>Date</div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
          />
        </label>
        <button type="submit" disabled={saving || !selectedTeam} className="header-cta" style={{ alignSelf: 'flex-start' }}>
          {saving ? 'Creating…' : 'Create session'}
        </button>
      </form>

      {selectedTeam && (
        <div>
          {showCalendarConnect ? (
            <div className="new-session-option" data-accent="true">
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Paste a calendar link</div>
              <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
                Subscribe to a fixture/training feed for {selectedTeam.name}
              </div>
              <div style={{ marginTop: 10 }}>
                <CalendarConnect team={selectedTeam} />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCalendarConnect(true)}
              className="bd"
              style={{ fontSize: 12, color: 'var(--ink-45)', background: 'none', border: 'none', padding: 0 }}
            >
              Or connect a calendar feed instead →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
