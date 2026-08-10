import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { SessionRow } from '@/components/sessions/SessionRow'
import { drillCountsBySession, listSessions } from '@/lib/sessions-server'
import { deriveStatus, sortSessionsForPlanner } from '@/lib/session-status'
import type { Session } from '@/lib/types'
import type { SessionStatus } from '@/lib/session-status'

// Always fresh: the timeline is anchored on today's date, computed fresh on
// every load, same reasoning as the hub and planner.
export const dynamic = 'force-dynamic'

/** Today as 'YYYY-MM-DD' in local time — matches deriveStatus's string compare. */
function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Long-form date for a section header, e.g. "Saturday 8 August". */
function formatHeadlineDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(y, m - 1, d))
}

/**
 * The call to action a tag press should follow — spec's "the tag is the
 * call to action" (criterion 3). `reflect` opens the reflection form,
 * `plan_it` opens the builder, everything else (a session live or already
 * behind) opens the pitchside session view.
 */
function hrefFor(session: Session, status: SessionStatus): string {
  if (status === 'reflect') return `/sessions/${session.id}/reflect`
  if (status === 'plan_it') return `/planner?session=${session.id}`
  return `/sessions/${session.id}`
}

export default async function SchedulePage() {
  const today = todayISO()
  const [sessions, drillCounts] = await Promise.all([listSessions(), drillCountsBySession()])

  const dated = sessions.filter((s) => s.date !== null)
  const undated = sessions.filter((s) => s.date === null)

  // sortSessionsForPlanner groups plan_it/ready/no_date/reflect/done; here we
  // want a straight chronological timeline instead, split at today, so sort
  // dated sessions by date directly and keep undated separate below.
  const past = dated
    .filter((s) => (s.date as string) < today)
    .sort((a, b) => (b.date as string).localeCompare(a.date as string))
  const upcoming = dated
    .filter((s) => (s.date as string) >= today)
    .sort((a, b) => (a.date as string).localeCompare(b.date as string))

  // sortSessionsForPlanner used only to keep undated ordering identical to
  // the planner's own list (unplanned first, then by name) — read-only reuse
  // of an already-reviewed sort, not a re-derivation.
  const undatedSorted = sortSessionsForPlanner(undated, drillCounts, today)

  function rows(list: Session[], dimmed: boolean) {
    return list.map((session) => {
      const status = deriveStatus(session, drillCounts[session.id] ?? 0, today)
      return (
        <SessionRow
          key={session.id}
          session={session}
          status={status}
          drillCount={drillCounts[session.id] ?? 0}
          href={hrefFor(session, status)}
          dimmed={dimmed}
        />
      )
    })
  }

  return (
    <main>
      <ScreenHeader title="Schedule" backHref="/" backLabel="Hub" />

      <div style={{ padding: '4px 18px 32px' }}>
        {past.length > 0 && (
          <section style={{ marginBottom: 8 }}>
            <div className="lbl" style={{ margin: '16px 0 2px', color: 'var(--ink-45)' }}>
              Past
            </div>
            {rows(past, true)}
          </section>
        )}

        {/* The anchor: today's date, always shown even with nothing on
            either side of it, so the timeline reads as one continuous
            season rather than two disconnected lists. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '20px 0',
          }}
        >
          <div style={{ flex: 1, height: 1, background: 'var(--accent-border)' }} />
          <span
            className="lbl"
            style={{ color: 'var(--accent)', whiteSpace: 'nowrap' }}
          >
            Today · {formatHeadlineDate(today)}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--accent-border)' }} />
        </div>

        <section>
          {upcoming.length > 0 ? (
            rows(upcoming, false)
          ) : (
            <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', padding: '8px 4px' }}>
              Nothing upcoming.
            </p>
          )}
        </section>

        {undatedSorted.length > 0 && (
          <section style={{ marginTop: 28 }}>
            <div className="lbl" style={{ margin: '16px 0 2px', color: 'var(--ink-45)' }}>
              Not scheduled
            </div>
            {rows(undatedSorted, false)}
          </section>
        )}

        {sessions.length === 0 && (
          <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)', padding: '8px 4px' }}>
            No sessions yet.
          </p>
        )}
      </div>
    </main>
  )
}
