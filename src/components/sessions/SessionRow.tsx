import Link from 'next/link'
import type { Session } from '@/lib/types'
import type { SessionStatus } from '@/lib/session-status'
import { formatTime } from '@/lib/dates'
import { StateTag } from './StateTag'

/** Short weekday for a 'YYYY-MM-DD' date, parsed as a plain calendar date. */
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
  status,
  drillCount,
  plannedMinutes,
  href,
  dimmed = false,
}: {
  session: Session
  status: SessionStatus
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

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 4px',
        borderBottom: '1px solid var(--hairline)',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <div style={{ width: 40, flexShrink: 0, textAlign: 'center' }}>
        {session.date ? (
          <>
            <div className="hl" style={{ fontSize: 20 }}>
              {dayOf(session.date)}
            </div>
            <div className="lbl">{weekdayOf(session.date)}</div>
          </>
        ) : (
          <div className="hl" style={{ fontSize: 20, color: 'var(--ink-30)' }}>
            —
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontSize: 16,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session.name}
        </h4>
        {metaParts.length > 0 && (
          <div className="bd" style={{ fontSize: 12, color: 'var(--ink-45)', marginTop: 2 }}>
            {metaParts.join(' · ')}
          </div>
        )}
      </div>

      <StateTag status={status} />
    </Link>
  )
}
