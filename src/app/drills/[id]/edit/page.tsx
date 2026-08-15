import { notFound } from 'next/navigation'
import { DrillForm } from '@/components/drills/DrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { getDrill } from '@/lib/drills-server'

export const dynamic = 'force-dynamic'

export default async function EditDrillPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const drill = await getDrill(id)
  if (!drill) notFound()

  return (
    <main>
      <ScreenHeader title={`Edit ${drill.name}`} backHref={`/drills/${drill.id}`} backLabel="Back" />
      <DrillForm library={drill.library} initial={drill} />
    </main>
  )
}
