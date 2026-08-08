import type { DrillInput } from './types'

export type RequiredField =
  | 'name' | 'type' | 'age_band' | 'duration_mins'
  | 'players_min' | 'players_max' | 'setup' | 'how_it_works' | 'coaching_points'

const LABELS: Record<RequiredField, string> = {
  name: 'Name',
  type: 'Type',
  age_band: 'Age band',
  duration_mins: 'Duration',
  players_min: 'Minimum players',
  players_max: 'Maximum players must be at least the minimum',
  setup: 'Setup',
  how_it_works: 'How it works',
  coaching_points: 'At least one coaching point',
}

const blank = (s: string | null | undefined) => (s ?? '').trim().length === 0

/**
 * What is still missing before this drill can be used in a session.
 * Independent of `is_draft`: that flag records intent to finish later, it does
 * not change what a finished drill needs.
 */
export function missingFields(input: DrillInput): RequiredField[] {
  const missing: RequiredField[] = []

  if (blank(input.name)) missing.push('name')
  if (!input.type) missing.push('type')

  // Outfield requires an age band; goalkeeping must never have one (spec 5.3).
  if (input.library === 'outfield' && input.age_band === null) missing.push('age_band')

  if (input.duration_mins === null || input.duration_mins <= 0) missing.push('duration_mins')
  if (input.players_min === null || input.players_min <= 0) missing.push('players_min')

  if (
    input.players_max !== null &&
    input.players_min !== null &&
    input.players_max < input.players_min
  ) {
    missing.push('players_max')
  }

  if (blank(input.setup)) missing.push('setup')
  if (blank(input.how_it_works)) missing.push('how_it_works')

  if (input.coaching_points.filter((p) => !blank(p)).length === 0) {
    missing.push('coaching_points')
  }

  return missing
}

export function isComplete(input: DrillInput): boolean {
  return missingFields(input).length === 0
}

export function fieldLabel(field: RequiredField): string {
  return LABELS[field]
}
