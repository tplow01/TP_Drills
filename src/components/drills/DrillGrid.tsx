import type { ReactNode } from 'react'
import type { Drill } from '@/lib/types'
import { DrillCard } from './DrillCard'

export function DrillGrid({
  drills,
  emptyState,
}: {
  drills: Drill[]
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
        <DrillCard key={drill.id} drill={drill} />
      ))}
    </div>
  )
}
