import Link from 'next/link'
import { sessionsHref } from '@/lib/schedule-href'
import type { ScheduleView } from '@/lib/schedule-href'

/**
 * Day/Week/Month switch. Plain `<Link>`s, not the Library `Segment` component
 * (that one's typed to `Library`) — same pill-tablist visual language.
 */
export function ViewToggle({
  activeView,
  date,
  weekStart,
  yearMonth,
  navMonth,
  selectedTeamId,
}: {
  activeView: ScheduleView
  date: string
  weekStart: string
  yearMonth: string
  navMonth: string
  selectedTeamId: string | null
}) {
  const options: { key: ScheduleView; label: string }[] = [
    { key: 'day', label: 'Day' },
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
  ]
  return (
    <div role="tablist" className="view-toggle">
      {options.map((option) => (
        <Link
          key={option.key}
          href={sessionsHref({ view: option.key, date, weekStart, yearMonth, navMonth, teamId: selectedTeamId })}
          role="tab"
          aria-selected={activeView === option.key}
          className="view-toggle-tab"
          data-active={activeView === option.key ? 'true' : 'false'}
        >
          {option.label}
        </Link>
      ))}
    </div>
  )
}
