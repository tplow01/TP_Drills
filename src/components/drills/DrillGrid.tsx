import type { ReactNode } from 'react'
import type { DrillBrowseState } from '@/lib/drill-query'
import type { Drill, DrillStats } from '@/lib/types'
import { DrillCard } from './DrillCard'

export function DrillGrid({
  drills,
  browseState,
  emptyState,
  onAdd,
  addedDrillIds,
  pendingId,
  stats,
}: {
  drills: Drill[]
  /** Rides along in each card's href so Back returns to this exact list. */
  browseState: DrillBrowseState
  emptyState: ReactNode
  /** Present only when the session tray is up (spec 7.4). */
  onAdd?: (drill: Drill) => void
  /** Ordered: index + 1 is the drill's position badge. */
  addedDrillIds?: readonly string[]
  /** The drill id whose add request is currently in flight, if any. */
  pendingId?: string | null
  /** Derived stats from the drill_stats view, keyed by drill id (Task 12). */
  stats?: Record<string, DrillStats>
}) {
  if (drills.length === 0) return <>{emptyState}</>
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 10,
      }}
    >
      {drills.map((drill) => {
        const position = addedDrillIds ? addedDrillIds.indexOf(drill.id) : -1
        return (
          <DrillCard
            key={drill.id}
            drill={drill}
            browseState={browseState}
            onAdd={onAdd ? () => onAdd(drill) : undefined}
            added={position === -1 ? false : position + 1}
            pending={pendingId === drill.id}
            stats={stats?.[drill.id]}
          />
        )
      })}
    </div>
  )
}
