import Link from 'next/link'
import { drillCountsBySession, listSessions, listSessionsInWindow, plannedMinutesBySession } from '@/lib/sessions-server'
import { listDrills } from '@/lib/drills-server'
import { deriveStatus } from '@/lib/session-status'
import { formatDayMarker, formatLongDate, isoPlusDays, today as todayISO } from '@/lib/dates'
import { SessionRow } from '@/components/sessions/SessionRow'

// Phase 2 front door (spec 6.2/14). Status, counts and the schedule preview
// must reflect right now, not a stale build.
export const dynamic = 'force-dynamic'

// Spec 6.2: "the next few days" — a preview, not the full timeline. A week
// is enough to see what's coming without duplicating the Schedule screen.
const PREVIEW_DAYS = 6

export default async function Home() {
  const today = todayISO()
  const windowEnd = isoPlusDays(today, PREVIEW_DAYS)

  const [upcoming, allSessions, drillCounts, plannedMinutes, outfield, goalkeeping] = await Promise.all([
    listSessionsInWindow(today, windowEnd),
    // Unbounded: the Planner door's count is the app's only "needs
    // attention" surface (spec 6.2, decision to strip a summary block), so
    // it must cover every session still needing a plan, not just the ones
    // inside the preview window above.
    listSessions(),
    drillCountsBySession(),
    // One aggregate query, same shape as drillCountsBySession — not a
    // per-row fetch — so SessionRow can show actual planned minutes rather
    // than the session's target (finding 2).
    plannedMinutesBySession(),
    listDrills('outfield'),
    listDrills('goalkeeping'),
  ])

  const plannerCount = allSessions.filter(
    (s) => deriveStatus(s, drillCounts[s.id] ?? 0, today) === 'plan_it',
  ).length

  // Precomputed outside the render callback: each row's date compared to
  // the previous session's, so the "Today" / weekday marker (spec 6.2)
  // appears once per day rather than being reassigned mid-render.
  const dayMarkers = upcoming.map((session, i) => session.date !== (upcoming[i - 1]?.date ?? null))

  return (
    <main>
      <div style={{ padding: '24px 18px 8px' }}>
        <div className="lbl">Coaching</div>
        <h1 style={{ fontSize: 28, marginTop: 6 }}>{formatLongDate(today)}</h1>
      </div>

      <section style={{ padding: '10px 18px 4px' }}>
        {upcoming.length > 0 ? (
          <div>
            {upcoming.map((session, i) => {
              // Session date is never null here: listSessionsInWindow only
              // returns dated sessions inside the range.
              const date = session.date as string
              const isNewDay = dayMarkers[i]

              return (
                <div key={session.id}>
                  {isNewDay && (
                    <div className="lbl" style={{ margin: '16px 0 2px' }}>
                      {date === today ? 'Today' : formatDayMarker(date)}
                    </div>
                  )}
                  <SessionRow
                    session={session}
                    status={deriveStatus(session, drillCounts[session.id] ?? 0, today)}
                    drillCount={drillCounts[session.id] ?? 0}
                    plannedMinutes={plannedMinutes[session.id] ?? 0}
                    href={`/sessions/${session.id}`}
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', padding: '8px 4px' }}>
            {allSessions.length === 0
              ? 'No sessions yet. Plan one and it lands here.'
              : 'Nothing on in the next few days.'}
          </p>
        )}

        <div style={{ padding: '16px 4px 20px' }}>
          <Link href="/schedule" className="lbl" style={{ color: 'var(--accent)', fontSize: 12 }}>
            Full schedule →
          </Link>
        </div>
      </section>

      <section style={{ display: 'flex', gap: 12, padding: '4px 18px 28px', flexWrap: 'wrap' }}>
        <DoorCard
          href="/drills"
          title="Drills"
          detail={`${outfield.length} outfield · ${goalkeeping.length} goalkeeping`}
        />
        <DoorCard
          href="/planner"
          title="Planner"
          detail={
            plannerCount === 0 ? 'All sessions planned' : `${plannerCount} session${plannerCount === 1 ? '' : 's'} to plan`
          }
          accent={plannerCount > 0}
        />
      </section>
    </main>
  )
}

function DoorCard({
  href,
  title,
  detail,
  accent = false,
}: {
  href: string
  title: string
  detail: string
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      style={{
        flex: '1 1 220px',
        minWidth: 200,
        padding: '18px 16px',
        borderRadius: 'var(--radius)',
        background: 'var(--card)',
        border: accent ? '1.5px solid var(--accent-border)' : '1px solid var(--hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <h3 style={{ fontSize: 20 }}>{title}</h3>
      <span className="bd" style={{ fontSize: 13, color: accent ? 'var(--accent)' : 'var(--ink-45)' }}>
        {detail}
      </span>
      <span className="lbl" style={{ marginTop: 4, color: 'var(--accent)' }}>
        Open →
      </span>
    </Link>
  )
}
