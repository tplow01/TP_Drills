import type { AgeBand, DrillType, GkType, Library, OutfieldType } from './types'

export const OUTFIELD_TYPES = [
  'warm_up', 'passing', 'dribbling', 'shooting', 'finishing',
  'defending', 'possession_rondo', 'small_sided_game', 'fun_cooldown',
] as const satisfies readonly OutfieldType[]

export const GK_TYPES = [
  'gk_warmup_handling', 'shot_stopping', 'footwork', 'distribution',
  'crosses', 'positioning', 'reactions', 'one_v_ones',
] as const satisfies readonly GkType[]

export const AGE_BANDS = ['U6-U8', 'U9-U11', 'U12-U14', 'U15-U18'] as const satisfies readonly AgeBand[]

const TYPE_LABELS: Record<DrillType, string> = {
  warm_up: 'Warm-up',
  passing: 'Passing',
  dribbling: 'Dribbling',
  shooting: 'Shooting',
  finishing: 'Finishing',
  defending: 'Defending',
  possession_rondo: 'Possession / Rondo',
  small_sided_game: 'Small-sided game',
  fun_cooldown: 'Fun game / Cool-down',
  gk_warmup_handling: 'Warm-up / Handling',
  shot_stopping: 'Shot stopping',
  footwork: 'Footwork',
  distribution: 'Distribution',
  crosses: 'Dealing with crosses',
  positioning: 'Positioning',
  reactions: 'Reactions',
  one_v_ones: '1v1s',
}

export function typesFor(library: Library): readonly DrillType[] {
  return library === 'outfield' ? OUTFIELD_TYPES : GK_TYPES
}

export function typeLabel(type: DrillType): string {
  return TYPE_LABELS[type]
}
