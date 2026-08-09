'use client'

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
    border: '1.5px solid rgba(243,240,234,0.2)',
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

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  type = 'button',
  fullWidth = false,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  disabled?: boolean
  type?: 'button' | 'submit'
  fullWidth?: boolean
}) {
  const isGhost = variant === 'ghost' || variant === 'muted'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
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
      }}
    >
      {children}
    </button>
  )
}
