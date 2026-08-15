# Schedule Redesign — Design

## Context

The Sessions IA shipped 2026-08-14 (calendar-first, month grid default) doesn't hold up in practice: the month grid can't handle multiple sessions on one day without either cramming chips into a growing cell or truncating text illegibly, and a month grid isn't actually what you want to land on day-to-day — you want to see what's coming up next. This is a deliberate scrap-and-redo of the Sessions browsing shell, not an iteration on it. Renamed to **Schedule** to match how it's actually used: a schedule of sessions, not a generic calendar widget.

Equally important: this must be excellent on both mobile and desktop — mobile is not the priority at the expense of desktop. The visual skin (colors, type, card/chip styling, spacing tokens in `globals.css`) stays as-is; this is a structural/IA change, not a visual redesign.

Explicitly out of scope: the Drills section (filterable library, quick-add) and the session builder/drill-picker drawer inside a session — both already work well and are untouched by this redesign.

## What is it?

The Schedule tab replaces the month-grid-first Sessions screen with an agenda-first view: an unbounded, scrollable list of sessions grouped by date, with a lightweight month grid available as a secondary "glance ahead / jump to a date" toggle. The month grid shows a dot per day with something scheduled — never session names or times — so a day with five sessions renders exactly like a day with one.

## The problem

The month grid tries to be both an overview and a detail view at once: cramming session chips into fixed-height day cells breaks down the moment a day has more than one or two sessions, and it's not actually the view a coach wants to land on — "what's happening in the next couple weeks" is inherently a list, not a grid. The grid's job should only ever be "is anything happening around this date, and let me jump there" — never "show me the details right here."

## How it works

1. Coach opens **Schedule** (`/sessions`) → lands directly on the agenda: **Today** first, then dated groups going forward, **Past** collapsed at the top (tap to expand), **Unscheduled** at the bottom. Each date header can have any number of session rows under it — no layout constraint from the grouping itself.
2. The existing Agenda/Month pill toggle switches to **Month** view: a standard month grid, each cell just a date number plus a dot if anything's scheduled that day. Tapping a populated date scrolls the agenda (still mounted, same scroll container) to that date's group. Tapping an empty date goes to `/sessions/new?date=<date>`, same as today.
3. **+ Session** and **+ Team** stay as header actions on the Schedule screen, same entry points as already built.
4. Opening a session, adding drills via the inline picker drawer, and everything under **Drills** — unchanged from the current build.

## Key design decisions

- Reuse `groupSessionsByDate`, `listSessions`, `listSessionsInWindow`, and the whole Supabase/SQL layer as-is — this is a component/IA rework, not a data model change.
- The month grid must never render per-session text (names, times, "Needs a plan" labels) inside a cell — a dot only. That's what makes multi-session days a non-issue instead of a layout problem to solve.
- Desktop and mobile are equally first-class. The agenda stays a single column at a comfortable max-width on desktop (not full-bleed, not a new two-column layout) — consistent with the existing skin. The month grid must be genuinely usable at both a 375px phone width and a full desktop width, not mobile-first-then-degrade.
- Visual styling stays as the existing dark theme / CSS-variable system in `globals.css` — reuse existing classes and tokens (`.session-row`, `--card`, `--hairline`, etc.) rather than introducing a new visual language. This is a skin touch-up, not a redesign.
- `SessionsCalendar.tsx` / `CalendarDayCell.tsx` (the chip-grid month view shipped 2026-08-14) are deleted outright, not patched — the dot-grid is a different enough component that patching would leave dead code paths.

## Components

- **Deleted:** `SessionsCalendar.tsx`, `CalendarDayCell.tsx`.
- **New:** `MonthOverview.tsx` (dot-grid month view, month nav), `MonthDayDot.tsx` (one cell).
- **Kept, promoted to default:** `SessionsTimeline.tsx` / `SessionRow.tsx` / `groupSessionsByDate` — gains a collapsible Past section (new behavior, currently always-expanded).
- **Kept as-is:** `ViewToggle.tsx` (same Agenda/Month text-label pill toggle already built — it already reads fine at both desktop and phone widths, no icon treatment needed), `ManualSessionForm.tsx`, `InlineDrillPicker.tsx`, `SessionBuilder.tsx`, everything under `src/components/drills/`.
- **Untouched:** all of `src/lib/` except whatever `MonthOverview` needs from `dates.ts` (`monthGrid` etc., already built and reusable) and `sessions-server.ts` (`listSessionsInWindow`, already built and reusable).

## Success criteria (prototype)

- Landing on `/sessions` shows the agenda immediately — no month grid on load.
- A day with 3+ sessions displays as 3+ ordinary rows under one date header, no visual strain.
- The month toggle shows dots only, never truncated or cramped text, at both a 375px and a full desktop width.
- Tapping a populated date in month view brings that date's agenda group into view; tapping an empty date opens the new-session form prefilled with that date.
- Drills section and session builder behavior are unchanged — a regression check, not a target.
