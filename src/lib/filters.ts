import { typeLabel } from './taxonomy'
import type { AgeBand, Drill, DrillType } from './types'

export type DurationBucket = 'lte10' | '10to20' | 'gte20'
export type SortKey = 'duration' | 'players_min'
export type SortDir = 'asc' | 'desc'

export interface DrillFilter {
  types: DrillType[]
  ageBands: AgeBand[]
  durations: DurationBucket[]
  playersToday: number | null
  tags: string[]
  search: string
}

export const EMPTY_FILTER: DrillFilter = {
  types: [], ageBands: [], durations: [], playersToday: null, tags: [], search: '',
}

/** The distinct tags present across a set of drills, alphabetical. Empty until a drill has at least one tag. */
export function availableTags(drills: Drill[]): string[] {
  const set = new Set<string>()
  for (const d of drills) for (const t of d.tags) set.add(t)
  return [...set].sort((a, b) => a.localeCompare(b))
}

const DURATION_LABELS: Record<DurationBucket, string> = {
  lte10: '≤10 min',
  '10to20': '10–20 min',
  gte20: '20+ min',
}

export function matchesDuration(mins: number | null, bucket: DurationBucket): boolean {
  if (mins === null) return false
  if (bucket === 'lte10') return mins <= 10
  if (bucket === '10to20') return mins > 10 && mins <= 20
  return mins > 20
}

/**
 * Spec 7.1. The PRD said `players_min <= N`, which shows a drill capped at 12
 * when you have 20 in front of you. Both bounds are inclusive; a null maximum
 * means no upper limit.
 */
export function matchesPlayers(drill: Drill, n: number | null): boolean {
  if (n === null) return true
  if (drill.players_min === null) return false
  if (drill.players_min > n) return false
  return drill.players_max === null || drill.players_max >= n
}

export function matchesSearch(drill: Drill, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (q === '') return true
  const haystack = [
    drill.name,
    ...drill.setup,
    ...drill.how_it_works,
    ...drill.tags,
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

export function matchesFilter(drill: Drill, filter: DrillFilter): boolean {
  if (drill.deleted_at !== null) return false
  if (filter.types.length > 0 && !filter.types.includes(drill.type)) return false
  if (filter.ageBands.length > 0) {
    if (drill.age_band === null || !filter.ageBands.includes(drill.age_band)) return false
  }
  if (filter.durations.length > 0) {
    if (!filter.durations.some((b) => matchesDuration(drill.duration_mins, b))) return false
  }
  if (filter.tags.length > 0 && !filter.tags.some((t) => drill.tags.includes(t))) return false
  if (!matchesPlayers(drill, filter.playersToday)) return false
  if (!matchesSearch(drill, filter.search)) return false
  return true
}

export function filterDrills(drills: Drill[], filter: DrillFilter): Drill[] {
  return drills.filter((d) => matchesFilter(d, filter))
}

export function sortDrills(drills: Drill[], key: SortKey, dir: SortDir): Drill[] {
  const value = (d: Drill) => (key === 'duration' ? d.duration_mins : d.players_min)
  return [...drills].sort((a, b) => {
    const av = value(a)
    const bv = value(b)
    // Nulls always sink, regardless of direction — a drill with no duration
    // is not "the shortest".
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    return dir === 'asc' ? av - bv : bv - av
  })
}

/** Search is excluded: it has its own visible field. */
export function activeFilterCount(filter: DrillFilter): number {
  let n = 0
  if (filter.types.length > 0) n++
  if (filter.ageBands.length > 0) n++
  if (filter.durations.length > 0) n++
  if (filter.tags.length > 0) n++
  if (filter.playersToday !== null) n++
  return n
}

export type FilterAxis = 'types' | 'ageBands' | 'durations' | 'tags' | 'playersToday'

/**
 * One removable filter value. Spec 7.1 requires active filters to be
 * "individually clearable" from the summary line, so the summary needs the
 * active filters as data rather than as one flat sentence.
 *
 * A multi-select axis contributes one chip per selected value: unpicking
 * "Passing" must not also unpick "Shooting". `playersToday` is single-valued
 * and contributes at most one chip.
 */
export interface ActiveFilterChip {
  axis: FilterAxis
  /** The value to remove from its axis. `null` for the single-valued axis. */
  value: DrillType | AgeBand | DurationBucket | string | null
  label: string
}

/** Search is excluded: it has its own visible field with its own clear. */
export function activeFilterChips(filter: DrillFilter): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = []
  for (const type of filter.types) {
    chips.push({ axis: 'types', value: type, label: typeLabel(type) })
  }
  for (const band of filter.ageBands) {
    chips.push({ axis: 'ageBands', value: band, label: band })
  }
  for (const bucket of filter.durations) {
    chips.push({ axis: 'durations', value: bucket, label: DURATION_LABELS[bucket] })
  }
  for (const tag of filter.tags) {
    chips.push({ axis: 'tags', value: tag, label: tag })
  }
  if (filter.playersToday !== null) {
    chips.push({ axis: 'playersToday', value: null, label: `fits ${filter.playersToday}` })
  }
  return chips
}

/** Returns the filter with just this one chip removed. Never mutates. */
export function removeFilterChip(filter: DrillFilter, chip: ActiveFilterChip): DrillFilter {
  switch (chip.axis) {
    case 'types':
      return { ...filter, types: filter.types.filter((t) => t !== chip.value) }
    case 'ageBands':
      return { ...filter, ageBands: filter.ageBands.filter((b) => b !== chip.value) }
    case 'durations':
      return { ...filter, durations: filter.durations.filter((d) => d !== chip.value) }
    case 'tags':
      return { ...filter, tags: filter.tags.filter((t) => t !== chip.value) }
    case 'playersToday':
      return { ...filter, playersToday: null }
  }
}

/**
 * Spec 11: an empty result offers to clear the most restrictive filter, not
 * only Clear all. Returns the axis whose removal recovers the most drills.
 */
export function mostRestrictiveAxis(drills: Drill[], filter: DrillFilter): FilterAxis | null {
  const axes: FilterAxis[] = ['types', 'ageBands', 'durations', 'tags', 'playersToday']
  const active = axes.filter((a) =>
    a === 'playersToday' ? filter.playersToday !== null : filter[a].length > 0,
  )
  if (active.length === 0) return null

  let best: FilterAxis = active[0]
  let bestCount = -1
  for (const axis of active) {
    const relaxed: DrillFilter =
      axis === 'playersToday'
        ? { ...filter, playersToday: null }
        : { ...filter, [axis]: [] }
    const count = filterDrills(drills, relaxed).length
    if (count > bestCount) {
      bestCount = count
      best = axis
    }
  }
  return best
}
