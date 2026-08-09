'use client'

import { describeFilter } from '@/lib/filters'
import type { DrillFilter } from '@/lib/filters'
import { Button } from '@/components/ui/Button'

export function ActiveFilterSummary({
  shown,
  total,
  filter,
  onClearAll,
}: {
  shown: number
  total: number
  filter: DrillFilter
  onClearAll: () => void
}) {
  const description = describeFilter(filter)
  const filtered = description !== 'No filters'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', margin: '12px 0 14px' }}>
      <span className="hl" style={{ fontSize: 17 }}>{shown}</span>
      <span style={{ fontSize: 12, color: 'var(--ink-45)' }}>
        of {total}
        {filtered && ` · ${description}`}
      </span>
      {filtered && (
        <span style={{ marginLeft: 'auto', fontSize: 11 }}>
          <Button variant="ghost" onClick={onClearAll}>
            Clear all
          </Button>
        </span>
      )}
    </div>
  )
}
