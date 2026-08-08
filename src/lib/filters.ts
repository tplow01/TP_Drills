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
  search: string
}

export const EMPTY_FILTER: DrillFilter = {
  types: [], ageBands: [], durations: [], playersToday: null, search: '',
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
    drill.setup,
    drill.how_it_works,
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
  if (filter.playersToday !== null) n++
  return n
}

export function describeFilter(filter: DrillFilter): string {
  const parts: string[] = []
  if (filter.types.length > 0) parts.push(filter.types.map(typeLabel).join(', '))
  if (filter.ageBands.length > 0) parts.push(filter.ageBands.join(', '))
  if (filter.durations.length > 0) {
    parts.push(filter.durations.map((d) => DURATION_LABELS[d]).join(', '))
  }
  if (filter.playersToday !== null) parts.push(`fits ${filter.playersToday}`)
  return parts.length === 0 ? 'No filters' : parts.join(' · ')
}

export type FilterAxis = 'types' | 'ageBands' | 'durations' | 'playersToday'

/**
 * Spec 11: an empty result offers to clear the most restrictive filter, not
 * only Clear all. Returns the axis whose removal recovers the most drills.
 */
export function mostRestrictiveAxis(drills: Drill[], filter: DrillFilter): FilterAxis | null {
  const axes: FilterAxis[] = ['types', 'ageBands', 'durations', 'playersToday']
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
