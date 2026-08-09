import Link from 'next/link'
import type { ReactNode } from 'react'

/**
 * Persistent back control, per spec 6.1: no nav bar, nothing more than two
 * levels deep. In Phase 1 the Drills screen is the front door, so it passes no
 * backHref. Phase 2 points it at the hub.
 */
export function ScreenHeader({
  title,
  backHref,
  backLabel = 'Back',
  right,
}: {
  title: string
  backHref?: string
  backLabel?: string
  right?: ReactNode
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 18px',
        borderBottom: '1px solid var(--hairline)',
      }}
    >
      {backHref && (
        <Link
          href={backHref}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--chip-bg)',
            padding: '7px 12px 7px 10px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 12,
            color: 'var(--ink-70)',
          }}
        >
          <span style={{ color: 'var(--accent)', lineHeight: 1 }}>←</span>
          {backLabel}
        </Link>
      )}
      <h1 style={{ fontSize: 19 }}>{title}</h1>
      <div style={{ marginLeft: 'auto' }}>{right}</div>
    </header>
  )
}
