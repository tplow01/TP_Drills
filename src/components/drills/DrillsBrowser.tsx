'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  EMPTY_FILTER, activeFilterCount, filterDrills, mostRestrictiveAxis, sortDrills,
} from '@/lib/filters'
import type { DrillFilter } from '@/lib/filters'
import { browseStateToQuery, drillHref, parseBrowseState } from '@/lib/drill-query'
import type { DrillBrowseState } from '@/lib/drill-query'
import { addDrillToSession } from '@/lib/sessions'
import type { Drill, DrillStats, Library, SessionWithDrills } from '@/lib/types'
import { Segment } from '@/components/ui/Segment'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/TextInput'
import { SessionTray } from '@/components/sessions/SessionTray'
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
  session: initialSession,
  stats,
}: {
  outfield: Drill[]
  goalkeeping: Drill[]
  /**
   * Set only when arrived at from the Planner via `?session=<id>` (spec
   * 7.4). Its presence is the sole trigger for the tray, the bottom dock and
   * the per-card `+` — absent on every other visit to /drills.
   */
  session?: SessionWithDrills | null
  /** Derived stats from the drill_stats view, keyed by drill id (Task 12). */
  stats: Record<string, DrillStats>
}) {
  const params = useSearchParams()

  /**
   * Spec 7.1: filter and sort survive a trip into a drill and back. The URL
   * is the store — the back button restores it for free, and a bare `/drills`
   * parses to the default: Outfield, no filters (spec 5.1, the segment never
   * persists across a fresh visit).
   */
  const [state, setState] = useState<DrillBrowseState>(() => parseBrowseState(params))
  const [sheetOpen, setSheetOpen] = useState(false)

  // Local, optimistic view of the session so a card can mark itself added
  // and the tray's running total can move without a page reload. Seeded
  // from the server-loaded session and appended to as adds succeed.
  const [session, setSession] = useState<SessionWithDrills | null>(initialSession ?? null)
  const [addError, setAddError] = useState<string | null>(null)
  const [busyDrillId, setBusyDrillId] = useState<string | null>(null)

  // Already ordered by position (SessionWithDrills.drills' existing DB
  // order), so the index doubles as the 1-based badge shown on each card.
  const addedDrillIds = useMemo(
    () => (session?.drills ?? []).map((d) => d.drill_id),
    [session],
  )

  async function handleAdd(drill: Drill) {
    if (!session || busyDrillId !== null || addedDrillIds.includes(drill.id)) return
    setAddError(null)
    setBusyDrillId(drill.id)
    try {
      const created = await addDrillToSession(session.id, drill.id)
      setSession((s) => (s ? { ...s, drills: [...s.drills, { ...created, drill }] } : s))
    } catch (e) {
      setAddError(e instanceof Error ? e.message : `Failed to add ${drill.name}`)
    } finally {
      setBusyDrillId(null)
    }
  }

  const query = browseStateToQuery(state)

  // Mirror state into the URL without a Next navigation: `router.replace` on
  // a force-dynamic route would refetch the whole list on every keystroke.
  // replaceState edits the current history entry rather than adding one, so
  // pressing back from a drill lands on the list as it was left, not on a
  // trail of half-typed searches. Leaving and returning remounts this
  // component, and the initialiser above reads the state back out of the URL.
  useEffect(() => {
    const href = query === '' ? '/drills' : `/drills?${query}`
    if (window.location.pathname + window.location.search === href) return
    window.history.replaceState(null, '', href)
  }, [query])

  const { library: stateLibrary, filter, sortKey, sortDir } = state
  const setFilter = (next: DrillFilter) => setState((s) => ({ ...s, filter: next }))

  // A session fixes the pool to its own library — the URL/filter-state
  // library only applies on an ordinary, session-less visit to /drills.
  const library = session ? session.library : stateLibrary

  const all = library === 'outfield' ? outfield : goalkeeping

  // Drafts are pinned above the list, never mixed into it (spec 7.1, 11), so
  // they are held out of the filtered set entirely rather than filtered.
  const { drafts, finished } = useMemo(() => ({
    drafts: all.filter((d) => d.is_draft && d.deleted_at === null),
    finished: all.filter((d) => !d.is_draft),
  }), [all])

  const results = useMemo(
    () => sortDrills(filterDrills(finished, filter), sortKey, sortDir),
    [finished, filter, sortKey, sortDir],
  )

  function switchLibrary(next: Library) {
    // Type chips and age bands are library-specific, so a carried-over filter
    // would silently exclude everything.
    setState((s) => ({ ...s, library: next, filter: EMPTY_FILTER }))
  }

  const panel = (
    <FilterPanel
      library={library}
      filter={filter}
      onChange={setFilter}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={(k, d) => setState((s) => ({ ...s, sortKey: k, sortDir: d }))}
    />
  )

  const emptyState =
    finished.length === 0 ? (
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
      <EmptyResults drills={finished} filter={filter} onChange={setFilter} />
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

      <div
        className={session ? 'drills-content-with-tray' : undefined}
        style={{ flex: 1, minWidth: 0, padding: '18px 18px 28px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {!session && <Segment value={library} onChange={switchLibrary} />}
          <span style={{ marginLeft: 'auto' }}>
            <Button href={`/drills/new?library=${library}&mode=quick`}>+ Quick add</Button>
          </span>
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
          total={finished.length}
          filter={filter}
          onChange={setFilter}
          onClearAll={() => setFilter({ ...EMPTY_FILTER, search: filter.search })}
        />

        {/* Pinned above the results and never inside them: a draft is work to
            finish, not a search hit, so the count is of the whole library and
            filters do not apply to it. */}
        {drafts.length > 0 && (
          <div
            style={{
              border: '1px solid var(--accent-border)', borderRadius: 'var(--radius)',
              padding: '10px 12px', marginBottom: 12,
              fontSize: 12, fontWeight: 600, color: 'var(--accent)',
            }}
          >
            <div style={{ marginBottom: 8 }}>
              {drafts.length === 1
                ? '1 draft needs finishing before it can go in a session'
                : `${drafts.length} drafts need finishing before they can go in a session`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {drafts.map((d) => (
                <Button key={d.id} variant="ghost" href={drillHref(d.id, state)}>
                  {d.name} →
                </Button>
              ))}
            </div>
          </div>
        )}

        {addError && (
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 12 }}>
            {addError}
          </div>
        )}

        <DrillGrid
          drills={results}
          browseState={state}
          emptyState={emptyState}
          onAdd={session ? handleAdd : undefined}
          addedDrillIds={session ? addedDrillIds : undefined}
          pendingId={session ? busyDrillId : undefined}
          stats={stats}
        />
      </div>

      {/* The tray is conditional (spec 7.4): present only when arrived at
          from the Planner. An ordinary visit to /drills renders none of
          this — no tray, no dock, no per-card +. */}
      {session && <SessionTray session={session} />}

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
