import Link from 'next/link'
import { TeamForm } from '@/components/teams/TeamForm'

export default function NewTeamPage() {
  return (
    <main style={{ padding: '16px 18px 32px' }}>
      <Link href="/sessions" style={{ fontSize: 13, color: 'var(--ink-45)' }}>‹ Sessions</Link>
      <h1 style={{ fontSize: 20, marginTop: 10, marginBottom: 16 }}>New team</h1>
      <TeamForm />
    </main>
  )
}
