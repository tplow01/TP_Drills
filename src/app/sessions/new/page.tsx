import Link from 'next/link'
import { listTeams } from '@/lib/sessions-server'
import { NewSessionChoice } from '@/components/sessions/NewSessionChoice'

export const dynamic = 'force-dynamic'

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team } = await searchParams
  const teams = await listTeams()

  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      <h1 style={{ fontSize: 20, marginTop: 10, marginBottom: 16 }}>New session</h1>
      {teams.length === 0 ? (
        <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)' }}>
          <Link href="/teams/new">Create a team</Link> first — a session always belongs to one.
        </p>
      ) : (
        <NewSessionChoice teams={teams} defaultTeamId={typeof team === 'string' ? team : null} />
      )}
    </main>
  )
}
