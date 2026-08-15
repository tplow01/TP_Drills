'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@/lib/types'
import type { SessionSchedule } from '@/lib/session-groups'
import { formatDayMarker } from '@/lib/dates'
import { SessionRow } from './SessionRow'

function DateSection({
  id,
  label,
  sessions,
  dimmed = false,
  drillCounts,
  plannedMinutes,
}: {
  id?: string
  label: string
  sessions: Session[]
  dimmed?: boolean
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  if (sessions.length === 0) return null
  return (
    <section id={id} style={{ marginBottom: 8, scrollMarginTop: 16 }}>
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

/**
 * The Schedule's default view: today first, then one section per upcoming
 * calendar date (any number of sessions per date, no layout constraint from
 * the grouping), Past collapsed, Unscheduled last. Replaces the old coarse
 * Past/Today/Upcoming/Unscheduled bucket view (spec 2026-08-15).
 */
export function SessionsTimeline({
  schedule,
  drillCounts,
  plannedMinutes,
}: {
  schedule: SessionSchedule
  drillCounts: Record<string, number>
  plannedMinutes: Record<string, number>
}) {
  const [pastOpen, setPastOpen] = useState(false)
  const [scrollTarget, setScrollTarget] = useState<string | null>(null)

  // A month-view tap on a past date lands here as `#date-<that date>` —
  // Past is collapsed by default, so the target section isn't in the DOM
  // yet. Expand it and record the target; the effect below scrolls once
  // it's actually rendered.
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#date-')) return
    const targetDate = hash.slice('#date-'.length)
    // Mount-only: this reads the URL once when the agenda first appears, to
    // reveal and scroll to a date the month view linked to directly.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (schedule.pastGroups.some((g) => g.date === targetDate)) setPastOpen(true)
    setScrollTarget(hash.slice(1))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!scrollTarget) return
    document.getElementById(scrollTarget)?.scrollIntoView({ block: 'start' })
  }, [scrollTarget, pastOpen])

  return (
    <div style={{ padding: '4px 18px 32px' }}>
      {schedule.pastGroups.length > 0 && (
        <section style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setPastOpen((open) => !open)}
            className="lbl"
            style={{
              background: 'none', border: 'none', padding: '16px 4px 2px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {pastOpen ? '▾' : '▸'} Past
          </button>
          {pastOpen && schedule.pastGroups.map((group) => (
            <DateSection
              key={group.date}
              id={`date-${group.date}`}
              label={formatDayMarker(group.date)}
              sessions={group.sessions}
              dimmed
              drillCounts={drillCounts}
              plannedMinutes={plannedMinutes}
            />
          ))}
        </section>
      )}

      {schedule.todayGroup && (
        <DateSection
          id={`date-${schedule.todayGroup.date}`}
          label="Today"
          sessions={schedule.todayGroup.sessions}
          drillCounts={drillCounts}
          plannedMinutes={plannedMinutes}
        />
      )}

      {schedule.upcomingGroups.map((group) => (
        <DateSection
          key={group.date}
          id={`date-${group.date}`}
          label={formatDayMarker(group.date)}
          sessions={group.sessions}
          drillCounts={drillCounts}
          plannedMinutes={plannedMinutes}
        />
      ))}

      <DateSection label="Unscheduled" sessions={schedule.unscheduled} drillCounts={drillCounts} plannedMinutes={plannedMinutes} />
    </div>
  )
}
