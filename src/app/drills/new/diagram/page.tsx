import { NewDrillFromDiagramStarter } from './NewDrillFromDiagramStarter'
import type { Library } from '@/lib/types'

/**
 * "Start with a diagram" entry point (add-drill experience design,
 * 2026-08-12): creates a minimal draft drill immediately — drill_diagram
 * rows require an existing drill_id — then hands off to the diagram editor
 * itself. The coach never sees this screen; it's a one-tick redirect.
 *
 * Server component (matching src/app/drills/new/page.tsx's pattern) so
 * `library` comes from the async `searchParams` prop rather than the
 * `useSearchParams()` hook, which requires a Suspense boundary. The actual
 * createDrill+redirect side-effect lives in the small client component
 * below since it needs useRouter.
 */
export default async function NewDrillFromDiagramPage({
  searchParams,
}: {
  searchParams: Promise<{ library?: string }>
}) {
  const params = await searchParams
  const library: Library = params.library === 'goalkeeping' ? 'goalkeeping' : 'outfield'

  return <NewDrillFromDiagramStarter library={library} />
}
