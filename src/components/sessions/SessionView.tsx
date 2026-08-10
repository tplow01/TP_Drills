'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { StateTag } from '@/components/sessions/StateTag'
import { deriveStatus } from '@/lib/session-status'
import { effectiveDuration, timingSummary } from '@/lib/session-timing'
import { formatShortDate, formatTime } from '@/lib/dates'
import { DiagramView } from '@/components/diagrams/DiagramView'
import type { Diagram, SessionWithDrills } from '@/lib/types'

/**
 * The pitchside artefact (spec 4, 7.9). There is no pitchside *mode* — this
 * IS the screen, on every device, and it doubles as the print sheet: one
 * component, one stylesheet with a print block, not a separate print page.
 * Large type, minimal chrome, high contrast. Planning furniture (filters,
 * reordering, secondary actions) belongs on the Planner, not here.
 *
 * `today` comes from the server-rendering parent (sessions/[id]/page.tsx)
 * rather than the browser clock, so status agrees with the Hub, Schedule
 * and Planner near a timezone boundary (finding 4).
 */
export function SessionView({
  session,
  today,
  diagramsByDrillId,
}: {
  session: SessionWithDrills
  today: string
  diagramsByDrillId: Record<string, Diagram[]>
}) {
  const drillCount = session.drills.length
  const status = deriveStatus(session, drillCount, today)
  const timing = timingSummary(session.drills, session.target_minutes)

  // Tap-to-mark-current. Client state only, reset on reload — this is a
  // pointer for standing pitchside, not a record of anything (spec 3 rules
  // out an in-session timer / automatic advance).
  const [currentId, setCurrentId] = useState<string | null>(null)

  const metaParts = [
    session.date ? formatShortDate(session.date) : null,
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
                      <ul className="session-view-points">
                        {drill.setup.map((point, i) => (
                          <li key={i} className="bd session-view-copy">{point}</li>
                        ))}
                      </ul>
                    </div>

                    {(diagramsByDrillId[drill.id] ?? []).length > 0 && (
                      <div className="session-view-section session-view-diagrams">
                        <p className="lbl">Diagrams</p>
                        <div className="session-view-diagrams-list">
                          {(diagramsByDrillId[drill.id] ?? []).map((diagram) => (
                            <DiagramView key={diagram.id} diagram={diagram} maxWidth={220} />
                          ))}
                        </div>
                      </div>
                    )}

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
