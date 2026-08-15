'use client'

import { useState } from 'react'
import { ManualSessionForm } from './ManualSessionForm'
import { CalendarConnect } from '../teams/CalendarConnect'
import type { Team } from '@/lib/types'

export function NewSessionChoice({ teams, defaultTeamId }: { teams: Team[]; defaultTeamId: string | null }) {
  const [mode, setMode] = useState<'choose' | 'manual'>('choose')
  const defaultTeam = defaultTeamId ? teams.find((t) => t.id === defaultTeamId) : undefined

  if (mode === 'manual') {
    return <ManualSessionForm teams={teams} defaultTeamId={defaultTeamId} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <button
        type="button"
        onClick={() => setMode('manual')}
        className="new-session-option"
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Create manually</div>
        <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
          Set team, date, time and target minutes yourself
        </div>
      </button>

      {defaultTeam && (
        <div className="new-session-option" data-accent="true">
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Paste a calendar link</div>
          <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
            Subscribe to a fixture/training feed for {defaultTeam.name}
          </div>
          <div style={{ marginTop: 10 }}>
            <CalendarConnect team={defaultTeam} />
          </div>
        </div>
      )}
    </div>
  )
}
