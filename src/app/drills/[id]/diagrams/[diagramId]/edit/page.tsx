import { notFound } from 'next/navigation'
import { getDrill } from '@/lib/drills-server'
import { getDiagram } from '@/lib/diagrams-server'
import { DiagramEditor } from '@/components/diagrams/DiagramEditor'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

export const dynamic = 'force-dynamic'

export default async function EditDiagramPage({
  params,
}: {
  params: Promise<{ id: string; diagramId: string }>
}) {
  const { id, diagramId } = await params
  const [drill, diagram] = await Promise.all([getDrill(id), getDiagram(diagramId)])
  if (!drill || !diagram || diagram.drill_id !== id) notFound()

  return (
    <main>
      <ScreenHeader title={`Edit diagram · ${drill.name}`} backHref={`/drills/${id}`} backLabel={drill.name} />
      <DiagramEditor drillId={id} position={diagram.position} existing={diagram} drillMeta={null} />
    </main>
  )
}
