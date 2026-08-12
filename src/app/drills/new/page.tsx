import { DrillForm } from '@/components/drills/DrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Button } from '@/components/ui/Button'
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
      <div style={{ padding: '0 18px 4px' }}>
        <Button variant="ghost" href={`/drills/new/diagram?library=${library}`}>
          Start with a diagram instead →
        </Button>
      </div>
      <DrillForm library={library} initial={null} mode={mode} />
    </main>
  )
}
