'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  EMPTY_FILTER, activeFilterCount, filterDrills, mostRestrictiveAxis, sortDrills,
} from '@/lib/filters'
import type { DrillFilter, SortDir, SortKey } from '@/lib/filters'
import type { Drill, Library } from '@/lib/types'
import { Segment } from '@/components/ui/Segment'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'
import { ActiveFilterSummary } from './ActiveFilterSummary'
import { DrillGrid } from './DrillGrid'
import { FilterPanel } from './FilterPanel'

const AXIS_LABELS: Record<string, string> = {
  types: 'type',
  ageBands: 'age band',
  durations: 'duration',
  playersToday: 'player count',
}

export function DrillsBrowser({
  outfield,
  goalkeeping,
}: {
  outfield: Drill[]
  goalkeeping: Drill[]
}) {
  // Spec 5.1: the segment never persists. Every arrival opens on Outfield.
  const [library, setLibrary] = useState<Library>('outfield')
  const [filter, setFilter] = useState<DrillFilter>(EMPTY_FILTER)
  const [sortKey, setSortKey] = useState<SortKey>('duration')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [sheetOpen, setSheetOpen] = useState(false)

  const all = library === 'outfield' ? outfield : goalkeeping
  const drafts = useMemo(() => all.filter((d) => d.is_draft), [all])

  const results = useMemo(
    () => sortDrills(filterDrills(all, filter), sortKey, sortDir),
    [all, filter, sortKey, sortDir],
  )

  function switchLibrary(next: Library) {
    setLibrary(next)
    // Type chips and age bands are library-specific, so a carried-over filter
    // would silently exclude everything.
    setFilter(EMPTY_FILTER)
  }

  const panel = (
    <FilterPanel
      library={library}
      filter={filter}
      onChange={setFilter}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={(k, d) => { setSortKey(k); setSortDir(d) }}
    />
  )

  const emptyState =
    all.length === 0 ? (
      <div style={{ padding: '32px 0', maxWidth: 420 }}>
        <h3 style={{ fontSize: 18 }}>Nothing here yet</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-45)', marginTop: 10 }}>
          Two libraries, kept separate: <strong style={{ color: 'var(--ink)' }}>Outfield</strong> for
          your youth teams, <strong style={{ color: 'var(--ink)' }}>Goalkeeping</strong> for keepers of
          any age. A drill belongs to one of them permanently.
        </p>
        <p style={{ fontSize: 13, color: 'var(--ink-45)', marginTop: 10 }}>
          Quick add captures a name, a type and a scribble — finish it later.
        </p>
      </div>
    ) : (
      <EmptyResults drills={all} filter={filter} onChange={setFilter} />
    )

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      {/* Desktop sidebar */}
      <aside
        className="filter-sidebar"
        style={{ width: 190, flex: 'none', borderRight: '1px solid var(--hairline)', padding: '18px 16px 28px' }}
      >
        {panel}
      </aside>

      <div style={{ flex: 1, minWidth: 0, padding: '18px 18px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Segment value={library} onChange={switchLibrary} />
          <Link href={`/drills/new?library=${library}&mode=quick`} style={{ marginLeft: 'auto' }}>
            <Button>+ Quick add</Button>
          </Link>
        </div>

        <div style={{ marginTop: 12 }}>
          <TextInput
            value={filter.search}
            onChange={(value) => setFilter({ ...filter, search: value })}
            placeholder="Search name, tags, setup, how it works…"
          />
        </div>

        {/* Phone-only filter trigger */}
        <div className="filter-trigger" style={{ display: 'none', marginTop: 10 }}>
          <Button
            variant={activeFilterCount(filter) > 0 ? 'primary' : 'secondary'}
            fullWidth
            onClick={() => setSheetOpen(true)}
          >
            Filters{activeFilterCount(filter) > 0 ? ` · ${activeFilterCount(filter)}` : ''}
          </Button>
        </div>

        <ActiveFilterSummary
          shown={results.length}
          total={all.length}
          filter={filter}
          onClearAll={() => setFilter({ ...EMPTY_FILTER, search: filter.search })}
        />

        {drafts.length > 0 && (
          <div
            style={{
              border: '1px solid rgba(241,94,34,0.4)', borderRadius: 'var(--radius)',
              padding: '10px 12px', marginBottom: 12,
              fontSize: 12, fontWeight: 600, color: 'var(--accent)',
            }}
          >
            {drafts.length === 1
              ? '1 draft needs finishing before it can go in a session'
              : `${drafts.length} drafts need finishing before they can go in a session`}
          </div>
        )}

        <DrillGrid drills={results} emptyState={emptyState} />
      </div>

      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              maxHeight: '80vh', overflowY: 'auto',
              background: 'var(--ground)',
              borderTop: '1px solid var(--hairline)',
              borderRadius: '16px 16px 0 0', padding: 18,
            }}
          >
            <h3 style={{ fontSize: 17, marginBottom: 14 }}>Filters</h3>
            {panel}
            <div style={{ marginTop: 6 }}>
              <Button fullWidth onClick={() => setSheetOpen(false)}>
                {results.length === 0
                  ? 'No matches'
                  : `Show ${results.length} ${results.length === 1 ? 'drill' : 'drills'}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Spec 11: offer to clear the most restrictive filter, not only Clear all. */
function EmptyResults({
  drills,
  filter,
  onChange,
}: {
  drills: Drill[]
  filter: DrillFilter
  onChange: (next: DrillFilter) => void
}) {
  const axis = mostRestrictiveAxis(drills, filter)
  return (
    <div style={{ padding: '28px 0', maxWidth: 380 }}>
      <h3 style={{ fontSize: 17 }}>No drills match</h3>
      {axis && (
        <div style={{ marginTop: 12 }}>
          <Button
            onClick={() =>
              onChange(
                axis === 'playersToday'
                  ? { ...filter, playersToday: null }
                  : { ...filter, [axis]: [] },
              )
            }
          >
            Clear the {AXIS_LABELS[axis]} filter
          </Button>
        </div>
      )}
    </div>
  )
}
