# Teams, BYGA calendar import, and schedule polish — design

## Context

Four related gaps in the Teams/Sessions area, bundled into one pass:

1. Team age bands already support U12-U14/U15-U18 in the UI (`TeamForm.tsx` already lists all four `AGE_BANDS`) — this was silently blocked only by the missing `age_band` enum values, now applied. **No design or code change needed here**, confirmed working end to end.
2. A team's color is currently auto-assigned by its position in the team list (`team-colors.ts`, index-based, no persistence) — there's no way to choose or keep a specific color for a specific team.
3. `Team.calendar_url` and the paste-a-link UI (`CalendarConnect.tsx`) already exist, but nothing fetches or parses the feed — importing BYGA fixtures into actual sessions was explicitly deferred when that piece was built.
4. The Schedule's day view only steps one day at a time; on an empty day there's no way to jump straight to the next day that actually has something planned.

Plus one unrelated visual fix: on desktop, the vertical divider between the Teams sidebar and the main Sessions content stops at the content's height instead of running the full column — because the containing flex row's height is only ever as tall as its (often short) content, so an empty schedule shows a divider that visibly stops partway down the page.

## 1. Team color

**Storage:** add `color text null` to `team`. `null` means "no color chosen — fall back to the existing index-based assignment," which keeps every team created before this change behaving exactly as it does today with zero migration of existing rows.

**Picker:** `TeamForm.tsx` gains a color field — the same 8-swatch palette already defined in `team-colors.ts`'s `TEAM_COLORS`, rendered as clickable circles (matching the existing swatch look already used in `ScheduleSidebar`). Pre-selected to whichever palette color isn't yet used by any existing team (falls back to the first color if all 8 are already taken) — a sensible default the coach can just accept, or click a different swatch. Selection is required to submit, same as name.

**Resolution order:** `teamColorMap(teams)` changes its signature from `{ id: string }[]` to accept the full `Team` shape (`{ id: string; color: string | null }` is enough), and resolves each team's color as `team.color ?? teamColor(index)` — chosen color wins, index-based cycling is the fallback for teams that predate this feature. Every call site (`ScheduleSidebar`, `SessionRow`, `DateSection`, `MonthDayDot` via `sessions/page.tsx`) already receives full `Team` objects or the resulting map, so this is a resolution-logic change inside `team-colors.ts`, not a call-site rewrite.

## 2. BYGA calendar import (ICS)

**Format:** a standard ICS/webcal feed URL — the existing `CalendarConnect.tsx` already assumes this (`placeholder="webcal://…"`).

**Trigger:** manual only. A "Sync now" button appears wherever a team's calendar is already connected (replacing/augmenting the current static "● Connected" state in `CalendarConnect.tsx`). No background job, no cron — the coach taps it whenever they want fresh fixtures pulled in.

**Fetch + parse:** BYGA's server is not expected to allow a browser to fetch its ICS feed directly (no CORS headers on most calendar hosts), so this needs a server-side round trip. New Next.js Route Handler `POST /api/teams/[id]/sync-calendar`: loads the team's `calendar_url`, fetches the ICS text server-side (no CORS restriction from server to server), parses it with a small dependency (e.g. `node-ical`), and writes new sessions using the same Supabase anon-key client pattern already used everywhere else in this app (no service role needed — RLS already permits these writes from client code, and a Route Handler can use the same client).

**Dedup — new column:** add `external_uid text null` to `session`, plus a partial unique index `(team_id, external_uid) where external_uid is not null` so the same fixture can never double-import for the same team even under a race (two syncs firing close together). Each `VEVENT`'s `UID` property maps here.

**Mapping an event to a session:**
- `SUMMARY` → `name`
- `DTSTART` date/time → `date` (`YYYY-MM-DD`) / `start_time` (`HH:MM:SS`)
- `DTEND - DTSTART` → `target_minutes` (rounded to the nearest minute); if `DTEND` is absent, fall back to the session form's existing default target duration
- `LOCATION` → `location`
- `team_id` → the team being synced
- `library`/`age_band` → the team's own `library`/`age_band` (a session already inherits this shape elsewhere in the app)
- `themes` → `[]` (nothing in an ICS event maps to drill-type themes; the coach can add them same as any manually-created session)
- `external_uid` → the event's `UID`

