import type { ReactNode } from 'react'
import type { DrillBrowseState } from '@/lib/drill-query'
import type { Drill } from '@/lib/types'
import { DrillCard } from './DrillCard'

export function DrillGrid({
  drills,
  browseState,
  emptyState,
  onAdd,
  addedIds,
}: {
  drills: Drill[]
  /** Rides along in each card's href so Back returns to this exact list. */
  browseState: DrillBrowseState
  emptyState: ReactNode
  /** Present only when the session tray is up (spec 7.4). */
  onAdd?: (drill: Drill) => void
  addedIds?: ReadonlySet<string>
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
      {drills.map((drill) => (
        <DrillCard
          key={drill.id}
          drill={drill}
          browseState={browseState}
          onAdd={onAdd ? () => onAdd(drill) : undefined}
          added={addedIds?.has(drill.id) ?? false}
        />
      ))}
    </div>
  )
}
