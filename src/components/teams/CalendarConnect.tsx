'use client'

import { useState } from 'react'
import { connectCalendar, syncCalendar } from '@/lib/teams'
import type { Team } from '@/lib/types'

export function CalendarConnect({ team }: { team: Team }) {
  const [url, setUrl] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [calendarUrl, setCalendarUrl] = useState(team.calendar_url)
  const [syncedAt, setSyncedAt] = useState(team.calendar_synced_at)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleConnect() {
    if (url.trim() === '') return
    setConnecting(true)
    setError(null)
    try {
      const updated = await connectCalendar(team.id, url.trim())
      setCalendarUrl(updated.calendar_url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setConnecting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setLastResult(null)
    try {
      const { created } = await syncCalendar(team.id)
      setSyncedAt(new Date().toISOString())
      setLastResult(created === 0 ? 'No new sessions' : created === 1 ? '1 new session' : `${created} new sessions`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (calendarUrl === null) {
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
          disabled={connecting || url.trim() === ''}
          className="header-cta"
          style={{ marginTop: 8 }}
        >
          {connecting ? 'Connecting…' : 'Connect'}
        </button>
        {error && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>{error}</div>}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--accent)' }}>● Connected</div>
      <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>
        {syncedAt ? `Last synced ${new Date(syncedAt).toLocaleString()}` : 'Never synced'}
      </div>
      <button
        type="button"
        onClick={handleSync}
        disabled={syncing}
        className="header-cta"
        style={{ marginTop: 8 }}
      >
        {syncing ? 'Syncing…' : 'Sync now'}
      </button>
      {lastResult && <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 6 }}>{lastResult}</div>}
      {error && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>{error}</div>}
    </div>
  )
}
