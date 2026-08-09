'use client'

import { AGE_BANDS, typeLabel, typesFor } from '@/lib/taxonomy'
import type { DrillFilter, DurationBucket, SortDir, SortKey } from '@/lib/filters'
import type { AgeBand, DrillType, Library } from '@/lib/types'
import { TextInput } from '@/components/ui/TextInput'

const DURATIONS: { value: DurationBucket; label: string }[] = [
  { value: 'lte10', label: '≤ 10 min' },
  { value: '10to20', label: '10–20 min' },
  { value: 'gte20', label: '20+ min' },
]

function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: 'none',
        padding: '5px 0',
        width: '100%',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 500,
        color: checked ? 'var(--ink)' : 'var(--ink-70)',
      }}
    >
      <span
        style={{
          width: 13,
          height: 13,
          flex: 'none',
          borderRadius: 3,
          border: `1.5px solid ${checked ? 'var(--accent)' : 'rgba(243,240,234,0.25)'}`,
          background: checked ? 'var(--accent)' : 'transparent',
        }}
      />
      {label}
    </button>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  )
}

export function FilterPanel({
  library,
  filter,
  onChange,
  sortKey,
  sortDir,
  onSortChange,
}: {
  library: Library
  filter: DrillFilter
  onChange: (next: DrillFilter) => void
  sortKey: SortKey
  sortDir: SortDir
  onSortChange: (key: SortKey, dir: SortDir) => void
}) {
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

  return (
    <div>
      <Group label="Type">
        {typesFor(library).map((type) => (
          <Checkbox
            key={type}
            label={typeLabel(type)}
            checked={filter.types.includes(type)}
            onToggle={() => onChange({ ...filter, types: toggle<DrillType>(filter.types, type) })}
          />
        ))}
      </Group>

      {/* Age band is outfield-only (spec 5.3). */}
      {library === 'outfield' && (
        <Group label="Age band">
          {AGE_BANDS.map((band) => (
            <Checkbox
              key={band}
              label={band}
              checked={filter.ageBands.includes(band)}
              onToggle={() =>
                onChange({ ...filter, ageBands: toggle<AgeBand>(filter.ageBands, band) })
              }
            />
          ))}
        </Group>
      )}

      <Group label="Duration">
        {DURATIONS.map(({ value, label }) => (
          <Checkbox
            key={value}
            label={label}
            checked={filter.durations.includes(value)}
            onToggle={() =>
              onChange({ ...filter, durations: toggle<DurationBucket>(filter.durations, value) })
            }
          />
        ))}
      </Group>

      <Group label="Players today">
        <TextInput
          type="number"
          min={1}
          placeholder="How many?"
          value={filter.playersToday === null ? '' : String(filter.playersToday)}
          onChange={(value) =>
            onChange({
              ...filter,
              playersToday: value === '' ? null : Number(value),
            })
          }
        />
      </Group>

      <Group label="Sort by">
        <select
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => {
            const [key, dir] = e.target.value.split(':')
            onSortChange(key as SortKey, dir as SortDir)
          }}
          style={{
            width: '100%',
            background: 'rgba(243,240,234,0.06)',
            border: '1px solid rgba(243,240,234,0.12)',
            borderRadius: 6,
            padding: '8px 10px',
            color: 'var(--ink)',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <option value="duration:asc">Duration, shortest first</option>
          <option value="duration:desc">Duration, longest first</option>
          <option value="players_min:asc">Players, fewest first</option>
          <option value="players_min:desc">Players, most first</option>
        </select>
      </Group>
    </div>
  )
}
