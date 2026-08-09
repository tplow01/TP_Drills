import { Suspense } from 'react'
import { DrillsBrowser } from '@/components/drills/DrillsBrowser'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { listDrills } from '@/lib/drills-server'
import { getSession } from '@/lib/sessions-server'

// Always fresh: the library changes whenever the coach adds a drill.
export const dynamic = 'force-dynamic'

export default async function DrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string | string[] }>
}) {
  const { session: sessionParam } = await searchParams
  const sessionId = typeof sessionParam === 'string' && sessionParam !== '' ? sessionParam : null

  const [outfield, goalkeeping, session] = await Promise.all([
    listDrills('outfield'),
    listDrills('goalkeeping'),
    // Spec 7.4: the tray is conditional — only fetched, and only ever
    // rendered, when arriving with ?session=<id>. An unknown or deleted id
    // resolves to null, which DrillsBrowser treats the same as no id at all.
    // getSession throws on a malformed id (e.g. not a UUID — PostgREST
    // errors at the database rather than returning null), so a bad id must
    // not crash the whole library screen; it degrades to "no tray" instead.
    // getSession itself stays throwing — other callers rely on that.
    sessionId ? getSession(sessionId).catch(() => null) : Promise.resolve(null),
  ])

  return (
    <main>
      {/* No backHref: Drills is the Phase 1 front door. */}
      <ScreenHeader title="Drills" />
      {/* Filter and sort state lives in the URL (spec 7.1), so the browser
          reads useSearchParams and needs a Suspense boundary. */}
      <Suspense>
        <DrillsBrowser outfield={outfield} goalkeeping={goalkeeping} session={session} />
      </Suspense>
    </main>
  )
}
