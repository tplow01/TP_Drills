import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession, listDrillStats } from '@/lib/sessions-server'
import { listDrills } from '@/lib/drills-server'
import { SessionThemePicker } from '@/components/sessions/SessionThemePicker'
import { SessionBuilder } from '@/components/sessions/SessionBuilder'
import { formatShortDate, formatTime } from '@/lib/dates'

// Planning view: this is now the default screen for /sessions/[id]. The
// pitchside/print SessionView lives at /sessions/[id]/live.
export const dynamic = 'force-dynamic'

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession(id).catch(() => null)
  if (!session) notFound()

  // Scoped to the session's own library — the inline picker never needs the
  // other library, so there's no reason to fetch it (spec: adding a drill is
  // scoped to the session's library).
  const [libraryDrills, stats] = await Promise.all([
    listDrills(session.library),
    listDrillStats(),
  ])

  const teamLabel = session.team?.name ?? session.name
  const metaParts = [
    session.date ? formatShortDate(session.date) : 'No date',
    session.start_time ? formatTime(session.start_time) : null,
    `target ${session.target_minutes} min`,
  ].filter((p): p is string => Boolean(p))

  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      {' · '}
      <Link href={`/sessions/${session.id}/live`} style={{ fontSize: 13, color: 'var(--ink-45)' }}>Pitchside view</Link>

      <h1 style={{ fontSize: 20, marginTop: 10 }}>
        {session.team ? <Link href={`/teams/${session.team.id}`}>{teamLabel}</Link> : teamLabel}
      </h1>
      <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 4 }}>{metaParts.join(' · ')}</div>

      <div style={{ marginTop: 16 }}>
        <SessionThemePicker sessionId={session.id} library={session.library} initialThemes={session.themes} />
      </div>

      <div style={{ marginTop: 20 }}>
        <SessionBuilder session={session} libraryDrills={libraryDrills} stats={stats} />
      </div>
    </main>
  )
}
