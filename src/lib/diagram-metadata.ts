import type { DiagramElement, ElementColor } from './types'

/**
 * What can be read off a diagram's placed elements without the coach typing
 * anything — player count/split, a suggested "NvM" tag, and equipment
 * tallies for the fields drill already has (cones_needed, goals_needed,
 * bibs_needed). Pure function over the same `elements` array that's already
 * serialized to `drill_diagram.elements` — no new detection framework
 * (add-drill experience design, 2026-08-12).
 */
export interface DerivedDrillMetadata {
  playerCount: number
  teamSplit: { color: ElementColor; count: number }[]
  suggestedTags: string[]
  conesNeeded: number
  goalsNeeded: number
  bibsNeeded: boolean
}

const EQUIPMENT_TO_CONES = new Set(['cone'])
const EQUIPMENT_TO_GOALS = new Set(['goal-small'])

export function deriveDrillMetadata(elements: DiagramElement[]): DerivedDrillMetadata {
  const players = elements.filter((el) => el.kind === 'player')
  const equipment = elements.filter((el) => el.kind === 'equipment')

  const colorCounts = new Map<ElementColor, number>()
  for (const p of players) {
    colorCounts.set(p.color, (colorCounts.get(p.color) ?? 0) + 1)
  }
  const teamSplit = [...colorCounts.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count)

  const suggestedTags: string[] = []
  if (teamSplit.length === 2) {
    suggestedTags.push(`${teamSplit[0].count}v${teamSplit[1].count}`)
  }

  let conesNeeded = 0
  let goalsNeeded = 0
  for (const e of equipment) {
    if (EQUIPMENT_TO_CONES.has(e.type)) conesNeeded += 1
    if (EQUIPMENT_TO_GOALS.has(e.type)) goalsNeeded += 1
  }

  return {
    playerCount: players.length,
    teamSplit,
    suggestedTags,
    conesNeeded,
    goalsNeeded,
    // No bib element type exists in the palette (EQUIPMENT_TOOLS in
    // DiagramCanvas.tsx) — bibs_needed stays a manual DrillForm field.
    bibsNeeded: false,
  }
}
