import { describe, expect, it } from 'vitest'
import { clamp, elementColorHex, normalizeRect, wavyPath } from './diagram-elements'

describe('elementColorHex', () => {
  it('maps every palette color to a hex value', () => {
    expect(elementColorHex('green')).toBe('#2ea043')
    expect(elementColorHex('blue')).toBe('#1f6feb')
    expect(elementColorHex('yellow')).toBe('#d4a72c')
    expect(elementColorHex('red')).toBe('#da3633')
    expect(elementColorHex('black')).toBe('#111111')
    expect(elementColorHex('gray')).toBe('#8b949e')
  })
})

describe('normalizeRect', () => {
  it('leaves an already-normalized rect unchanged', () => {
    expect(normalizeRect(10, 10, 50, 40)).toEqual({ x: 10, y: 10, x2: 50, y2: 40 })
  })

  it('swaps a rect dragged up and to the left of its start', () => {
    expect(normalizeRect(50, 40, 10, 10)).toEqual({ x: 10, y: 10, x2: 50, y2: 40 })
  })

  it('handles a rect dragged only leftward', () => {
    expect(normalizeRect(50, 10, 10, 40)).toEqual({ x: 10, y: 10, x2: 50, y2: 40 })
  })
})

describe('clamp', () => {
  it('passes through a value already in range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('floors below the minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('ceilings above the maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })
})

describe('wavyPath', () => {
  it('starts at the given start point', () => {
    expect(wavyPath(0, 0, 100, 0)).toMatch(/^M0,0/)
  })

  it('returns a stationary marker for a zero-length segment', () => {
    expect(wavyPath(20, 20, 20, 20)).toBe('M20,20')
  })

  it('produces one Q command per segment', () => {
    const d = wavyPath(0, 0, 120, 0)
    const qCount = (d.match(/Q/g) ?? []).length
    expect(qCount).toBe(6)
  })
})
