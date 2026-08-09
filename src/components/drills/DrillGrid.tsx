import type { ReactNode } from 'react'
import type { DrillBrowseState } from '@/lib/drill-query'
import type { Drill } from '@/lib/types'
import { DrillCard } from './DrillCard'

export function DrillGrid({
  drills,
  browseState,
  emptyState,
}: {
  drills: Drill[]
  /** Rides along in each card's href so Back returns to this exact list. */
  browseState: DrillBrowseState
  emptyState: ReactNode
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
        <DrillCard key={drill.id} drill={drill} browseState={browseState} />
      ))}
    </div>
  )
}
