import Link from 'next/link'
import { drillHref } from '@/lib/drill-query'
import type { DrillBrowseState } from '@/lib/drill-query'
import { typeLabel } from '@/lib/taxonomy'
import type { Drill } from '@/lib/types'

function playersLabel(drill: Drill): string {
  if (drill.players_min === null) return '—'
  return drill.players_max === null
    ? `${drill.players_min}+`
    : `${drill.players_min}–${drill.players_max}`
}

export function DrillCard({
  drill,
  browseState,
  onAdd,
  added = false,
}: {
  drill: Drill
  browseState: DrillBrowseState
  /**
   * Present only when the session tray is up (spec 7.4). Its absence is
   * what keeps the `+` off every card on an ordinary visit to /drills.
   */
  onAdd?: () => void
  added?: boolean
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
      {/* Cream mat: contains the image rather than cropping it, so a grid of
          white-paper diagrams reads as consistent shapes. */}
      <div
        style={{
          background: 'var(--ink)',
          borderRadius: 'var(--radius-sm)',
          height: 76,
          display: 'grid',
          placeItems: 'center',
          overflow: 'hidden',
          padding: 6,
          marginBottom: 10,
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

      <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 7 }}>
        {typeLabel(drill.type)}
        {drill.age_band && ` · ${drill.age_band}`}
      </div>

      <div style={{ fontSize: 10, color: 'var(--ink-45)', marginTop: 4 }}>
        {drill.duration_mins === null ? '— min' : `${drill.duration_mins} min`}
        {' · '}
        {playersLabel(drill)}
        {drill.bibs_needed && ' · bibs'}
      </div>

      {drill.is_draft && (
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', marginTop: 7 }}>
          Draft — needs finishing
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
          disabled={!showAdd || added}
          aria-label={
            !showAdd
              ? 'Finish this draft before it can be added to a session'
              : added
                ? `${drill.name} already added`
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
            background: added ? 'var(--chip-bg)' : 'var(--accent)',
            color: added ? 'var(--ink-45)' : 'var(--ground)',
            opacity: !showAdd ? 0.4 : 1,
            cursor: !showAdd || added ? 'not-allowed' : 'pointer',
          }}
        >
          {added ? '✓' : '+'}
        </button>
      )}
    </div>
  )
}
