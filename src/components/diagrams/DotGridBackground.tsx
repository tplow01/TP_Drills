// src/components/diagrams/DotGridBackground.tsx
import { useId } from 'react'

/** One shared canvas size for every diagram — editor, gallery, Session view,
    print (inline diagram canvas redesign, 2026-08-15, replacing the old
    per-preset PITCH_DIMENSIONS). Portrait 16:9-ish, unchanged from before. */
export const DIAGRAM_DIMENSIONS = { width: 540, height: 960 }

const DOT = 'rgba(242,244,246,0.13)'
const SURFACE = '#161a20'

/**
 * The one open drawing surface every diagram uses now — a faint dot grid
 * for a sense of scale, no pitch markings (a diagram here is a general
 * sketch space, not literally a football pitch). Replaces
 * `PitchBackground`'s three presets with a single fixed look.
 *
 * `useId()` keys the `<pattern>` id per instance so multiple diagrams
 * rendered on one page (e.g. a drill's full gallery) don't collide on a
 * shared id — duplicate SVG ids in one document would make every instance
 * resolve to whichever pattern the browser saw first.
 */
export function DotGridBackground() {
  const patternId = `diagram-dot-grid-${useId()}`
  const { width, height } = DIAGRAM_DIMENSIONS
  return (
    <>
      <defs>
        <pattern id={patternId} width={20} height={20} patternUnits="userSpaceOnUse">
          <circle cx={1} cy={1} r={1} fill={DOT} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={width} height={height} rx={8} fill={SURFACE} />
      <rect x={0} y={0} width={width} height={height} rx={8} fill={`url(#${patternId})`} />
    </>
  )
}
