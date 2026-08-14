import Link from 'next/link'
import type { Session } from '@/lib/types'
import { formatTime } from '@/lib/dates'

function weekdayOf(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(
    new Date(year, month - 1, day),
  )
}

function dayOf(date: string): string {
  return String(Number(date.split('-')[2]))
}

export function SessionRow({
  session,
  drillCount,
  plannedMinutes,
  href,
  dimmed = false,
}: {
  session: Session
  drillCount: number
  plannedMinutes?: number
  href: string
  dimmed?: boolean
}) {
  const durationLabel =
    plannedMinutes !== undefined
      ? `${plannedMinutes} of ${session.target_minutes} min`
      : `${session.target_minutes} min`

  const metaParts = [
    session.start_time ? formatTime(session.start_time) : null,
    session.location,
    durationLabel,
    `${drillCount} drill${drillCount === 1 ? '' : 's'}`,
  ].filter((part): part is string => Boolean(part))

  const needsPlan = drillCount === 0

  return (
    <Link
      href={href}
      className="session-row"
      style={{ opacity: dimmed ? 0.6 : 1 }}
    >
      <div style={{ width: 40, flexShrink: 0, textAlign: 'center' }}>
        {session.date ? (
          <>
            <div className="hl" style={{ fontSize: 20 }}>{dayOf(session.date)}</div>
            <div className="lbl">{weekdayOf(session.date)}</div>
          </>
        ) : (
          <div className="hl" style={{ fontSize: 20, color: 'var(--ink-30)' }}>—</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.name}
        </h4>
        {metaParts.length > 0 && (
          <div className="bd" style={{ fontSize: 12, color: 'var(--ink-45)', marginTop: 2 }}>
            {metaParts.join(' · ')}
          </div>
        )}
        {needsPlan && (
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginTop: 5 }}>
            Needs a plan
          </div>
        )}
      </div>
    </Link>
  )
}
