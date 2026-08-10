import type { DrillInput } from './types'

export type RequiredField =
  | 'name' | 'type' | 'age_band' | 'duration_mins'
  | 'players_min' | 'setup' | 'how_it_works' | 'coaching_points'

/**
 * A value that is present but cannot be stored. These mirror the database's
 * `positive_numbers` and `players_range_sane` CHECK constraints, which apply
 * to every row including drafts — so unlike a missing field, an invalid one
 * cannot be deferred by saving as a draft.
 */
export type InvalidField =
  | 'duration_mins' | 'players_min' | 'players_max'
  | 'goals_needed' | 'cones_needed'

const MISSING_LABELS: Record<RequiredField, string> = {
  name: 'Name',
  type: 'Type',
  age_band: 'Age band',
  duration_mins: 'Duration',
  players_min: 'Minimum players',
  setup: 'Setup',
  how_it_works: 'How it works',
  coaching_points: 'At least one coaching point',
}

const INVALID_LABELS: Record<InvalidField, string> = {
  duration_mins: 'Duration must be at least 1 minute',
  players_min: 'Minimum players must be at least 1',
  players_max: 'Maximum players must be at least the minimum',
  goals_needed: 'Goals cannot be negative',
  cones_needed: 'Cones cannot be negative',
}

const blank = (s: string | null | undefined) => (s ?? '').trim().length === 0
const hasContent = (list: string[]) => list.some((item) => !blank(item))

/**
 * What is still missing before this drill can be used in a session.
 * Independent of `is_draft`: that flag records intent to finish later, it does
 * not change what a finished drill needs.
 *
 * "Missing" means not supplied at all. A supplied but impossible value is not
 * missing — see `invalidFields`.
 */
export function missingFields(input: DrillInput): RequiredField[] {
  const missing: RequiredField[] = []

  if (blank(input.name)) missing.push('name')
  if (!input.type) missing.push('type')

  // Outfield requires an age band; goalkeeping must never have one (spec 5.3).
  if (input.library === 'outfield' ? input.age_band === null : input.age_band !== null) {
    missing.push('age_band')
  }

  if (input.duration_mins === null) missing.push('duration_mins')
  if (input.players_min === null) missing.push('players_min')

  if (!hasContent(input.setup)) missing.push('setup')
  if (!hasContent(input.how_it_works)) missing.push('how_it_works')
  if (!hasContent(input.coaching_points)) missing.push('coaching_points')

  return missing
}

/**
 * Values that are present but that the database will reject outright. Saving
 * must be blocked while any of these stand — not downgraded to a draft, which
 * would still hit the CHECK constraint and surface a raw Postgres error.
 */
export function invalidFields(input: DrillInput): InvalidField[] {
  const invalid: InvalidField[] = []

  if (input.duration_mins !== null && !(input.duration_mins > 0)) invalid.push('duration_mins')
  if (input.players_min !== null && !(input.players_min > 0)) invalid.push('players_min')

  if (
    input.players_max !== null &&
    input.players_min !== null &&
    input.players_max < input.players_min
  ) {
    invalid.push('players_max')
  }

  if (!(input.goals_needed >= 0)) invalid.push('goals_needed')
  if (!(input.cones_needed >= 0)) invalid.push('cones_needed')

  return invalid
}

export function isComplete(input: DrillInput): boolean {
  return missingFields(input).length === 0 && invalidFields(input).length === 0
}

export function fieldLabel(field: RequiredField): string {
  return MISSING_LABELS[field]
}

export function invalidLabel(field: InvalidField): string {
  return INVALID_LABELS[field]
}
