'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSession } from '@/lib/sessions'
import type { Library, Team } from '@/lib/types'

export function ManualSessionForm({ teams, defaultTeamId }: { teams: Team[]; defaultTeamId: string | null }) {
  const router = useRouter()
  const [teamId, setTeamId] = useState(defaultTeamId ?? teams[0]?.id ?? '')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

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
      })
      router.push(`/sessions/${session.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
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
  )
}
