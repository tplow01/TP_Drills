'use client'

import { effectiveDuration, timingSummary } from '@/lib/session-timing'
import type { SessionDrillWithDrill, SessionWithDrills } from '@/lib/types'
import { Button } from '@/components/ui/Button'

/**
 * Spec 7.4: the only route onto a session's drills is this tray, shown on
 * Drills only when arrived at with `?session=<id>`. A right rail on
 * desktop, a docked bar at the bottom on phone (`.session-tray` in
 * globals.css carries the responsive switch).
 */
export function SessionTray({
  session,
}: {
  session: SessionWithDrills
}) {
  const summary = timingSummary(session.drills, session.target_minutes)

  return (
    <aside className="session-tray" aria-label="Session in progress">
      <div className="session-tray-inner">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <h2 style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.name}
          </h2>
          <Button variant="ghost" href={`/planner?session=${session.id}`}>
            Back to planner →
          </Button>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            background: summary.isOver ? 'var(--accent-tint)' : 'var(--chip-bg)',
            margin: '10px 0',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: summary.isOver ? 'var(--accent)' : 'var(--ink-70)' }}>
            {summary.planned} / {summary.target} min
          </span>
          <span style={{ fontSize: 11, color: summary.isOver ? 'var(--accent)' : 'var(--ink-45)' }}>
            {summary.isOver
              ? `${Math.abs(summary.remaining)} min over`
              : `${summary.remaining} min left`}
          </span>
        </div>

        {session.drills.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--ink-45)' }}>
            No drills yet. Add some from the library below.
          </p>
        ) : (
          <ul className="session-tray-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {session.drills.map((item) => (
              <TrayRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

function TrayRow({ item }: { item: SessionDrillWithDrill }) {
  return (
    <li
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: 12,
        padding: '6px 0',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.drill.name}</span>
      <span style={{ color: 'var(--ink-45)', flexShrink: 0 }}>{effectiveDuration(item)} min</span>
    </li>
  )
}
