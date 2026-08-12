import type { Diagram } from './types'

export interface DiagramStepGroup {
  sequenceGroup: string | null
  diagrams: Diagram[]
}

/**
 * Diagrams sharing a non-null `sequence_group` render as Step 1/Step 2/Step 3
 * tabs instead of separate gallery entries (add-drill experience design,
 * 2026-08-12). Callers already pass diagrams in `position` order
 * (listDiagramsForDrill, diagramsByDrillId) — this only groups, it doesn't
 * re-sort.
 */
export function groupDiagramsIntoSteps(diagrams: Diagram[]): DiagramStepGroup[] {
  const groups: DiagramStepGroup[] = []
  const groupIndexBySequence = new Map<string, number>()

  for (const diagram of diagrams) {
    if (diagram.sequence_group === null) {
      groups.push({ sequenceGroup: null, diagrams: [diagram] })
      continue
    }
    const existingIndex = groupIndexBySequence.get(diagram.sequence_group)
    if (existingIndex === undefined) {
      groupIndexBySequence.set(diagram.sequence_group, groups.length)
      groups.push({ sequenceGroup: diagram.sequence_group, diagrams: [diagram] })
    } else {
      groups[existingIndex].diagrams.push(diagram)
    }
  }

  return groups
}
