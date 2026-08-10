// src/components/diagrams/EquipmentIcon.tsx
/**
 * The seven equipment tools' icon artwork, drawn literally (a cone that
 * looks like a cone, a ball that looks like a ball) rather than the plain
 * geometric placeholders used before — design doc, 2026-08-10. Fixed
 * intrinsic colors, not the coach's selected palette color: a multi-color
 * illustrated cone can't be reduced to one flat swatch the way a shape,
 * player, or arrow can.
 *
 * Drawn in a 24x24 space centered at (12,12) with no wrapping `<svg>`/`<g>`
 * of its own, so callers can drop it into either a small fixed-size palette
 * icon or a `<g transform="translate(...)">` on the pitch canvas — same
 * shape, two different sizes/positions, one source of truth.
 */
export function EquipmentIcon({ type }: { type: string }) {
  switch (type) {
    case 'cone':
      return (
        <>
          <polygon points="12,3 5,21 19,21" fill="#ff6a1a" />
          <rect x="8.75" y="13.5" width="6.5" height="2.5" fill="#ffffff" />
          <ellipse cx="12" cy="21" rx="4.5" ry="1" fill="#ff6a1a" />
        </>
      )
    case 'ball':
      return (
        <>
          <circle cx="12" cy="12" r="8.5" fill="#ffffff" stroke="#101828" strokeWidth={1.4} />
          <polygon points="12,9 14.2,10.6 13.4,13.2 10.6,13.2 9.8,10.6" fill="#101828" />
        </>
      )
    case 'mannequin':
      return (
        <>
          <ellipse cx="12" cy="5.5" rx="3" ry="3.2" fill="#f97316" />
          <path
            d="M8.5,9 C8.5,7.8 10,7 12,7 C14,7 15.5,7.8 15.5,9 L14.5,20.5 C14.5,21.4 13.4,22 12,22 C10.6,22 9.5,21.4 9.5,20.5 Z"
            fill="#f97316"
          />
          <rect x="7" y="12.5" width="10" height="2" rx={1} fill="#ea580c" />
        </>
      )
    case 'goal-small':
      return (
        <>
          <path
            d="M4,20 L4,7 L20,7 L20,20"
            fill="none"
            stroke="#101828"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.5,8.5 L6.5,19 M9.5,8.5 L9.5,19 M14.5,8.5 L14.5,19 M17.5,8.5 L17.5,19"
            stroke="#c7cbd1"
            strokeWidth={0.6}
          />
        </>
      )
    case 'ladder':
      return (
        <>
          <rect x="6" y="3" width="2" height="18" rx={1} fill="#facc15" />
          <rect x="16" y="3" width="2" height="18" rx={1} fill="#facc15" />
          <rect x="7" y="6" width="10" height="1.6" fill="#facc15" />
          <rect x="7" y="11.2" width="10" height="1.6" fill="#facc15" />
          <rect x="7" y="16.4" width="10" height="1.6" fill="#facc15" />
        </>
      )
    case 'pole':
      return (
        <>
          <line x1="7" y1="3" x2="7" y2="21" stroke="#101828" strokeWidth={1.6} strokeLinecap="round" />
          <polygon points="7.8,4 15,6.5 7.8,9" fill="#dc2626" />
        </>
      )
    case 'wall':
      return (
        <>
          <rect x="4" y="10" width="16" height="7" rx={2} fill="#94a3b8" />
          <circle cx="8" cy="7.5" r="2" fill="#94a3b8" />
          <circle cx="12" cy="7.5" r="2" fill="#94a3b8" />
          <circle cx="16" cy="7.5" r="2" fill="#94a3b8" />
        </>
      )
    default:
      return null
  }
}
