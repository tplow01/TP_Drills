'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { StateTag } from '@/components/sessions/StateTag'
import { deriveStatus } from '@/lib/session-status'
import { effectiveDuration, timingSummary } from '@/lib/session-timing'
import type { SessionWithDrills } from '@/lib/types'

/** '14:30:00' -> '2:30pm'. No leading zero, minutes dropped on the hour. */
function formatTime(time: string): string {
  const [hourStr, minuteStr] = time.split(':')
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  const period = hour >= 12 ? 'pm' : 'am'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0 ? `${hour12}${period}` : `${hour12}:${minuteStr}${period}`
}

/** 'YYYY-MM-DD' -> 'Tue 15 Jul', parsed as a plain calendar date. */
function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d)
}

/** Today as 'YYYY-MM-DD' in local time — matches the string-compare status logic. */
function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * The pitchside artefact (spec 4, 7.9). There is no pitchside *mode* — this
 * IS the screen, on every device, and it doubles as the print sheet: one
 * component, one stylesheet with a print block, not a separate print page.
 * Large type, minimal chrome, high contrast. Planning furniture (filters,
 * reordering, secondary actions) belongs on the Planner, not here.
 */
export function SessionView({ session }: { session: SessionWithDrills }) {
  const drillCount = session.drills.length
  const status = deriveStatus(session, drillCount, todayISO())
  const timing = timingSummary(session.drills, session.target_minutes)

  // Tap-to-mark-current. Client state only, reset on reload — this is a
  // pointer for standing pitchside, not a record of anything (spec 3 rules
  // out an in-session timer / automatic advance).
  const [currentId, setCurrentId] = useState<string | null>(null)

  const metaParts = [
    session.date ? formatDate(session.date) : null,
    session.start_time ? formatTime(session.start_time) : null,
    session.location,
  ].filter((part): part is string => Boolean(part))

  return (
    <main className="session-view">
      <div className="no-print">
        <ScreenHeader
          title={session.name}
          backHref="/planner"
          backLabel="Planner"
          right={
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <StateTag status={status} />
              {status === 'reflect' && (
                <Button href={`/sessions/${session.id}/reflect`} variant="secondary">
                  Reflect
                </Button>
              )}
              <Button onClick={() => window.print()} variant="secondary">
                Print
              </Button>
            </div>
          }
        />
      </div>

      <div className="session-view-body">
        <div className="session-view-print-header">
          <h1 style={{ fontSize: 30 }}>{session.name}</h1>
          {metaParts.length > 0 && (
            <p className="bd session-view-meta">{metaParts.join(' · ')}</p>
          )}
          <p className="bd session-view-meta">
            {timing.planned} of {timing.target} min planned
            {timing.isOver ? ' · over target' : ''}
            {' · '}
            {drillCount} drill{drillCount === 1 ? '' : 's'}
          </p>
        </div>

        {/* Print-only: the reflect prompt is chrome on screen (it lives in
            the header there), but a coach printing a sheet gets no header
            actions, so restate it as plain text instead of losing it. */}
        {status === 'reflect' && (
          <p className="print-only bd session-view-meta">This session has not been reflected on yet.</p>
        )}

        {drillCount === 0 ? (
          <p className="bd" style={{ fontSize: 15, color: 'var(--ink-45)', padding: '0 20px' }}>
            No drills in this session yet.
          </p>
        ) : (
          <ol className="session-view-list">
            {session.drills.map((item) => {
              const drill = item.drill
              const removed = drill.deleted_at !== null
              const isCurrent = currentId === item.id
              return (
                <li
                  key={item.id}
                  className="session-view-drill"
                  data-current={isCurrent ? 'true' : 'false'}
                >
                  <button
                    type="button"
                    className="no-print session-view-mark"
                    onClick={() => setCurrentId(isCurrent ? null : item.id)}
                    aria-pressed={isCurrent}
                    aria-label={isCurrent ? `${drill.name} is the current drill, tap to unmark` : `Mark ${drill.name} as the current drill`}
                  >
                    {isCurrent ? '●' : '○'}
                  </button>

                  <div className="session-view-mat">
                    {drill.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={drill.image_url} alt="" className="session-view-mat-img" />
                    ) : (
                      <span className="lbl" style={{ color: 'var(--on-mat-muted)' }}>NO IMAGE</span>
                    )}
                  </div>

                  <div className="session-view-drill-body">
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: 22 }}>{drill.name}</h2>
                      <span className="lbl" style={{ fontSize: 13 }}>{effectiveDuration(item)} min</span>
                    </div>

                    {removed && (
                      <p className="session-view-removed">Removed from the library</p>
                    )}

                    <div className="session-view-section">
                      <p className="lbl">Setup</p>
                      <p className="bd session-view-copy">{drill.setup}</p>
                    </div>

                    {/* Never collapsed here (brief note 1) — this is the entire
                        reason the session exists. */}
                    <div className="session-view-section">
                      <p className="lbl">Coaching points</p>
                      <ul className="session-view-points">
                        {drill.coaching_points.map((point, i) => (
                          <li key={i} className="bd session-view-copy">{point}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </main>
  )
}
