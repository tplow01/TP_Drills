import type { Session } from '@/lib/types'
import type { SessionGroups } from '@/lib/session-groups'
import { SessionRow } from './SessionRow'

function Section({ label, sessions, dimmed = false, drillCounts, plannedMinutes }: {
  label: string
  sessions: Session[]
  dimmed?: boolean
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  if (sessions.length === 0) return null
  return (
    <section style={{ marginBottom: 8 }}>
      <div className="lbl" style={{ margin: '16px 4px 2px' }}>{label}</div>
      {sessions.map((session) => (
        <SessionRow
          key={session.id}
          session={session}
          drillCount={drillCounts[session.id] ?? 0}
          plannedMinutes={plannedMinutes[session.id]}
          href={`/sessions/${session.id}`}
          dimmed={dimmed}
        />
      ))}
    </section>
  )
}

export function SessionsTimeline({
  groups,
  drillCounts,
  plannedMinutes,
}: {
  groups: SessionGroups
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  return (
    <div style={{ padding: '4px 18px 32px' }}>
      <Section label="Past" sessions={groups.past} dimmed drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
      <Section label="Today" sessions={groups.today} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
      <Section label="Upcoming" sessions={groups.upcoming} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
      <Section label="Unscheduled" sessions={groups.unscheduled} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </div>
  )
}
