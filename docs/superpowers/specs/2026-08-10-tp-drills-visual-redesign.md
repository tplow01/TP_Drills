# TP_Drills visual redesign — design system

## Context

The diagram-editor work shipped a light, card-based "crisp tactics-board" look for the editor screen (white chrome, bold striped pitch, circular color swatches, icon+label palette buttons). The rest of the app — drills list, forms, planner, session view — is still the original dark near-black/cream/orange theme from the Phase 1/2 design.

This spec covers **the design system only**: the new visual language, decided once, that every screen will eventually be re-skinned to use. It does not apply the redesign to any screen beyond what's already shipped (the diagram editor). Rolling it out to the drills list, forms, planner, and session view are separate follow-up passes, each getting its own plan once this direction is confirmed working in practice.

## Theme architecture: hybrid

The app keeps its dark near-black shell (`--ground: #151515`, `--card: #1f1f1f`, cream ink) for navigation, headers, and "live" actions — the chrome that's currently on every screen and reads well pitchside on a phone in daylight. Content-heavy surfaces get a white card treatment layered on top of that shell, matching what the diagram editor already does: `ScreenHeader` and page-level navigation stay dark; the actual content area (forms, diagram gallery, canvas) sits in white cards with soft shadows (`0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)`, `border: 1px solid #e4e7ec`, `border-radius: 12–14px`). This is not a new pattern to invent — it's naming and generalizing what the diagram editor already does, so the next screen to get redesigned follows the same split instead of reinventing it.

## Accent color: pitch green replaces orange

`--accent` moves from `#f15e22` (orange) to `#16a34a` (pitch green), everywhere — dark shell and light cards both, one color, no split. Derived tokens follow the same hue:

- `--accent: #16a34a`
- `--accent-border: rgba(22, 163, 74, 0.40)` (was the orange equivalent)
- `--accent-tint: rgba(22, 163, 74, 0.14)` (was the orange equivalent)

Because the app already routes every accent usage through these three CSS custom properties (confirmed: `globals.css` and every component reference `var(--accent)`/`var(--accent-border)`/`var(--accent-tint)`, not hardcoded hex), this is a token-level change — updating the three values in `globals.css` propagates to every existing dark-theme usage (StateTag, buttons, focus states, the "current drill" pitchside marker, etc.) without touching each consuming file. The diagram editor's own local green (`#16a34a` for Save, swatches) already matches this new accent, so no separate reconciliation needed there.

## Icon system

Two deliberately different treatments, matching how a real tactics board actually works:

**Equipment — literal and detailed.** Each icon looks like the real object, not an abstract shape standing in for it:
- **Cone**: solid orange-red triangle with a white horizontal stripe band and a flattened base ellipse.
- **Ball**: white circle outline with a single centered black pentagon (smaller, tightly centered — not the full 32-panel pattern, which was too busy at icon size).
- **Mannequin**: rounded dummy-figure silhouette (head + tapered body) in solid orange.
- **Goal**: bold minimal rectangular frame (3px black stroke, rounded caps/joins, no back panel) with faint light-gray vertical lines suggesting the net, kept subtle so the frame stays the dominant shape.
- **Ladder**: two yellow vertical rails with three evenly-spaced yellow rungs.
- **Pole / flag**: black vertical pole with a small red triangular flag near the top.
- **Wall** (mannequin wall / passive defenders): a gray rounded bar with three small circular "head" dots along the top.

**Players — abstract tactical markers, unchanged from the current build.** Outline circle, filled circle, triangle outline, Ω (omega) — these stay abstract on purpose, matching every real coaching tactics board convention (formation dots, not little people).

**Shapes and arrows — clean geometric, unchanged from the current build.** Square/circle outlines, solid/dashed/wavy arrows with a solid triangular arrowhead, plain line. No literal detail needed here — these are drawing primitives, not equipment.

## Typography

Unchanged. Hubot Sans (bold italic uppercase headlines) and Mona Sans (body) carry over as-is — no complaint was raised about the app's type system, and changing it isn't part of what this redesign is solving.

## Component style reference

The diagram editor is the reference implementation for every value below — new screens copy these, not reinvent them:

- Card: `background: #ffffff`, `border: 1px solid #e4e7ec`, `border-radius: 12–14px`, `box-shadow: 0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)`
- Section label: `11–12px`, `font-weight: 700`, `letter-spacing: 0.08em`, `text-transform: uppercase`, `color: #667085`
- Primary text on light cards: `#101828`
- Secondary text on light cards: `#667085` / `#98a2b3`
- Primary action button (light card context): `background: var(--accent)` (green), white text, `border-radius: 10px`
- Destructive action (light card context): `background: #fef3f2`, `border: 1px solid #fecdca`, `color: #b42318`
- Color swatches (where a coach picks an element color): circular, 32px, `border: 3px solid #101828` when selected with a white inset ring
- Icon + label buttons (tool palette): icon above label, `border-radius: 10px`, armed/active state gets `2px solid var(--accent)` border and a tinted background (`#f0fdf4`)

## Out of scope for this spec

- Applying this system to the drills list, filter panel, forms, planner, or session view — each is a separate follow-up plan.
- Any change to typography, fonts, or the dark shell's own layout/navigation structure.
- Redesigning the player markers, shape tools, or arrow styles — confirmed to stay as already built.
- A style guide / component library page — the diagram editor and this spec together serve as the reference until/unless one is explicitly requested.
