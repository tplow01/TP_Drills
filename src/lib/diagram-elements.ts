import type { ElementColor } from './types'

const COLOR_HEX: Record<ElementColor, string> = {
  green: '#2ea043',
  blue: '#1f6feb',
  yellow: '#d4a72c',
  red: '#da3633',
  black: '#111111',
  gray: '#8b949e',
}

export function elementColorHex(color: ElementColor): string {
  return COLOR_HEX[color]
}

/**
 * Reorders two corner points so the first is top-left and the second is
 * bottom-right — a shape dragged up-and-left of its start still normalizes
 * to a sane rect instead of a negative width/height.
 */
export function normalizeRect(
  x: number, y: number, x2: number, y2: number,
): { x: number; y: number; x2: number; y2: number } {
  return {
    x: Math.min(x, x2),
    y: Math.min(y, y2),
    x2: Math.max(x, x2),
    y2: Math.max(y, y2),
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * SVG path `d` for a wavy line from (x,y) to (x2,y2): a fixed number of
 * alternating perpendicular bumps, amplitude scaled down for short segments
 * so a small wavy run doesn't produce an exaggerated zigzag.
 */
export function wavyPath(x: number, y: number, x2: number, y2: number): string {
  const SEGMENTS = 6
  const dx = x2 - x
  const dy = y2 - y
  const length = Math.hypot(dx, dy)
  if (length === 0) return `M${x},${y}`

  const amplitude = Math.min(length / SEGMENTS / 2, 8)
  const ux = dx / length
  const uy = dy / length
  // Perpendicular to the line's direction.
  const px = -uy
  const py = ux

  let d = `M${x},${y}`
  for (let i = 1; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS
    const bx = x + dx * t
    const by = y + dy * t
    const side = i % 2 === 0 ? 1 : -1
    const cx = x + dx * (t - 0.5 / SEGMENTS) + px * amplitude * side
    const cy = y + dy * (t - 0.5 / SEGMENTS) + py * amplitude * side
    d += ` Q${cx},${cy} ${bx},${by}`
  }
  return d
}
