import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/sessions-server'
import { deriveStatus } from '@/lib/session-status'
import { today as todayISO } from '@/lib/dates'
import { ReflectionForm } from '@/components/sessions/ReflectionForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'

// Same freshness rule as the session view — read live, never stale.
export const dynamic = 'force-dynamic'

export default async function ReflectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // getSession throws on a malformed id; degrade to 404 rather than crash,
  // same guard as src/app/sessions/[id]/page.tsx.
  const session = await getSession(id).catch(() => null)
  if (!session) notFound()

  const status = deriveStatus(session, session.drills.length, todayISO())

  // Criterion 5: reflection only exists behind a session that has already
  // happened. `reflect` is offered, and `done` stays editable (spec 7.4) —
  // anything else (plan_it, ready, no_date) means the date hasn't passed
  // and this route has no business being reachable, whatever link got here.
  if (status !== 'reflect' && status !== 'done') {
    redirect(`/sessions/${session.id}`)
  }

  return (
    <main>
      <ScreenHeader title={`Reflect · ${session.name}`} backHref={`/sessions/${session.id}`} backLabel="Session" />
      <ReflectionForm session={session} />
    </main>
  )
}
