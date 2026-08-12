import { describe, expect, it } from 'vitest'
import { deriveDrillMetadata } from './diagram-metadata'
import type { DiagramElement } from './types'

function player(color: DiagramElement['color']): DiagramElement {
  return { id: `p-${color}-${Math.random()}`, kind: 'player', type: 'player-circle', color, x: 0, y: 0 }
}
function equipment(type: string): DiagramElement {
  return { id: `e-${type}-${Math.random()}`, kind: 'equipment', type, color: 'gray', x: 0, y: 0 }
}

describe('deriveDrillMetadata', () => {
  it('returns all-zero metadata for an empty canvas', () => {
    const result = deriveDrillMetadata([])
    expect(result).toEqual({
      playerCount: 0,
      teamSplit: [],
      suggestedTags: [],
      conesNeeded: 0,
      goalsNeeded: 0,
      bibsNeeded: false,
    })
  })

  it('counts players regardless of color', () => {
    const result = deriveDrillMetadata([player('green'), player('red'), player('gray')])
    expect(result.playerCount).toBe(3)
  })

  it('groups players by color into teamSplit, descending by count', () => {
    const result = deriveDrillMetadata([player('green'), player('green'), player('red'), player('green'), player('red')])
    expect(result.teamSplit).toEqual([
      { color: 'green', count: 3 },
      { color: 'red', count: 2 },
    ])
  })

  it('suggests a vN-vM tag when exactly two player colors are present', () => {
    const result = deriveDrillMetadata([player('green'), player('green'), player('green'), player('green'), player('red'), player('red')])
    expect(result.suggestedTags).toEqual(['4v2'])
  })

  it('suggests no tag when only one player color is present', () => {
    const result = deriveDrillMetadata([player('green'), player('green')])
    expect(result.suggestedTags).toEqual([])
  })

  it('suggests no tag when three or more player colors are present', () => {
    const result = deriveDrillMetadata([player('green'), player('red'), player('blue')])
    expect(result.suggestedTags).toEqual([])
  })

  it('tallies cones and goals from equipment elements', () => {
    const result = deriveDrillMetadata([equipment('cone'), equipment('cone'), equipment('cone'), equipment('goal-small')])
    expect(result.conesNeeded).toBe(3)
    expect(result.goalsNeeded).toBe(1)
  })

  it('does not set bibsNeeded from equipment — no bib element type exists', () => {
    const result = deriveDrillMetadata([equipment('cone')])
    expect(result.bibsNeeded).toBe(false)
  })

  it('ignores shape and arrow elements entirely', () => {
    const shape: DiagramElement = { id: 's1', kind: 'shape', type: 'square', color: 'green', x: 0, y: 0, x2: 10, y2: 10 }
    const arrow: DiagramElement = { id: 'a1', kind: 'arrow', type: 'arrow-solid', color: 'green', x: 0, y: 0, x2: 10, y2: 10 }
    const result = deriveDrillMetadata([shape, arrow])
    expect(result.playerCount).toBe(0)
    expect(result.conesNeeded).toBe(0)
  })
})
