'use client'

import type { Library } from '@/lib/types'

export function Segment({
  value,
  onChange,
}: {
  value: Library
  onChange: (library: Library) => void
}) {
  const options: Library[] = ['outfield', 'goalkeeping']
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        borderRadius: 999,
        overflow: 'hidden',
        background: 'var(--track-bg)',
      }}
    >
      {options.map((option) => {
        const active = option === value
        return (
          <button
            key={option}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option)}
            style={{
              border: 'none',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: 12,
              background: active ? 'var(--accent)' : 'transparent',
              color: active ? 'var(--ground)' : 'var(--ink-45)',
            }}
          >
            {option === 'outfield' ? 'Outfield' : 'Goalkeeping'}
          </button>
        )
      })}
    </div>
  )
}
