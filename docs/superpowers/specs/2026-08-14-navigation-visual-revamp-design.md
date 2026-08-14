# TP Drills — Navigation & Visual Revamp

**Date:** 2026-08-14
**Status:** Approved, ready for implementation planning
**Scope:** Top-level navigation, information architecture, visual system, and the Sessions/Drills/Team screens. Drill-creation UX (the diagram editor and drill authoring flow) is explicitly out of scope for this pass — it stays as-is.

## Problem

The current app is a strict hub-and-spoke: no persistent navigation, just a back button, with an original "never more than 2 levels deep" rule. In practice that rule is already broken (`drills/[id]/diagrams/[diagramId]/edit` is 4 levels deep) without anything replacing it — every screen is effectively a dead end unless you retrace your steps to `/`. On top of that, Sessions, Planner, and Schedule exist as three separate routes for what is conceptually one thing, `/sessions` has no list page at all, and the dark-shell/green-accent visual direction from the Aug 10 redesign spec was only ever applied to the diagram editor.

## Information architecture

Two persistent top-level sections, not three:

- **Sessions** — the merged Schedule + Planner + session-detail area. This is the default/primary destination.
- **Drills** — the drill library (unchanged in this pass).

**Home is not a nav tab.** There is no dedicated hub screen driving navigation; the app opens straight into Sessions.

**Team is not a nav tab either.** Team management (creating a team, seeing its roster grouping, its own schedule) lives *inside* Sessions — reached via team filter chips and a team detail screen — not as a third persistent destination. This was a deliberate simplification: coaches don't think of "my team" as separate from "my sessions," they think of sessions as belonging to a team.

### Persistent nav

A real, always-visible nav — bottom tabs on mobile, a top bar on desktop — with exactly two items: **Sessions**, **Drills**. Text labels only, no icons (icons can be added later once a style is chosen; text-only avoids picking icons prematurely). This replaces the back-button-only pattern entirely on the two top-level screens; sub-screens (session detail, add-drill, team detail) still use a back control to their parent, same as today.

### Multi-tenancy model

Each coach's teams and sessions are **entirely private data** — there is no shared/collaborative editing between coaches. "Other coaches will use it" means the app supports multiple independent coach accounts, not that coaches share a workspace. This has a real implication for later implementation work (auth, row-level data scoping) but does not affect this navigation/visual pass directly.

## Visual system

Full direction: **dark "chalkboard" shell with a bright lime accent used sparingly.**

- Shell/chrome background: dark slate-blue (`#1c2530` content areas, `#161e28` nav/header bars) — not pure black, not the original near-black `#151515`/`#1f1f1f`.
- Content cards: `#26313f`, dashed `1px #3d4d5f` border by default.
- Text: white/near-white (`#f2f4f6`) for primary content and the active nav item — **not** the accent color. Muted slate-grey (`#8fa0b3`) for secondary text, `#5c6b7a`/`#7d8794` for tertiary/inactive.
- Accent: bright lime `#39d97a` (not the more muted `#16a34a` pitch green from the Aug 10 spec — that read as too muted against the new dark slate). Used only for: small left-border stripes on cards, active-tab underline, theme-pill selected state, primary action buttons ("+ Add", "+ Session", "Connect"), order-position badges, progress bars.
- No icons for now — text-only labels throughout nav and controls until an icon set is chosen deliberately.
- Typography and fonts are unchanged from the existing app for this pass (Plus Jakarta Sans headline / current body font) — only color and layout are revised.

See the companion style guide (`docs/superpowers/specs/2026-08-14-style-guide.md`) for exact tokens.

## Screens

### Sessions (primary/default screen)

