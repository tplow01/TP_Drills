import { describe, expect, it } from 'vitest'
import { TEAM_COLORS, suggestedTeamColor, teamColor, teamColorMap } from './team-colors'

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

  it('a team with an explicit color uses it instead of its index', () => {
    const map = teamColorMap([{ id: 'a', color: '#ffffff' }, { id: 'b', color: null }])
    expect(map.get('a')).toBe('#ffffff')
    expect(map.get('b')).toBe(teamColor(1))
  })
})

describe('suggestedTeamColor', () => {
  it('suggests the first unused palette color', () => {
    expect(suggestedTeamColor([TEAM_COLORS[0], TEAM_COLORS[1]])).toBe(TEAM_COLORS[2])
  })

  it('suggests the first color when nothing is used yet', () => {
    expect(suggestedTeamColor([])).toBe(TEAM_COLORS[0])
  })

  it('ignores nulls', () => {
    expect(suggestedTeamColor([null, null])).toBe(TEAM_COLORS[0])
  })

  it('falls back to the first color once every palette color is taken', () => {
    expect(suggestedTeamColor([...TEAM_COLORS])).toBe(TEAM_COLORS[0])
  })
})
