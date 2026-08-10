import { notFound } from 'next/navigation'
import { getSession } from '@/lib/sessions-server'
import { diagramsByDrillId } from '@/lib/diagrams-server'
import { today as todayISO } from '@/lib/dates'
import { SessionView } from '@/components/sessions/SessionView'

// Always fresh: this is read live, pitchside, right before or during a
// session — never served stale.
export const dynamic = 'force-dynamic'

export default async function SessionViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // getSession throws on a malformed id (not a UUID errors at the database
  // rather than returning null). A bad id degrades to 404 rather than
  // crashing the screen — same guard as src/app/drills/page.tsx.
  const session = await getSession(id).catch(() => null)
  if (!session) notFound()

  const diagrams = await diagramsByDrillId(session.drills.map((item) => item.drill_id))

  return <SessionView session={session} today={todayISO()} diagramsByDrillId={diagrams} />
}
