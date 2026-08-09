import { notFound } from 'next/navigation'
import { DeleteDrillDialog } from '@/components/drills/DeleteDrillDialog'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { backToDrillsHref } from '@/lib/drill-query'
import { countSessionsUsing, getDrill } from '@/lib/drills-server'
import { typeLabel } from '@/lib/taxonomy'

export const dynamic = 'force-dynamic'

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 20 }}>
      <div className="lbl" style={{ marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-70)', whiteSpace: 'pre-wrap' }}>{children}</div>
    </section>
  )
}

export default async function DrillDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ back?: string | string[]; session?: string | string[] }>
}) {
  const { id } = await params
  const { back, session } = await searchParams
  const drill = await getDrill(id)
  if (!drill) notFound()

  const sessionCount = await countSessionsUsing(drill.id)
  // Arriving from a session in the planner builder (spec 7.4/Task 7): the
  // back control must return there, not to the drills list, so a `session`
  // id on the URL takes priority over the list's own `back` state.
  const sessionId = typeof session === 'string' && session !== '' ? session : null
  // The list's filter and sort came in on `back`; hand them straight back so
  // leaving this screen restores the list as it was (spec 7.1).
  const backHref = sessionId ? `/planner?session=${sessionId}` : backToDrillsHref(back)
  const backLabel = sessionId ? 'Session' : 'Drills'

  return (
    <main>
      <ScreenHeader
        title={drill.name}
        backHref={backHref}
        backLabel={backLabel}
        right={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" href={`/drills/${drill.id}/edit`}>Edit</Button>
            <DeleteDrillDialog
              drillId={drill.id}
              drillName={drill.name}
              sessionCount={sessionCount}
              backHref={backHref}
            />
          </div>
        }
      />

      <div style={{ padding: 18, maxWidth: 640 }}>
        {drill.deleted_at && (
          <div style={{ border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 18, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
            Removed from the library. Past sessions keep it.
          </div>
        )}

        {drill.image_url && (
          <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 20, display: 'grid', placeItems: 'center' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={drill.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
          </div>
        )}

        <div style={{ fontSize: 12, color: 'var(--ink-45)', marginBottom: 20 }}>
          {typeLabel(drill.type)}
          {drill.age_band && ` · ${drill.age_band}`}
          {drill.duration_mins !== null && ` · ${drill.duration_mins} min`}
          {drill.players_min !== null &&
            ` · ${drill.players_min}${drill.players_max === null ? '+' : `–${drill.players_max}`} players`}
        </div>

        {drill.suitable_from && <Block label="Suitable from">{drill.suitable_from}</Block>}
        {drill.setup && <Block label="Setup">{drill.setup}</Block>}
        {drill.how_it_works && <Block label="How it works">{drill.how_it_works}</Block>}

        {drill.coaching_points.length > 0 && (
          <Block label="Coaching points">
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {drill.coaching_points.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
            </ul>
          </Block>
        )}

        {drill.progressions && <Block label="Progressions">{drill.progressions}</Block>}

        <Block label="Equipment">
          {drill.goals_needed} goals · {drill.cones_needed} cones ·{' '}
          {drill.bibs_needed ? 'bibs needed' : 'no bibs'}
        </Block>

        {drill.tags.length > 0 && <Block label="Tags">{drill.tags.join(', ')}</Block>}
        {drill.source && <Block label="Source">{drill.source}</Block>}

        {/* Reflection history and add-to-session arrive in Phase 2 with the
            session tables. */}
      </div>
    </main>
  )
}
