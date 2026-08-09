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
}: {
  drill: Drill
  browseState: DrillBrowseState
}) {
  return (
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
  )
}
