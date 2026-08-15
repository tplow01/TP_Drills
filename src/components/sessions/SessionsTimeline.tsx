'use client'

import { useEffect, useState } from 'react'
import type { SessionSchedule } from '@/lib/session-groups'
import { formatDayMarker, formatLongDate } from '@/lib/dates'
import { DateSection } from './DateSection'

/**
 * A team's full schedule: today first, then one section per upcoming
 * calendar date (any number of sessions per date, no layout constraint from
 * the grouping), Past collapsed, Unscheduled last. Used on a team's own
 * page — the main Schedule screen (/sessions) uses Day/Week/Month instead
 * (spec 2026-08-15).
 */
export function SessionsTimeline({
  schedule,
  today,
  drillCounts,
  plannedMinutes,
}: {
  schedule: SessionSchedule
  /** Today's ISO date — always shown as a heading so it's clear what day the agenda is anchored to, even with nothing scheduled today. */
  today: string
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
    // Clear after a successful scroll so later, unrelated Past toggles don't
    // re-trigger this effect and yank the viewport back to the hash target.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScrollTarget(null)
  }, [scrollTarget, pastOpen])

  return (
    <div style={{ padding: '4px 18px 32px' }}>
      {schedule.pastGroups.length > 0 && (
        <section style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setPastOpen((open) => !open)}
            aria-expanded={pastOpen}
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

      <DateSection
        id={schedule.todayGroup ? `date-${schedule.todayGroup.date}` : undefined}
        label={`Today · ${formatLongDate(today)}`}
        sessions={schedule.todayGroup?.sessions ?? []}
        emptyLabel="Nothing planned today."
        drillCounts={drillCounts}
        plannedMinutes={plannedMinutes}
      />

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
