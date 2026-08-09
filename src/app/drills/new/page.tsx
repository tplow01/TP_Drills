import { DrillForm } from '@/components/drills/DrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import type { Library } from '@/lib/types'

export default async function NewDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ library?: string; mode?: string }>
}) {
  const params = await searchParams
  const library: Library = params.library === 'goalkeeping' ? 'goalkeeping' : 'outfield'
  const mode = params.mode === 'full' ? 'full' : 'quick'

  return (
    <main>
      <ScreenHeader
        title={library === 'outfield' ? 'New outfield drill' : 'New goalkeeping drill'}
        backHref="/drills"
        backLabel="Drills"
      />
      <DrillForm library={library} initial={null} mode={mode} />
    </main>
  )
}
