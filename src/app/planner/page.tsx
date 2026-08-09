import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { PlannerSessionList } from '@/components/sessions/PlannerSessionList'
import { SessionDetailsForm } from '@/components/sessions/SessionDetailsForm'
import { SessionBuilder } from '@/components/sessions/SessionBuilder'
import { drillCountsBySession, getSession, listSessions } from '@/lib/sessions-server'

// Always fresh: creating, editing or deleting a session must show up
// immediately, and status is derived from today's date on every load.
export const dynamic = 'force-dynamic'

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>
}) {
  const params = await searchParams
  const [sessions, drillCounts] = await Promise.all([
    listSessions(),
    drillCountsBySession(),
  ])

  // getSession (not the plain listSessions row) carries the joined drills
  // the builder needs, ordered by position.
  const selected = params.session ? await getSession(params.session) : null

  return (
    <main>
      {/* No hub yet (Phase 2 Task 11 replaces this front door), so Planner's
          back control points at the other Phase 1/2 screen for now. */}
      <ScreenHeader title="Planner" backHref="/drills" backLabel="Drills" />

      <div className="planner-layout" data-has-selection={selected ? 'true' : 'false'}>
        <div className="planner-list-pane">
          <PlannerSessionList
            sessions={sessions}
            drillCounts={drillCounts}
            selectedId={selected?.id ?? null}
          />
        </div>

        <div className="planner-detail-pane">
          {selected ? (
            <>
              <SessionDetailsForm
                key={selected.id}
                session={selected}
                drillCount={drillCounts[selected.id] ?? 0}
              />
              <SessionBuilder
                key={`${selected.id}-builder`}
                session={selected}
              />
            </>
          ) : (
            <div style={{ padding: '18px 18px 28px' }}>
              <p className="bd" style={{ fontSize: 13, color: 'var(--ink-45)' }}>
                Select a session, or start a new one.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
