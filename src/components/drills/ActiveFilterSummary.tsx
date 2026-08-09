'use client'

import { activeFilterChips, removeFilterChip } from '@/lib/filters'
import type { DrillFilter } from '@/lib/filters'
import { Button } from '@/components/ui/Button'

/**
 * Spec 7.1: active filters are visible here and individually clearable, plus
 * Clear all. One chip per selected value, each with its own dismiss — on
 * phone the filter panel is a sheet the coach would otherwise have to reopen
 * to unpick a single choice.
 */
export function ActiveFilterSummary({
  shown,
  total,
  filter,
  onChange,
  onClearAll,
}: {
  shown: number
  total: number
  filter: DrillFilter
  onChange: (next: DrillFilter) => void
  onClearAll: () => void
}) {
  const chips = activeFilterChips(filter)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', margin: '12px 0 14px' }}>
      <span className="hl" style={{ fontSize: 17 }}>{shown}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-45)' }}>of {total}</span>

      {chips.map((chip) => (
        <button
          key={`${chip.axis}:${chip.value ?? ''}`}
          onClick={() => onChange(removeFilterChip(filter, chip))}
          aria-label={`Remove filter ${chip.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            // An applied filter is live state, so accent is earned here.
            border: '1px solid var(--accent-border)',
            borderRadius: 999,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--accent)',
          }}
        >
          {chip.label}
          <span aria-hidden="true" style={{ color: 'var(--ink-45)', lineHeight: 1 }}>×</span>
        </button>
      ))}

      {chips.length > 0 && (
        <span style={{ marginLeft: 'auto', fontSize: 11 }}>
          <Button variant="ghost" onClick={onClearAll}>
            Clear all
          </Button>
        </span>
      )}
    </div>
  )
}