**Create-only, never overwrite:** on each sync, only `UID`s not already present for that team become new sessions. An event whose `UID` already has a matching session is skipped entirely — even if its `SUMMARY`/`DTSTART`/`LOCATION` changed upstream. Once imported, a session is the coach's to edit; sync will never touch it again. This is a deliberate simplicity choice: it means a rescheduled BYGA fixture requires a manual date edit in the app after syncing, but it guarantees sync can never silently overwrite drills/notes the coach has already added.

**`calendar_synced_at` semantics correction:** today `connectCalendar` stamps this the moment the URL is saved, before any fetch happens — misleading, since no sync occurred yet. This changes: `connectCalendar` (saving the URL) no longer touches `calendar_synced_at`; only a successful sync-now call stamps it (with the count of newly-created sessions available to show the coach, e.g. "Synced just now — 3 new sessions").

**UI:** `CalendarConnect.tsx` gains a post-connect state showing "Sync now" (instead of the current static "● Connected" dead end), a last-synced timestamp once at least one sync has run, and the created-count feedback after each sync.

## 3. Day view: skip to next session

`DayView.tsx`'s empty state ("Nothing planned this day.") gains a "Skip to next session →" link/button beneath it, shown only when `sessions.length === 0`. It queries forward from the current date (server-side, alongside the existing `listSessionsInWindow` calls in `sessions/page.tsx`) for the nearest future date with at least one session (respecting the active team filter, same as the rest of the day view) and links straight to that date via the existing `sessionsHref` pattern. If no future session exists at all (nothing left in the schedule), the button doesn't render — same as today's plain empty state.

## 4. Sidebar divider full-height fix

`src/app/sessions/page.tsx`'s outer row (`<div style={{ display: 'flex', alignItems: 'stretch' }}>`) only stretches its `<aside>` to match its sibling's natural content height — on a mostly-empty schedule (e.g. "Nothing planned this day"), that's short, so the `border-right` divider visibly stops partway down the page instead of running to the bottom of the viewport. Fix: give the outer row a `minHeight` tied to the viewport (`calc(100vh - <header height>)`, matching the pattern the app's other full-height layouts already use for their top nav) so the divider always reaches at least the bottom of the screen on desktop, regardless of how little content either column has. Mobile is unaffected — this row already isn't a persistent side-by-side layout there (`ScheduleMobileTeamsTrigger` handles the sidebar content separately on narrow screens).

## Data model changes

- `team.color text null` (additive, no backfill — existing rows resolve via the existing index-based fallback).
- `session.external_uid text null`, plus a partial unique index `(team_id, external_uid) where external_uid is not null`.
- New dependency: a small ICS-parsing library (e.g. `node-ical`).
- New route: `src/app/api/teams/[id]/sync-calendar/route.ts`.

## Testing

- Pure-logic unit tests: `teamColorMap`'s new resolution order (chosen color wins, falls back to index-based `teamColor` for `null`); the ICS-event-to-`SessionInput` mapping function (summary/start/end/location → name/date/start_time/target_minutes/location), including the `DTEND`-absent fallback; the "next date with a session" lookup used by the skip-to-next-session button.
- Manual QA: create a team, confirm the color picker pre-selects an unused swatch and the chosen color shows consistently across the sidebar key, session rows, and month dots; connect a calendar, sync, confirm new sessions appear with the right fields and re-syncing doesn't duplicate them; edit an imported session's drills, sync again, confirm it's untouched; visit an empty day and confirm the skip-to-next-session link jumps to the correct date and respects the active team filter; resize to desktop width on a day with no sessions and confirm the sidebar divider now reaches the bottom of the viewport.

## Out of scope

- Automatic/scheduled re-sync (manual-only, per decision above).
- Any handling of ICS recurrence rules (`RRULE`) beyond what the parsing library resolves into individual `VEVENT` instances by default — if BYGA's feed uses recurring events and the library doesn't expand them automatically, that's a follow-up.
- Updating/reconciling an already-imported session when its source event changes upstream (explicitly deferred — create-only for this pass).
- A "disconnect calendar" flow (not requested; `calendar_url` can still be edited at the database level if ever needed).
- `byga_url` (a separate, unused legacy field on `team` predating `calendar_url`) — untouched, out of scope, and not read or written anywhere in the app today.
