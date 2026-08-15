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
          <polygon points="12,4 6.5,20 17.5,20" fill="#ff6a1a" stroke="#c94f0f" strokeWidth={0.6} strokeLinejoin="round" />
          <rect x="9" y="13.5" width="6" height="2.2" rx={0.4} fill="#ffffff" />
          <ellipse cx="12" cy="20" rx="5.5" ry="1.2" fill="#c94f0f" />
        </>
      )
    case 'ball':
      return (
        <>
          <circle cx="12" cy="12" r="9" fill="#ffffff" stroke="#101828" strokeWidth={1.2} />
          <circle cx="12" cy="12" r="3.2" fill="#101828" />
          <path d="M12,8.8 L12,3.5 M12,15.2 L12,20.5 M8.8,12 L3.5,12 M15.2,12 L20.5,12" stroke="#101828" strokeWidth={1} strokeLinecap="round" />
        </>
      )
    case 'mannequin':
      return (
        <>
          <circle cx="12" cy="5.5" r="2.6" fill="#f97316" stroke="#c2560a" strokeWidth={0.5} />
          <path
            d="M8.2,10 C8.2,8.6 9.9,7.8 12,7.8 C14.1,7.8 15.8,8.6 15.8,10 L14.8,20.5 C14.8,21.4 13.5,22 12,22 C10.5,22 9.2,21.4 9.2,20.5 Z"
            fill="#f97316"
            stroke="#c2560a"
            strokeWidth={0.5}
          />
          <rect x="6.8" y="12.5" width="10.4" height="1.8" rx={0.9} fill="#c2560a" />
        </>
      )
    case 'goal-small':
      return (
        <>
          <path
            d="M4,20 L4,6.5 L20,6.5 L20,20"
            fill="none"
            stroke="#f2f4f6"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.8,8 L6.8,19 M9.6,8 L9.6,19 M14.4,8 L14.4,19 M17.2,8 L17.2,19"
            stroke="#9aa1ab"
            strokeWidth={0.9}
          />
          <path d="M4,8.5 L20,8.5 M4,11.5 L20,11.5 M4,14.5 L20,14.5 M4,17.5 L20,17.5" stroke="#9aa1ab" strokeWidth={0.6} />
        </>
      )
    case 'ladder':
      return (
        <>
          <rect x="6.2" y="3" width="1.8" height="18" rx={0.9} fill="#eab308" />
          <rect x="16" y="3" width="1.8" height="18" rx={0.9} fill="#eab308" />
          <rect x="7" y="6.2" width="10" height="1.5" fill="#eab308" />
          <rect x="7" y="11.2" width="10" height="1.5" fill="#eab308" />
          <rect x="7" y="16.2" width="10" height="1.5" fill="#eab308" />
        </>
      )
    case 'pole':
      return (
        <>
          <line x1="7.5" y1="3" x2="7.5" y2="21" stroke="#f2f4f6" strokeWidth={1.8} strokeLinecap="round" />
          <polygon points="8.3,4.2 15.5,6.6 8.3,9" fill="#dc2626" stroke="#a51c1c" strokeWidth={0.4} strokeLinejoin="round" />
        </>
      )
    case 'wall':
      return (
        <>
          <rect x="4" y="10.5" width="16" height="6.5" rx={2} fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
          <circle cx="8" cy="7.5" r="2.1" fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
          <circle cx="12" cy="7.5" r="2.1" fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
          <circle cx="16" cy="7.5" r="2.1" fill="#94a3b8" stroke="#697585" strokeWidth={0.5} />
        </>
      )
    default:
      return null
  }
}
