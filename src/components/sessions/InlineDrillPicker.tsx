'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  EMPTY_FILTER, activeFilterCount, availableTags, filterDrills, mostRestrictiveAxis, sortDrills,
} from '@/lib/filters'
import type { DrillFilter, SortDir, SortKey } from '@/lib/filters'
import { DEFAULT_BROWSE_STATE } from '@/lib/drill-query'
import type { Drill, DrillStats, Library } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'
import { ActiveFilterSummary } from '@/components/drills/ActiveFilterSummary'
import { DrillGrid } from '@/components/drills/DrillGrid'
import { FilterPanel } from '@/components/drills/FilterPanel'

/**
 * The session's own filter+add UI, reusing FilterPanel/DrillGrid/filters.ts
 * directly (spec: no duplicated filter logic) — but as a slide-over on top
 * of the Planner, not the /drills route, so there is no URL to sync and no
 * library toggle (locked to the session's own library). Design critique
 * finding: this must be full filter width, not a cramped side panel — hence
 * a drawer, not an inline strip.
 */
export function InlineDrillPicker({
  library,
  sessionId,
  drills,
  addedDrillIds,
  pendingId,
  addError,
  stats,
  onAdd,
  onClose,
}: {
  library: Library
  sessionId: string
  drills: Drill[]
  addedDrillIds: readonly string[]
  pendingId: string | null
  addError: string | null
  stats: Record<string, DrillStats>
  onAdd: (drill: Drill) => void
  onClose: () => void
}) {
  const [filter, setFilter] = useState<DrillFilter>(EMPTY_FILTER)
  const [sortKey, setSortKey] = useState<SortKey>('duration')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus moves into the drawer on open (so keyboard users land somewhere
  // sensible instead of on whatever was behind it), and Escape closes it —
  // the filter sheet, if open, closes first rather than the whole drawer.
  useEffect(() => {
    closeButtonRef.current?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (filtersOpen) setFiltersOpen(false)
      else onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [filtersOpen, onClose])

  const finished = useMemo(() => drills.filter((d) => !d.is_draft), [drills])
  const results = useMemo(
    () => sortDrills(filterDrills(finished, filter), sortKey, sortDir),
    [finished, filter, sortKey, sortDir],
  )

  const browseState = { ...DEFAULT_BROWSE_STATE, library, filter, sortKey, sortDir, session: sessionId }
  const tagOptions = useMemo(() => availableTags(finished), [finished])

  const panel = (
    <FilterPanel
      library={library}
      filter={filter}
      onChange={setFilter}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={(k, d) => { setSortKey(k); setSortDir(d) }}
      availableTags={tagOptions}
    />
  )

  return (
    <div role="dialog" aria-modal="true" aria-label="Add drills to session" className="drill-picker-scrim" onClick={onClose}>
      <div className="drill-picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="drill-picker-header">
          <h3 className="hl" style={{ fontSize: 17 }}>Add drills</h3>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close" className="drill-picker-close">×</button>
        </div>

        <div className="drill-picker-body">
          <aside className="filter-sidebar drill-picker-filters">{panel}</aside>

          <div className="drill-picker-results">
            <TextInput
              value={filter.search}
              onChange={(value) => setFilter({ ...filter, search: value })}
              placeholder="Search name, tags, setup, how it works…"
            />

            <div className="filter-trigger" style={{ display: 'none', marginTop: 10 }}>
              <Button
                variant={activeFilterCount(filter) > 0 ? 'primary' : 'secondary'}
                fullWidth
                onClick={() => setFiltersOpen(true)}
              >
                Filters{activeFilterCount(filter) > 0 ? ` · ${activeFilterCount(filter)}` : ''}
              </Button>
            </div>

            <ActiveFilterSummary
              shown={results.length}
              total={finished.length}
              filter={filter}
              onChange={setFilter}
              onClearAll={() => setFilter({ ...EMPTY_FILTER, search: filter.search })}
            />

            {addError && (
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>
                {addError}
              </div>
            )}

            <DrillGrid
              drills={results}
              browseState={browseState}
              emptyState={<EmptyResults drills={finished} filter={filter} onChange={setFilter} />}
              onAdd={onAdd}
              addedDrillIds={addedDrillIds}
              pendingId={pendingId}
              stats={stats}
            />
          </div>
        </div>
      </div>

      {filtersOpen && (
        <div
          onClick={(e) => { e.stopPropagation(); setFiltersOpen(false) }}
          className="drill-picker-filter-sheet-scrim"
        >
          <div onClick={(e) => e.stopPropagation()} className="drill-picker-filter-sheet">
            <h3 style={{ fontSize: 17, marginBottom: 14 }}>Filters</h3>
            {panel}
            <div style={{ marginTop: 6 }}>
              <Button fullWidth onClick={() => setFiltersOpen(false)}>
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

const AXIS_LABELS: Record<string, string> = {
  types: 'type',
  ageBands: 'age band',
  durations: 'duration',
  tags: 'tag',
  playersToday: 'player count',
}

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
