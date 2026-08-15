import Link from 'next/link'

function href(view: 'month' | 'agenda', yearMonth: string, teamId: string | null): string {
  const params = new URLSearchParams({ view })
  if (view === 'month') params.set('month', yearMonth)
  if (teamId) params.set('team', teamId)
  return `/sessions?${params.toString()}`
}

/**
 * Month/Agenda switch. Plain `<Link>`s, not the Library `Segment` component
 * (that one's typed to `Library`) — same pill-tablist visual language.
 */
export function ViewToggle({
  activeView,
  yearMonth,
  selectedTeamId,
}: {
  activeView: 'month' | 'agenda'
  yearMonth: string
  selectedTeamId: string | null
}) {
  const options: { key: 'month' | 'agenda'; label: string }[] = [
    { key: 'agenda', label: 'Agenda' },
    { key: 'month', label: 'Month' },
  ]
  return (
    <div role="tablist" className="view-toggle">
      {options.map((option) => (
        <Link
          key={option.key}
          href={href(option.key, yearMonth, selectedTeamId)}
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
