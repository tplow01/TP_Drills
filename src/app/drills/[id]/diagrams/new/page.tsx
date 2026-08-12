import { notFound } from 'next/navigation'
import { getDrill } from '@/lib/drills-server'
import { listDiagramsForDrill } from '@/lib/diagrams-server'
import { DiagramEditor } from '@/components/diagrams/DiagramEditor'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export const dynamic = 'force-dynamic'

export default async function NewDiagramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const drill = await getDrill(id)
  if (!drill) notFound()

  // New diagrams append to the end — no drag-to-reorder in v1, so the
  // current count is the next position.
  const existing = await listDiagramsForDrill(id)

  return (
    <main>
      <ScreenHeader title={`New diagram · ${drill.name}`} backHref={`/drills/${id}`} backLabel={drill.name} />
      <DiagramEditor drillId={id} position={existing.length} existing={null} drillMeta={null} />
    </main>
  )
}
