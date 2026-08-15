import Link from 'next/link'
import { TeamForm } from '@/components/teams/TeamForm'
import { listTeams } from '@/lib/sessions-server'

export const dynamic = 'force-dynamic'

export default async function NewTeamPage() {
  const teams = await listTeams()

  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      <h1 style={{ fontSize: 20, marginTop: 10, marginBottom: 16 }}>New team</h1>
      <TeamForm existingTeams={teams} />
    </main>
  )
}
