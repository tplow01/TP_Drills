import { notFound } from 'next/navigation'
import { getDrill } from '@/lib/drills-server'
import { DrillForm } from '@/components/drills/DrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export const dynamic = 'force-dynamic'

/**
 * Reached after saving a diagram-first drill's first diagram (add-drill
 * experience design, 2026-08-12) — the drill already exists with taxonomy
 * fields set from the diagram editor's metadata panel; this screen fills in
 * title/setup/how-it-works/coaching points, same form as editing any drill.
 */
export default async function FinishDrillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const drill = await getDrill(id)
  if (!drill) notFound()

  return (
    <main>
      <ScreenHeader title={`Finish · ${drill.name}`} backHref={`/drills/${id}`} backLabel={drill.name} />
      <DrillForm library={drill.library} initial={drill} mode="full" />
    </main>
  )
}
