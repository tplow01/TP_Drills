import { DrillsBrowser } from '@/components/drills/DrillsBrowser'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { listDrills } from '@/lib/drills'

// Always fresh: the library changes whenever the coach adds a drill.
export const dynamic = 'force-dynamic'

export default async function DrillsPage() {
  const [outfield, goalkeeping] = await Promise.all([
    listDrills('outfield'),
    listDrills('goalkeeping'),
  ])

  return (
    <main>
      {/* No backHref: Drills is the Phase 1 front door. */}
      <ScreenHeader title="Drills" />
      <DrillsBrowser outfield={outfield} goalkeeping={goalkeeping} />
    </main>
  )
}
