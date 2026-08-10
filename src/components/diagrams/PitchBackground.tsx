// src/components/diagrams/PitchBackground.tsx
import type { PitchPreset } from '@/lib/types'

export const PITCH_DIMENSIONS: Record<PitchPreset, { width: number; height: number }> = {
  full: { width: 520, height: 800 },
  half: { width: 520, height: 420 },
  grid: { width: 520, height: 520 },
}

const LINE = '#ffffff'
const GRID_LINE = 'rgba(255,255,255,0.16)'
const STRIPE_LIGHT = '#3fa85a'
const STRIPE_DARK = '#37974f'

/** Alternating mow-stripe bands, like a maintained pitch — the crisp-tactics-board look asked for over the flat single-tone field. */
function MowStripes({ width, height, preset }: { width: number; height: number; preset: PitchPreset }) {
  const bandCount = preset === 'full' ? 10 : preset === 'half' ? 6 : 8
  const vertical = preset === 'grid'
  const bandSize = (vertical ? width : height) / bandCount
  const bands: React.ReactNode[] = []
  for (let i = 0; i < bandCount; i++) {
    const fill = i % 2 === 0 ? STRIPE_LIGHT : STRIPE_DARK
    bands.push(
      vertical
        ? <rect key={i} x={i * bandSize} y={0} width={bandSize} height={height} fill={fill} />
        : <rect key={i} x={0} y={i * bandSize} width={width} height={bandSize} fill={fill} />,
    )
  }
  return <>{bands}</>
}

function GridLines({ width, height }: { width: number; height: number }) {
  const lines: React.ReactNode[] = []
  for (let x = 40; x < width; x += 40) {
    lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke={GRID_LINE} strokeWidth={1} />)
  }
  for (let y = 40; y < height; y += 40) {
    lines.push(<line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={GRID_LINE} strokeWidth={1} />)
  }
  return <>{lines}</>
}

/** Fixed backgrounds for the three presets a diagram can be created with (design doc, 2026-08-10). Not editable after creation. Crisp-tactics-board styling: mowed-stripe turf, bold white line work, rounded card corners. */
export function PitchBackground({ preset }: { preset: PitchPreset }) {
  const { width, height } = PITCH_DIMENSIONS[preset]
  const goalWidth = 130
  const radius = 16

  return (
    <g>
      <defs>
        <clipPath id="pitch-rounded-clip">
          <rect x={0} y={0} width={width} height={height} rx={radius} ry={radius} />
        </clipPath>
      </defs>
      <g clipPath="url(#pitch-rounded-clip)">
        <MowStripes width={width} height={height} preset={preset} />
        <GridLines width={width} height={height} />
      </g>
      <rect x={2} y={2} width={width - 4} height={height - 4} rx={radius} ry={radius} fill="none" stroke={LINE} strokeWidth={4} />

      {preset === 'full' && (
        <>
          <line x1={16} y1={height / 2} x2={width - 16} y2={height / 2} stroke={LINE} strokeWidth={3} />
          <circle cx={width / 2} cy={height / 2} r={50} fill="none" stroke={LINE} strokeWidth={3} />
        </>
      )}

      {preset !== 'grid' && (
        <>
          <rect x={(width - goalWidth) / 2} y={height - 30} width={goalWidth} height={26} fill="none" stroke={LINE} strokeWidth={3} />
          {preset === 'full' && (
            <rect x={(width - goalWidth) / 2} y={4} width={goalWidth} height={26} fill="none" stroke={LINE} strokeWidth={3} />
          )}
        </>
      )}
    </g>
  )
}
