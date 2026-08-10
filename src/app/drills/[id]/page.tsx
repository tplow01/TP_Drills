import { notFound } from 'next/navigation'
import { DeleteDrillDialog } from '@/components/drills/DeleteDrillDialog'
import { AddToSessionAction } from '@/components/drills/AddToSessionAction'
import { DiagramGallery } from '@/components/diagrams/DiagramGallery'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { backToDrillsHref } from '@/lib/drill-query'
import { countSessionsUsing, getDrill } from '@/lib/drills-server'
import { listDrillHistory, listDrillStats } from '@/lib/sessions-server'
import { listDiagramsForDrill } from '@/lib/diagrams-server'
import { formatLongDate } from '@/lib/dates'
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

function PointList({ points }: { points: string[] }) {
  return (
    <ul style={{ margin: 0, paddingLeft: 18 }}>
      {points.map((p, i) => <li key={i} style={{ marginBottom: 4 }}>{p}</li>)}
    </ul>
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

  const [sessionCount, allStats, history, diagrams] = await Promise.all([
    countSessionsUsing(drill.id),
    listDrillStats(),
    listDrillHistory(drill.id),
    listDiagramsForDrill(drill.id),
  ])
  const stats = allStats[drill.id]
  const sessionId = typeof session === 'string' && session !== '' ? session : null
  const backHref = sessionId ? `/planner?session=${sessionId}` : backToDrillsHref(back)
  const backLabel = sessionId ? 'Session' : 'Drills'

  return (
    <main>
      <ScreenHeader
        title={drill.name}
        backHref={backHref}
        backLabel={backLabel}
        right={
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            {sessionId && (
              <AddToSessionAction
                sessionId={sessionId}
                drillId={drill.id}
                drillName={drill.name}
                disabled={drill.is_draft}
              />
            )}
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

      <div className="drill-detail-layout">
        <div className="drill-detail-main">
          {drill.deleted_at && (
            <div style={{ border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)', padding: 12, marginBottom: 18, fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
              Removed from the library. Past sessions keep it.
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
          {drill.setup.length > 0 && <Block label="Setup"><PointList points={drill.setup} /></Block>}
          {drill.how_it_works.length > 0 && <Block label="How it works"><PointList points={drill.how_it_works} /></Block>}
          {drill.coaching_points.length > 0 && <Block label="Coaching points"><PointList points={drill.coaching_points} /></Block>}
          {drill.progressions && <Block label="Progressions">{drill.progressions}</Block>}

          {history.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <div className="lbl" style={{ marginBottom: 7 }}>Reflection history</div>
              {history.map((entry) => (
                <div key={entry.session_id} style={{ borderBottom: '1px solid var(--hairline)', padding: '10px 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{entry.session_name}</span>
                    {entry.rating !== null && (
                      <span style={{ fontSize: 12, color: 'var(--accent)', whiteSpace: 'nowrap' }}>★ {entry.rating}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-45)', marginTop: 2 }}>
                    {formatLongDate(entry.session_date)}
                    {entry.rating === null && ' · not rated'}
                  </div>
                  {entry.note && (
                    <p style={{ fontSize: 12, color: 'var(--ink-70)', marginTop: 6, whiteSpace: 'pre-wrap' }}>{entry.note}</p>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        <div className="drill-detail-sidebar">
          {drill.image_url && (
            <div style={{ background: 'var(--ink)', borderRadius: 'var(--radius-sm)', padding: 10, marginBottom: 20, display: 'grid', placeItems: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={drill.image_url} alt="" style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <DiagramGallery drillId={drill.id} diagrams={diagrams} />
          </div>

          <Block label="Equipment">
            {drill.goals_needed} goals · {drill.cones_needed} cones ·{' '}
            {drill.bibs_needed ? 'bibs needed' : 'no bibs'}
          </Block>

          {drill.tags.length > 0 && <Block label="Tags">{drill.tags.join(', ')}</Block>}
          {drill.source && <Block label="Source">{drill.source}</Block>}

          <Block label="Usage">
            {!stats || stats.times_used === 0
              ? 'Never used'
              : `Used ${stats.times_used} time${stats.times_used === 1 ? '' : 's'}${
                  stats.avg_rating === null ? ' · not yet rated' : ` · avg rating ${stats.avg_rating.toFixed(1)}`
                }`}
          </Block>
        </div>
      </div>
    </main>
  )
}
