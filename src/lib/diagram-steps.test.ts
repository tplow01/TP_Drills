import { describe, expect, it } from 'vitest'
import { groupDiagramsIntoSteps } from './diagram-steps'
import type { Diagram } from './types'

function diagram(id: string, position: number, sequenceGroup: string | null): Diagram {
  return {
    id, drill_id: 'd1', position, title: null, pitch_preset: 'full', elements: [],
    sequence_group: sequenceGroup, created_at: '', updated_at: '',
  }
}

describe('groupDiagramsIntoSteps', () => {
  it('returns one standalone group per diagram when none share a sequence_group', () => {
    const diagrams = [diagram('a', 0, null), diagram('b', 1, null)]
    expect(groupDiagramsIntoSteps(diagrams)).toEqual([
      { sequenceGroup: null, diagrams: [diagrams[0]] },
      { sequenceGroup: null, diagrams: [diagrams[1]] },
    ])
  })

  it('groups diagrams sharing a sequence_group into one entry, in position order', () => {
    const diagrams = [diagram('a', 0, 'seq-1'), diagram('b', 1, 'seq-1')]
    expect(groupDiagramsIntoSteps(diagrams)).toEqual([
      { sequenceGroup: 'seq-1', diagrams: [diagrams[0], diagrams[1]] },
    ])
  })

  it('preserves overall order when standalone and grouped diagrams are mixed', () => {
    const diagrams = [diagram('a', 0, null), diagram('b', 1, 'seq-1'), diagram('c', 2, 'seq-1'), diagram('d', 3, null)]
    const result = groupDiagramsIntoSteps(diagrams)
    expect(result.map((g) => g.sequenceGroup)).toEqual([null, 'seq-1', null])
    expect(result[1].diagrams.map((d) => d.id)).toEqual(['b', 'c'])
  })

  it('returns an empty array for no diagrams', () => {
    expect(groupDiagramsIntoSteps([])).toEqual([])
  })
})
