import type { Session } from '@/lib/types'
import { SessionRow } from './SessionRow'

/** One date's worth of session rows under a label — shared by Day, Week and the Agenda views. */
export function DateSection({
  id,
  label,
  sessions,
  dimmed = false,
  emptyLabel,
  drillCounts,
  plannedMinutes,
  teamColors,
}: {
  id?: string
  label: string
  sessions: Session[]
  dimmed?: boolean
  /** Shown instead of the section when there are no sessions — omit to render nothing (the collapsing-away behavior the old Agenda buckets used). */
  emptyLabel?: string
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
  /** From `teamColorMap` — omit for contexts with no team coloring (e.g. a single team's own page). */
  teamColors?: Map<string, string>
}) {
  if (sessions.length === 0 && !emptyLabel) return null
  return (
    <section id={id} style={{ marginBottom: 8, scrollMarginTop: 16 }}>
      <div className="lbl" style={{ margin: '16px 4px 2px' }}>{label}</div>
      {sessions.length === 0 ? (
        <div className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', padding: '4px 4px 8px' }}>
          {emptyLabel}
        </div>
      ) : (
        sessions.map((session) => (
          <SessionRow
            key={session.id}
            session={session}
            drillCount={drillCounts[session.id] ?? 0}
            plannedMinutes={plannedMinutes[session.id]}
            href={`/sessions/${session.id}`}
            dimmed={dimmed}
            color={session.team_id ? teamColors?.get(session.team_id) : undefined}
          />
        ))
      )}
    </section>
  )
}
