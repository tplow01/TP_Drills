'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'muted'

const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--ground)',
    border: 'none',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--ink-70)',
    border: '1.5px solid var(--button-border)',
  },
  ghost: {
    background: 'none',
    color: 'var(--accent)',
    border: 'none',
    padding: 0,
  },
  // No background, no border, muted ink text. For row-level actions (e.g.
  // "remove this line") that must not read as live/actionable the way accent
  // does — orange is rationed to what is live, earned or actionable.
  muted: {
    background: 'none',
    color: 'var(--ink-45)',
    border: 'none',
    padding: 0,
  },
}

/**
 * Pass `href` for a navigation control: it renders a Next `Link` styled
 * identically, instead of a `<button>` a caller would otherwise have to wrap
 * in a `<Link>` — invalid HTML, and two focusable controls for one target.
 * Every other prop behaves the same either way.
 */
export function Button({
  children,
  onClick,
  href,
  variant = 'primary',
  disabled = false,
  type = 'button',
  fullWidth = false,
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: ButtonVariant
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
}) {
  const isGhost = variant === 'ghost' || variant === 'muted'
  const style: React.CSSProperties = {
    ...variantStyle[variant],
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: fullWidth ? '100%' : undefined,
    padding: isGhost ? undefined : '11px 18px',
    borderRadius: 'var(--radius-sm)',
    fontWeight: 600,
    fontSize: 13,
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
  }

  if (href !== undefined) {
    // A disabled link is not a thing: drop the href and mark it inert rather
    // than leaving a dead but clickable control.
    if (disabled) {
      return <span style={style} aria-disabled="true">{children}</span>
    }
    return <Link href={href} onClick={onClick} style={style}>{children}</Link>
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  )
}
