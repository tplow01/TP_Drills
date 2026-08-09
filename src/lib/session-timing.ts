import type { SessionDrillWithDrill } from './types'

/**
 * Spec 7.4: a per-drill override never mutates the drill's own default. This
 * function is the only place that resolves which duration applies.
 */
export function effectiveDuration(item: SessionDrillWithDrill): number {
  if (item.duration_override !== null) return item.duration_override
  return item.drill.duration_mins ?? 0
}

export function plannedMinutes(items: SessionDrillWithDrill[]): number {
  return items.reduce((total, item) => total + effectiveDuration(item), 0)
}

export interface TimingSummary {
  planned: number
  target: number
  /** Negative when the session runs over. */
  remaining: number
  isOver: boolean
}

export function timingSummary(
  items: SessionDrillWithDrill[],
  target: number,
): TimingSummary {
  const planned = plannedMinutes(items)
  return { planned, target, remaining: target - planned, isOver: planned > target }
}
