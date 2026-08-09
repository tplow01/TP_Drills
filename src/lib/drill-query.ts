import { EMPTY_FILTER } from './filters'
import type { DrillFilter, DurationBucket, SortDir, SortKey } from './filters'
import { AGE_BANDS, GK_TYPES, OUTFIELD_TYPES } from './taxonomy'
import type { AgeBand, DrillType, Library } from './types'

/**
 * Spec 7.1: "Filter and sort state persists navigating into and out of a
 * drill." The URL is the store — no extra library, and the back button gets
 * the behaviour for free.
 *
 * Defaults are omitted from the string, so a bare `/drills` is both the
 * canonical clean state and what a fresh arrival gets: Outfield, no filters,
 * shortest duration first.
 */
export interface DrillBrowseState {
  library: Library
  filter: DrillFilter
  sortKey: SortKey
  sortDir: SortDir
}

export const DEFAULT_BROWSE_STATE: DrillBrowseState = {
  library: 'outfield',
  filter: EMPTY_FILTER,
  sortKey: 'duration',
  sortDir: 'asc',
}

const ALL_TYPES: readonly string[] = [...OUTFIELD_TYPES, ...GK_TYPES]
const DURATION_BUCKETS: readonly string[] = ['lte10', '10to20', 'gte20']
const SORT_KEYS: readonly string[] = ['duration', 'players_min']

/** Reads a repeated-or-comma-separated param, keeping only known values. */
function readList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly string[],
): T[] {
  const raw = params.getAll(key).flatMap((v) => v.split(','))
  const out: T[] = []
  for (const value of raw) {
    const trimmed = value.trim()
    if (allowed.includes(trimmed) && !out.includes(trimmed as T)) out.push(trimmed as T)
  }
  return out
}

/** A positive whole number, or null. Guards against `0`, `-3`, `abc`, `1e9`. */
function readCount(params: URLSearchParams, key: string): number | null {
  const raw = params.get(key)
  if (raw === null || raw.trim() === '') return null
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

/** Anything unrecognised falls back to the default rather than throwing. */
export function parseBrowseState(params: URLSearchParams): DrillBrowseState {
  const library: Library = params.get('lib') === 'goalkeeping' ? 'goalkeeping' : 'outfield'

  const filter: DrillFilter = {
    types: readList<DrillType>(params, 'type', ALL_TYPES),
    ageBands: readList<AgeBand>(params, 'age', AGE_BANDS),
    durations: readList<DurationBucket>(params, 'dur', DURATION_BUCKETS),
    playersToday: readCount(params, 'players'),
    search: params.get('q') ?? '',
  }

  const [rawKey, rawDir] = (params.get('sort') ?? '').split(':')
  const sortKey: SortKey = SORT_KEYS.includes(rawKey) ? (rawKey as SortKey) : 'duration'
  const sortDir: SortDir = rawDir === 'desc' ? 'desc' : 'asc'

  return { library, filter, sortKey, sortDir }
}

/**
 * The query string for a state, defaults omitted. Returns '' for the default
 * state so the canonical URL stays a bare `/drills`.
 */
export function browseStateToQuery(state: DrillBrowseState): string {
  const params = new URLSearchParams()
  if (state.library !== 'outfield') params.set('lib', state.library)
  if (state.filter.types.length > 0) params.set('type', state.filter.types.join(','))
  if (state.filter.ageBands.length > 0) params.set('age', state.filter.ageBands.join(','))
  if (state.filter.durations.length > 0) params.set('dur', state.filter.durations.join(','))
  if (state.filter.playersToday !== null) params.set('players', String(state.filter.playersToday))
  if (state.filter.search.trim() !== '') params.set('q', state.filter.search)
  if (state.sortKey !== 'duration' || state.sortDir !== 'asc') {
    params.set('sort', `${state.sortKey}:${state.sortDir}`)
  }
  // Readable: commas and colons are legal in a query value and survive a
  // round trip, so don't let URLSearchParams percent-encode them.
  return params.toString().replace(/%2C/g, ',').replace(/%3A/g, ':')
}

/** `/drills`, carrying the browse state. */
export function drillsHref(state: DrillBrowseState): string {
  const query = browseStateToQuery(state)
  return query === '' ? '/drills' : `/drills?${query}`
}

/**
 * A drill card's href. The browse state rides along as `back` so the detail
 * screen's Back control returns to the list exactly as it was left — the
 * browser's own back button is not the only way home.
 */
export function drillHref(id: string, state: DrillBrowseState): string {
  const query = browseStateToQuery(state)
  return query === '' ? `/drills/${id}` : `/drills/${id}?back=${encodeURIComponent(query)}`
}

/**
 * Rebuilds the list href from a detail page's `back` param. Never trusts it as
 * a URL: it is re-parsed into a browse state and re-serialised, so it can only
 * ever produce a `/drills` link.
 */
export function backToDrillsHref(back: string | string[] | undefined): string {
  if (typeof back !== 'string' || back === '') return '/drills'
  return drillsHref(parseBrowseState(new URLSearchParams(back)))
}
