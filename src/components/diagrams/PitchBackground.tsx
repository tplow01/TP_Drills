// src/components/diagrams/PitchBackground.tsx
import type { PitchPreset } from '@/lib/types'

export const PITCH_DIMENSIONS: Record<PitchPreset, { width: number; height: number }> = {
  full: { width: 520, height: 800 },
  half: { width: 520, height: 420 },
  grid: { width: 520, height: 520 },
}

const LINE = 'rgba(255,255,255,0.55)'
const GRID_LINE = 'rgba(255,255,255,0.12)'

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

/** Fixed backgrounds for the three presets a diagram can be created with (design doc, 2026-08-10). Not editable after creation. */
export function PitchBackground({ preset }: { preset: PitchPreset }) {
  const { width, height } = PITCH_DIMENSIONS[preset]
  const goalWidth = 120

  return (
    <g>
      <rect x={0} y={0} width={width} height={height} fill="#2f6b3a" />
      <GridLines width={width} height={height} />
      <rect x={4} y={4} width={width - 8} height={height - 8} fill="none" stroke={LINE} strokeWidth={2} />

      {preset === 'full' && (
        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={LINE} strokeWidth={2} />
      )}

      {preset !== 'grid' && (
        <>
          <rect x={(width - goalWidth) / 2} y={height - 28} width={goalWidth} height={24} fill="none" stroke={LINE} strokeWidth={2} />
          {preset === 'full' && (
            <rect x={(width - goalWidth) / 2} y={4} width={goalWidth} height={24} fill="none" stroke={LINE} strokeWidth={2} />
          )}
        </>
      )}
    </g>
  )
}
