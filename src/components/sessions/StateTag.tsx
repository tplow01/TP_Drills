import type { SessionStatus } from '@/lib/session-status'
import { statusLabel } from '@/lib/session-status'

/**
 * The tag IS the call to action (spec 8). `plan_it` and `reflect` carry
 * accent because they're asking the coach for something; `ready` is solid
 * accent because it's live; `done` and `no_date` recede — they need nothing.
 */
const TAG_STYLE: Record<SessionStatus, React.CSSProperties> = {
  ready: {
    background: 'var(--accent)',
    color: 'var(--ground)',
    border: 'none',
  },
  plan_it: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1.5px solid var(--accent-border)',
  },
  reflect: {
    background: 'var(--accent-tint)',
    color: 'var(--accent)',
    border: 'none',
  },
  done: {
    background: 'var(--track-bg)',
    color: 'var(--ink-45)',
    border: 'none',
  },
  no_date: {
    background: 'var(--track-bg)',
    color: 'var(--ink-30)',
    border: 'none',
  },
}

export function StateTag({ status }: { status: SessionStatus }) {
  return (
    <span
      className="lbl"
      style={{
        ...TAG_STYLE[status],
        display: 'inline-flex',
        alignItems: 'center',
        padding: '5px 10px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
      }}
    >
      {statusLabel(status)}
    </span>
  )
}
