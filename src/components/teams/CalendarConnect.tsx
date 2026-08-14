'use client'

import { useState } from 'react'
import { connectCalendar } from '@/lib/teams'
import type { Team } from '@/lib/types'

export function CalendarConnect({ team }: { team: Team }) {
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(team.calendar_url !== null)

  async function handleConnect() {
    if (url.trim() === '') return
    setSaving(true)
    try {
      await connectCalendar(team.id, url.trim())
      setConnected(true)
    } finally {
      setSaving(false)
    }
  }

  if (connected) {
    return <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Connected</div>
  }

  return (
    <div>
      <input
        placeholder="webcal://…"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: '100%', background: 'var(--mat)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink-45)', fontSize: 11 }}
      />
      <button
        type="button"
        onClick={handleConnect}
        disabled={saving || url.trim() === ''}
        className="header-cta"
        style={{ marginTop: 8 }}
      >
        {saving ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  )
}
