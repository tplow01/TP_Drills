import { describe, expect, it } from 'vitest'
import { GK_TYPES, OUTFIELD_TYPES, typeLabel, typesFor } from './taxonomy'

describe('taxonomy', () => {
  it('lists nine outfield types and eight goalkeeping types', () => {
    expect(OUTFIELD_TYPES).toHaveLength(9)
    expect(GK_TYPES).toHaveLength(8)
  })

  it('keeps the two taxonomies disjoint', () => {
    const overlap = OUTFIELD_TYPES.filter((t) => (GK_TYPES as readonly string[]).includes(t))
    expect(overlap).toEqual([])
  })

  it('returns the right list per library', () => {
    expect(typesFor('outfield')).toBe(OUTFIELD_TYPES)
    expect(typesFor('goalkeeping')).toBe(GK_TYPES)
  })

  it('gives every type a human label', () => {
    for (const t of [...OUTFIELD_TYPES, ...GK_TYPES]) {
      expect(typeLabel(t).length).toBeGreaterThan(0)
    }
    expect(typeLabel('possession_rondo')).toBe('Possession / Rondo')
    expect(typeLabel('gk_warmup_handling')).toBe('Warm-up / Handling')
  })
})