A single chronological timeline — **not** grouped by status/action-needed buckets (an earlier draft grouped by "Needs a plan / Ready / Reflect," which was rejected: the coach doesn't want reflection surfaced as a workflow step at all). Grouped by date instead: past dates (dimmed), a highlighted "Today" section, upcoming dates, and an "Unscheduled" group at the bottom for sessions with no date.

- **Team filter chips** across the top ("All teams", then one chip per team), horizontally scrollable.
- **"+ Team" and "+ Session" actions sit together** in the header, always visible — this was a specific fix from the brainstorm: earlier drafts buried these and it wasn't obvious how to add a team or session at all.
- Each session row shows: team name, date/time, drill count, planned minutes. A session with 0 drills gets a small "Needs a plan" indicator, but this is a per-row detail, not a whole-screen organizing principle.
- **Reflection is de-emphasized to the point of not being modeled as a distinct required step** in this pass — no "Reflect" section, no forced prompt. (Whether it comes back later as a fully optional, quiet link on a past session is left open — not decided in this design.)

### + Session flow

Tapping "+ Session" opens a small choice between two paths:

1. **Create manually** — set team, date, time, target minutes yourself (this is the existing Planner/session-creation flow, restyled).
2. **Paste a calendar link** — subscribe to an external calendar feed (ICS/webcal URL, e.g. a club fixture list). This is a **per-team subscription**, not a one-time import: once connected, new events on that feed continue to create sessions automatically, kept in sync. If a team already has a feed connected, this option shows "Already connected — manage" instead of asking again. This is new scope beyond the original visual-redesign spec and will need its own data model (a stored feed URL + sync state per team) and a background/on-demand sync mechanism — flagged here for the implementation plan, not designed in detail in this pass.

### Session detail

- **Title is the team name** (e.g. "Falcons"), not a free-text session name — an earlier draft used an editable title like "Match prep" and it was dropped in favor of team name.
- Subtitle: date, time, target minutes.
- **Session theme**: a new multi-select chip row (e.g. Possession, Finishing, Defending, Fitness) describing what the session is about, on a single horizontally-scrollable row, with a "+" to add a theme. This is new — themes did not previously exist as a concept on sessions (or on drills; see below).
- Drill list, ordered, each row showing position number, name, duration, and its theme.
- "+ Add drill" opens the add-drill flow described below.

### Add-drill flow

Builds on the flow already implemented (`/drills?session=<id>`, `DrillsBrowser`'s session tray) — this pass restyles and refines it, not rebuilds it:

- Search box, plus the existing filter panel (age band, duration, players) — reachable via a "Filters (n)" chip.
- **No outfield/goalkeeping toggle.** The session already has a known type (see open question below on how that's set), so the grid only ever shows the relevant pool.
- 2-column grid of drill cards (restyled per the new drill-card design below), defaulting to drills matching the session's selected theme(s) first, without excluding others.
- Tapping a card's body previews the drill without navigating away; tapping the **numbered badge** in the corner adds it. The badge shows the drill's **order position in the session** (1, 2, 3…), not a generic checkmark — tapping an already-added badge again removes it and renumbers the rest.
- A sticky bottom bar tracks drills added and minutes toward the session's target, with a progress bar.
- The action button is labeled **"Add"**, not "Done".

**Open question for implementation planning:** how a session's type (outfield vs. goalkeeping) is determined — set explicitly at session creation, or inherited from the team — was raised during the brainstorm but not resolved. Needs a decision before this flow can be fully specified.

### Drill card (grid, in both `/drills` and the add-drill flow)

Stripped down from the current card (which shows type label, age band, duration, players, bibs, and usage stats all stacked):

- Diagram/image, enlarged to be the dominant visual element (image_url on an ink-black mat, same pattern as today).
- Drill type (Outfield/Goalkeeping) on the left of a single meta row below the title — redundant with the outfield/goalkeeping toggle when that toggle is present (as on `/drills`), but still useful as at-a-glance context.
- Title on its own line.
- One row below the title: **type · players needed · duration · theme**, all inline, separated by middle dots. Theme rendered as the accent-colored element in that row.
- Age band, bibs-needed, and usage stats (times used / rating) **move to the drill detail page only** — no longer shown in the grid.
- Draft state: a "Draft — needs finishing" label replaces the meta row (not an additional line).

**New data model need:** "theme" as a field does not currently exist on `Drill` (there's only a generic `tags: string[]`) or on `Session`. Both the drill card and the session detail screen depend on it. This needs a real schema field (or a small fixed taxonomy, similar to `age_band`) — flagged for the implementation plan, not decided here beyond "it's a short single label, e.g. Possession/Finishing/Defending/Fitness."

### Team screen

Reached by tapping a session's team, not from a persistent nav tab.

- Team name, type (Outfield/Goalkeeping), age band.
- "+ Session" and "Edit team" actions.
- Its own upcoming/past session list (same row style as the Sessions screen, scoped to this team).
- **No player roster in this pass** — a team is a grouping label (name + age band + type), not a set of tracked individual players. Room is left for a roster to be added later, but it is not part of this design.

## What's explicitly not in this pass

- Drill-creation/editing UX (the diagram editor, drill authoring forms) — deferred to a follow-up pass, per the original request.
- Player rosters within a team.
- Any decision on whether/how reflection returns as an optional feature.
- Auth/permissions implementation for multi-coach accounts (the private-per-coach data model is assumed, not built here).
- Icon set for the nav and buttons (deliberately text-only for now).
- The Home/hub page's fate in detail, and the drill detail page's own restyle — not explored visually in this brainstorm; will need a pass during implementation to stay consistent with the rest of this design.

## Style reference

Colors, type, spacing, and component tokens are captured separately in `docs/superpowers/specs/2026-08-14-style-guide.md` so they can be referenced independently of this design's narrative.
