import { describe, expect, it } from 'vitest'
import { teamColor, teamColorMap } from './team-colors'

describe('teamColor', () => {
  it('gives distinct colors to the first several indexes', () => {
    const colors = [0, 1, 2, 3].map(teamColor)
    expect(new Set(colors).size).toBe(4)
  })

  it('is deterministic for the same index', () => {
    expect(teamColor(2)).toBe(teamColor(2))
  })

  it('cycles once the index exceeds the palette size', () => {
    expect(teamColor(0)).toBe(teamColor(8))
  })
})

describe('teamColorMap', () => {
  it('assigns each team a color by its position in the list', () => {
    const map = teamColorMap([{ id: 'a' }, { id: 'b' }, { id: 'c' }])
    expect(map.get('a')).toBe(teamColor(0))
    expect(map.get('b')).toBe(teamColor(1))
    expect(map.get('c')).toBe(teamColor(2))
  })

  it('returns an empty map for no teams', () => {
    expect(teamColorMap([]).size).toBe(0)
  })
})
