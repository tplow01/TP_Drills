import { AddDrillForm } from '@/components/drills/AddDrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import type { Library } from '@/lib/types'

export default async function NewDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ library?: string }>
}) {
  const params = await searchParams
  const library: Library = params.library === 'goalkeeping' ? 'goalkeeping' : 'outfield'

  return (
    <main>
      <ScreenHeader
        title={library === 'outfield' ? 'Add outfield drill' : 'Add goalkeeping drill'}
        backHref="/drills"
        backLabel="Drills"
      />
      <AddDrillForm library={library} />
    </main>
  )
}
