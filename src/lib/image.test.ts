import { describe, expect, it } from 'vitest'
import { MAX_EDGE, computeTargetSize } from './image'

describe('computeTargetSize', () => {
  it('caps the longest edge at 1000px', () => {
    expect(MAX_EDGE).toBe(1000)
    expect(computeTargetSize(4000, 3000)).toEqual({ width: 1000, height: 750 })
  })

  it('caps height when the image is portrait', () => {
    expect(computeTargetSize(3000, 4000)).toEqual({ width: 750, height: 1000 })
  })

  it('leaves images already within the cap untouched', () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600 })
  })

  it('never upscales', () => {
    expect(computeTargetSize(200, 100)).toEqual({ width: 200, height: 100 })
  })

  it('handles a square image', () => {
    expect(computeTargetSize(2400, 2400)).toEqual({ width: 1000, height: 1000 })
  })

  it('rounds to whole pixels', () => {
    const { width, height } = computeTargetSize(1333, 999)
    expect(Number.isInteger(width)).toBe(true)
    expect(Number.isInteger(height)).toBe(true)
    expect(width).toBe(1000)
    // 999 * (1000 / 1333) = 749.4373..., which rounds down to 749.
    expect(height).toBe(749)
  })

  it('never rounds a dimension down to zero', () => {
    // A 4000x1 panorama must still be at least one pixel tall.
    expect(computeTargetSize(4000, 1).height).toBe(1)
  })
})
