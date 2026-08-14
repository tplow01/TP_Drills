import Link from 'next/link'
import { drillHref } from '@/lib/drill-query'
import type { DrillBrowseState } from '@/lib/drill-query'
import { typeLabel } from '@/lib/taxonomy'
import type { Drill, DrillStats } from '@/lib/types'

function playersLabel(drill: Drill): string {
  if (drill.players_min === null) return '— players'
  return drill.players_max === null
    ? `${drill.players_min}+ players`
    : `${drill.players_min}–${drill.players_max} players`
}

export function DrillCard({
  drill,
  browseState,
  onAdd,
  added = false,
  pending = false,
  stats,
}: {
  drill: Drill
  browseState: DrillBrowseState
  /**
   * Present only when the session tray is up (spec 7.4). Its absence is
   * what keeps the `+` off every card on an ordinary visit to /drills.
   */
  onAdd?: () => void
  added?: number | false
  /** True while this drill's add request is in flight — a transient state,
   * not an achievement, so it must not read as accent-orange like `added`. */
  pending?: boolean
  /** Derived from the drill_stats view, never a stored column (Task 12). */
  stats?: DrillStats
}) {
  // A draft cannot be added to a session (spec 7.2). In practice drafts
  // never reach this component — DrillsBrowser pins them above the grid,
  // outside the addable list — but the card guards it directly too, so the
  // rule holds even if that ever changes.
  const showAdd = onAdd !== undefined && !drill.is_draft

  return (
    <div style={{ position: 'relative' }}>
      <Link
        // Carries the list's filter and sort, so Back on the detail screen
        // returns to the list as it was left (spec 7.1).
        href={drillHref(drill.id, browseState)}
        style={{
          display: 'block',
          background: 'var(--card)',
          border: `1px solid ${drill.is_draft ? 'var(--accent-border)' : 'var(--hairline)'}`,
          borderRadius: 'var(--radius)',
          padding: 12,
        }}
      >
      <div
        style={{
          background: 'var(--mat)',
          borderRadius: 'var(--radius-sm)',
          height: 120,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          padding: 6,
          marginBottom: 9,
        }}
      >
        {drill.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={drill.image_url}
            alt=""
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        ) : (
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.09em',
              color: 'var(--on-mat-muted)',
            }}
          >
            NO IMAGE
          </span>
        )}
      </div>

      <h3 style={{ fontSize: 14 }}>{drill.name}</h3>

      {drill.is_draft ? (
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', marginTop: 7 }}>
          Draft — needs finishing
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--ink)' }}>
            {drill.library === 'outfield' ? 'Outfield' : 'Goalkeeping'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-30)' }}>·</span>
          <span style={{ fontSize: 10, color: 'var(--ink-45)' }}>{playersLabel(drill)}</span>
          <span style={{ fontSize: 10, color: 'var(--ink-30)' }}>·</span>
          <span style={{ fontSize: 10, color: 'var(--ink-45)' }}>
            {drill.duration_mins === null ? '— min' : `${drill.duration_mins} min`}
          </span>
          <span style={{ fontSize: 10, color: 'var(--ink-30)' }}>·</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)' }}>
            {typeLabel(drill.type)}
          </span>
        </div>
      )}
      </Link>

      {onAdd !== undefined && (
        <button
          type="button"
          // Sibling of the Link, not nested inside it — the card as a whole
          // still opens the drill; this is a separate hit target layered on
          // top, so it needs to stop the click reaching the anchor.
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAdd?.()
          }}
          disabled={!showAdd || added !== false || pending}
          aria-label={
            !showAdd
              ? 'Finish this draft before it can be added to a session'
              : added !== false
                ? `${drill.name} is drill ${added} in this session — tap to remove`
                : pending
                  ? `Adding ${drill.name}…`
                  : `Add ${drill.name} to session`
          }
          title={!showAdd ? 'Finish this draft before it can be added to a session' : undefined}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            width: 26,
            height: 26,
            borderRadius: '50%',
            border: 'none',
            display: 'grid',
            placeItems: 'center',
            fontSize: 15,
            fontWeight: 700,
            lineHeight: 1,
            // Pending is transient, not an achievement, so it stays on the
            // quiet chip treatment rather than accent — only the settled
            // "added" checkmark and the live "+" get the stronger states.
            background: added !== false || pending ? 'var(--chip-bg)' : 'var(--accent)',
            color: added !== false || pending ? 'var(--ink-45)' : 'var(--ground)',
            opacity: !showAdd ? 0.4 : 1,
            cursor: !showAdd || added !== false || pending ? 'not-allowed' : 'pointer',
          }}
        >
          {added !== false ? added : pending ? '…' : '+'}
        </button>
      )}
    </div>
  )
}
