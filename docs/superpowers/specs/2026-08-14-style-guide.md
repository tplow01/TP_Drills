# TP Drills — Style Guide (Chalkboard / Lime)

**Date:** 2026-08-14
**Companion to:** `2026-08-14-navigation-visual-revamp-design.md`

Supersedes the color direction in `2026-08-10-tp-drills-visual-redesign.md` (which specified a near-black `#151515` shell with `#16a34a` pitch green). This replaces that with a lighter, more blue-toned dark shell ("chalkboard") and a brighter lime accent, reserved for accents rather than large fills. Typography direction from the Aug 10 spec (Plus Jakarta Sans headline) is unchanged.

## Color tokens

Named for role, following the existing `globals.css` convention (`--ground`, `--card`, `--ink`, `--accent`, etc.) — these are proposed replacement values for those same token names, not new ones, so existing components that already reference the tokens pick up the new theme without a rewrite.

| Token | Value | Use |
|---|---|---|
| `--ground` | `#161e28` | Outermost shell — nav bars, header |
| `--card-bg` | `#1c2530` | Page/content background |
| `--card` | `#26313f` | Card surfaces (drill cards, session rows, form sections) |
| `--card-border` | `#3d4d5f` | Default card border (dashed on drill/session cards, solid on structural containers) |
| `--ink` | `#f2f4f6` | Primary text, active nav item text |
| `--ink-70` | `#dde6ef` | Secondary emphasis text (e.g. non-active drill row titles) |
| `--ink-45` | `#8fa0b3` | Secondary/meta text (dates, counts, subtitles) |
| `--ink-30` | `#5c6b7a` | Tertiary text (placeholders, disabled, "NO IMAGE") |
| `--ink-muted-nav` | `#7d8794` | Inactive nav tab label |
| `--accent` | `#39d97a` | Lime — accents only, see rules below |
| `--accent-ink` | `#0f151c` | Text/icon color when sitting *on* a solid `--accent` fill (buttons, badges) |
| `--accent-tint` | `rgba(57, 217, 122, 0.12)` | Low-alpha accent background, e.g. theme pill fill |
| `--mat` | `#0f151c` | The near-black mat a drill diagram sits on inside a card |
| `--scrim` | `rgba(0, 0, 0, 0.65)` | Modal/dialog dimming layer (unchanged from current) |
| `--radius` | `10px` | Card corner radius (unchanged) |
| `--radius-sm` | `6px` | Small element corner radius — buttons, chips, mat (unchanged) |

## The accent rule

Lime (`--accent`) is **not** a background-fill color and is **not** used for the active nav-tab text. This was a specific correction during the brainstorm — an earlier draft used lime as the active-tab text color and large solid-lime fills, and it read as too loud. The corrected rule:

- Active nav tab: **white/`--ink` bold text**, with a **lime underline** (desktop) as the only accent touch. On mobile bottom tabs, active state is bold white text alone — no underline needed at that size.
- Lime is used for: small left-border stripes on cards (3px), badges (order-position numbers, "+" add buttons), theme-pill selected state, primary action button fills ("+ Add", "+ Session", "Add" in the drill picker, "Connect"), progress-bar fill, draft-state card border.
- Everything else defaults to white/grey text on the dark slate surfaces. When in doubt, reach for white text over lime.

## Typography

Unchanged from the current app for this pass:
- Headlines (`h1`–`h4`, `.hl`): Plus Jakarta Sans, 700 weight, tight letter-spacing (`-0.01em`), line-height 1.05.
- Body (`.bd`): current body font (Mona Sans per existing `--font-mona`), 500 weight.
- Labels (`.lbl`): small uppercase, 600 weight, 10px, `0.11em` letter-spacing, tertiary ink color.

No new type sizes were introduced by this pass — card titles sit at 13–15px depending on density (grid card vs. detail screen), meta text at 10–11px, section labels at 10px uppercase, consistent with the existing scale.

## Components touched by this pass

**Nav bar** (new — replaces the back-button-only pattern)
- Mobile: fixed bottom bar, `--ground` background, `1px solid #2c3644` top border, two text-only tabs (Sessions, Drills) evenly split, 12–13px, bold+white when active, `--ink-muted-nav` when inactive.
- Desktop: fixed top bar, same background/border, app name left-aligned, tabs to its right with the lime-underline active state.
- No icons in either form for this pass.

**Card** (drill card, session row, team row — one shared visual pattern)
- `--card` background, `1px solid --card-border` (dashed for drill/session content cards, solid for structural panels), `--radius` corners, `10–14px` padding.
- Optional 3px lime left-border in place of the default border to mark "this needs attention" (a scheduled/current drill in a session builder) or draft state.

**Badge / pill**
- Filter and team chips: pill shape (`20px` radius), `--card` background + `--card-border` outline when unselected, solid `--accent` fill + `--accent-ink` text when selected.
- Order-position badge (add-drill grid): 20px circle, `--card-border`-grey fill showing "+" when not added, solid `--accent` fill showing the position number once added.

**Button**
- Primary (filled): `--accent` background, `--accent-ink` text, `6px` radius, bold, compact padding (`5–8px` vertical).
- Secondary (outline): transparent background, `1px solid --card-border`, `--ink-70` text.

**Progress bar** (session target-minutes tracker)
- `4px` height track in `--card-border`, `--accent` fill, `2px` radius.

## What this style guide does not cover

- Icon design (no icons in this pass by decision).
- The drill detail page and Home/hub page — not restyled or shown during this brainstorm; apply these same tokens/component patterns when that work happens, rather than inventing new ones.
- Any animation/motion spec.
