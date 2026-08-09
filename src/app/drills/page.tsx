import { Suspense } from 'react'
import { DrillsBrowser } from '@/components/drills/DrillsBrowser'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { listDrills } from '@/lib/drills-server'

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
      {/* Filter and sort state lives in the URL (spec 7.1), so the browser
          reads useSearchParams and needs a Suspense boundary. */}
      <Suspense>
        <DrillsBrowser outfield={outfield} goalkeeping={goalkeeping} />
      </Suspense>
    </main>
  )
}
