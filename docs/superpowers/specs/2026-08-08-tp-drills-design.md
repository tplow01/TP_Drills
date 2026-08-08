# TP Drills — Coaching Hub

**Status:** Design approved. Ready for implementation planning.
**Date:** 2026-08-08
**Owner:** Coach (single user, no auth)
**Supersedes:** `TP_Drills.md` (original PRD). Where the two disagree, this document wins.

---

## 1. Problem and goal

Coaching sessions are planned from memory, scattered notes, saved social posts and course PDFs. Drills are forgotten, repeated too often, or reinvented weekly. There is no record of what worked.

The goal is not to store drills. It is to plan better sessions and improve as a coach over a season, across two contexts: **youth outfield teams** and **goalkeeper sessions** (all ages).

The app is a coaching hub. It opens on the week ahead, not on a database.

## 2. Success measures

| Goal | Measure |
|---|---|
| Drills are captured, not lost | Library reaches 25+ drills by week 6 |
| The right drill is findable fast | Filter to a shortlist in under 30 seconds |
| Sessions are planned here, not on paper | 80%+ of sessions built in the app after month 1 |
| A week's commitments are visible in one place | Hub shows all teams' sessions and fixtures together |
| Coaching improves, not just organisation | 50%+ of used drills carry a post-session note |

## 3. Non-goals

Video hosting. Drag-and-drop pitch diagram editor (photos cover this). Sharing with other coaches or any multi-user feature. Player registers, attendance or individual player tracking — a team is a planning label, not a roster. In-session timer or whistle. Login and accounts. Full offline support. Manual fixture entry. Editing synced fixtures. Fixture results or score tracking.

## 4. Users and context

One user, two contexts, one app:

- **Planning** — laptop, at home. Building sessions, browsing widely, writing coaching points.
- **Pitchside** — phone, outdoors, one hand, possibly wet or cold. Reading a plan. Large targets, minimal typing, high contrast.

**There is no pitchside mode.** The session view *is* the pitchside artefact and is built that way on every device. Every other screen is a normal responsive planning surface. Nothing to toggle, no state to persist, no way to be caught outdoors in the wrong mode.

## 5. Core structure

### 5.1 Two libraries

Outfield and Goalkeeping have separate type taxonomies and separate age rules. They share one Drills screen, split by a segmented control.

**The segment does not persist.** Every visit to Drills opens on Outfield. This is deliberate: a remembered mode means opening the app into a library you selected days ago without noticing.

### 5.2 Drill types (single-select, exactly one per drill)

**Outfield:** Warm-up · Passing · Dribbling · Shooting · Finishing · Defending · Possession/Rondo · Small-sided game · Fun game/Cool-down

**Goalkeeping:** Warm-up/Handling · Shot stopping · Footwork · Distribution · Dealing with crosses · Positioning · Reactions · 1v1s

### 5.3 Age handling

- Outfield drills **require** an age band: `U6-U8` | `U9-U11`. The enum is structured so `U12-U14` and `U15+` can be added later without migration.
- Goalkeeping drills have **no age band**. Optional free-text `suitable_from` instead (e.g. "confident divers only"). Display-only, never a filter.

### 5.4 Fixed rule

**A drill's library is permanent.** No moving a drill between Outfield and Goalkeeping after creation.

---

## 6. Information architecture

### 6.1 No navigation bar

A hub and a nav bar are the same feature — both exist to reach the same handful of places. The app has a hub, so it does not have a nav bar.

Every screen carries a persistent **← Hub** control top-left. Nothing is more than two levels deep, so back always resolves toward the hub rather than unwinding a long history stack.

The one lateral move that would otherwise justify a nav bar — browsing drills while planning a session — is handled in context by the session tray (§7.4), not by navigation.

### 6.2 The hub

Opens on **Coaching** and today's date, then:

1. **Next few days** — a preview of the schedule: dated sessions and Byga fixtures interleaved, chronological, with a today marker. Each row carries one state tag and opens that session.
2. **Full schedule →** — opens the Schedule screen.
3. **Two door cards** — *Drills* (with library counts) and *Planner* (with a live count of sessions needing plans).

The Planner door's count is how the hub surfaces outstanding work. There is no separate "needs attention" section; work is expressed by the state tag on each row and by that count.

### 6.3 Screen inventory

| Screen | Notes |
|---|---|
| Hub | Home. Schedule preview plus two doors. |
| Schedule | Full timeline, past and future, filterable by team. |
| Drills | One list, segmented Outfield/Goalkeeping. |
| Drill detail | Full fields, edit, delete, add-to-session, and the reflection history for this drill (every past rating and note from `SessionDrill`, with its session and date). |
| Add/edit drill | Quick and full modes. |
| Planner | Sessions list plus builder, one screen. |
| Session view | Pitchside and print. One component, two stylesheets. |
| Session review | Post-session ratings and notes. |
| Settings | Teams (incl. Byga URLs), JSON export. Behind the gear icon. |

Nine screens against the PRD's ten, but not by simple reduction: a Hub is added; *Team detail* is removed (it is the Schedule filtered by team); *Sessions list* and *Session builder* merge into the Planner; *Print view* merges into the Session view; *Teams* demotes into Settings.

---

## 7. Features

### 7.1 P0 — Drills: browse, filter, sort

Filters combine with AND; multi-select within an axis is OR.

- **Type** — multi-select, per the active library's taxonomy
- **Age band** — outfield only
- **Duration** — ≤10 / 10–20 / 20+ mins
- **Players today** — numeric entry, N
- **Free-text search** — name, tags, setup, how_it_works

**Filters live in a panel**, not inline with results: a left sidebar on desktop, a `Filters · N` bottom sheet on phone. The results area shows only the segment, search field, a one-line active-filter summary with result count and Clear all, and the drills themselves.

**Sort** sits at the foot of the filter panel, independent of filters: by duration or by minimum players, ascending or descending.

Equipment is never a filter — display only (§7.5).

**Players filter predicate.** The PRD's rule (`players_min ≤ N`) is wrong: it shows a drill capped at 8 when you have 20. Correct behaviour:

```
players_min <= N AND (players_max IS NULL OR players_max >= N)
```

**Acceptance criteria**
- Active filters visible in the summary line, individually clearable, plus Clear all
- Result count always shown
- Filter and sort state persists navigating into and out of a drill
- Empty results offer to clear the most restrictive filter, not only Clear all
- Incomplete drafts appear as a pinned row at the top of the list, not mixed into results

### 7.2 P0 — Capture a drill

Two tiers:

- **Quick add** — name, type, free-text blob. Saves instantly as a draft. A persistent `+ Quick add` button on the Drills screen, reachable in one tap.
- **Full add** — all fields. Coaching points are a repeating list, not one text box.

**`coaching_points` is required, minimum one entry.** This is the one deliberately opinionated constraint: a drill without coaching points is an activity, not a session component.

A draft missing required fields is saved and marked incomplete. It cannot be added to a session until completed. Nothing is lost if the form is closed mid-entry.

### 7.3 P0 — Photo attachment

One image per drill: screenshot, photo of a page, photo of a hand-drawn diagram.

- Add from camera or photo library, one tap from the drill form
- Client-side compression on upload: longest edge ~1000px, JPEG ~q0.7, target under 150KB
- Replaceable and removable; included in JSON export
- **Thumbnails render contained inside a fixed cream (`#f3f0ea`) tile.** Source images are overwhelmingly white paper; without a mat, a grid of them flares against the dark UI. Full-size view is unmodified.

### 7.4 P1 — Planner

One screen, two panes. Sessions list on the left — unplanned first, then planned, then past — with **+ New session** pinned at the top so creating and continuing are the same motion. Builder on the right. On phone this is list-then-builder, one at a time.

- Add drills from the library; reorder by drag or up/down
- Per-drill duration override, which **never** mutates the drill's own default
- Running total against `target_minutes`, warning when over
- Save as a named session; duplicate a past session as a starting point
- Optional link to a team, which pre-fills library and age band
- **A completed session remains fully editable** — no lock on drills, order or date

**Session tray.** Opening Drills *from* the Planner carries a tray: a right rail on desktop, a docked bar on phone, showing the session being planned, its drills, and running time. Each drill card gains a `+` to add it directly. Arriving at Drills any other way, the tray and the card `+` buttons are absent — the library does not permanently wear session-builder furniture.

### 7.5 Equipment

Three display fields, never filters: `goals_needed` (int), `cones_needed` (int, rough), `bibs_needed` (bool). Player counts are covered by `players_min` / `players_max`.

### 7.6 P1 — Teams and schedule

- Create a team: name, library, age band (youth only — GK teams have no age band), Byga URL. Lives in Settings.
- No player roster, no recurring-slot field. "When" comes entirely from dated sessions and synced fixtures.
- **Schedule** shows every dated session and every synced fixture across all teams, chronological, anchored on today, filterable by team. Filtering to one team replaces the PRD's Team detail screen.

### 7.7 P1 — Byga fixture sync

Byga publishes a per-team, read-only ICS subscription link (in-app under Subscribe/Export). No API approval needed. Confirmed available.

- One Byga URL per team, entered once in Settings
- **Fetched server-side by a Vercel cron route**, not a Supabase scheduled function — the app is Next.js, so this keeps the parser in one codebase and debuggable locally. Browsers cannot fetch cross-origin calendar feeds; the frontend only reads stored rows.
- Parses date, opponent, time and location into `Fixture` rows
- **Not real-time.** Expect 12–24h lag, matching Byga's own downstream behaviour. Adequate for "do I have a game this week", not for matchday changes.
- Read-only: no editing, no manual entry, no results

### 7.8 P1 — Session completion and reflection

**Sessions auto-complete.** Any dated session whose date has passed is complete. There is no "session done" button — nothing to remember on a cold pitch, and no session silently stuck in "planned" forever. Undated sessions never auto-complete.

A completed session shows the **Reflect** tag until reflection is done or dismissed, tracked by `reflected_at`.

Reflection is one prompted, skippable screen: rate each drill 1–5, add a per-drill note, add an overall session note.

### 7.9 P1 — Session view (pitchside and print)

One component. Ordered drills with durations, setup, coaching points, the running drill marked in orange. Large type, minimal chrome, high contrast — built for daylight and one hand on every device. A print stylesheet produces the clean single-page layout; there is no separate print screen.

### 7.10 P2 — Later, not v1

Drag-and-drop pitch diagram editor, if photos prove insufficient. Multiple images per drill. Duplicate a drill as a variation. "Not run recently" surfacing. Additional age bands. Manual fixture entry, if Byga falls short.

---

## 8. Design system

**Stack-level:** Next.js (App Router) on Vercel, Supabase Postgres, Supabase Storage.

**One dark palette everywhere.** There is no light mode and no per-context theme.

| Token | Value | Use |
|---|---|---|
| `ground` | `#151515` | Page background |
| `card` | `#1f1f1f` | Cards, rows, panels |
| `ink` | `#f3f0ea` | Primary text; photo mats |
| `accent` | `#f15e22` | Live, earned or actionable only |

Orange is rationed. It marks the next thing, the active filter, the running drill, derived stats and the primary action — never decoration.

**Type.** Hubot Sans Extra Bold Italic for headlines: uppercase, letter-spacing ~-0.035em, line-height 0.92. Mona Sans Medium for body. Both self-hosted as variable woff2 via `next/font/local` — no external font request in production.

**Libraries are not visually differentiated.** Outfield and Goalkeeping share the system entirely; the active segment and the type chips carry the difference. Adding a second accent would compromise a deliberately two-colour brand for a distinction the screen already states in words.

**State tags** — five, and the tag is the call to action:

| Tag | Meaning | Treatment |
|---|---|---|
| Ready | Dated, has drills | Solid orange |
| Plan it | Dated, no drills | Orange outline |
| Reflect | Past, not yet reflected on | Orange tint |
| Fixture | Byga fixture | Grey, recedes — context, not work |
| No date | Session without a date | Muted |

---

## 9. Data model

Changes from the PRD are marked.

```
Drill
  id                uuid pk
  library           enum('outfield','goalkeeping')   not null
  name              text                             not null
  type              enum (per library's list)        not null
  age_band          enum('U6-U8','U9-U11')           outfield only
  suitable_from     text                             GK only, free text
  duration_mins     int                              not null
  players_min       int                              not null
  players_max       int                              nullable = no upper limit
  goals_needed      int      default 0
  cones_needed      int      default 0
  bibs_needed       bool     default false
  image_url         text                             nullable, Supabase Storage
  setup             text                             not null
  how_it_works      text                             not null
  coaching_points   text[]                           not null, min 1 entry
  progressions      text                             nullable
  source            text                             nullable
  tags              text[]                           nullable
  is_draft          bool     default false
  deleted_at        timestamptz                      nullable          -- ADDED
  created_at        timestamptz  default now()
  updated_at        timestamptz  default now()
  -- REMOVED: rating, notes, times_used  (see §10)

Team
  id                uuid pk
  name              text                             not null
  library           enum('outfield','goalkeeping')   not null
  age_band          enum('U6-U8','U9-U11')           youth teams only
  byga_url          text                             nullable
  created_at        timestamptz  default now()

Fixture
  id                uuid pk
  team_id           uuid fk -> Team                  not null
  opponent          text                             not null
  date              date                             not null
  time              time                             nullable
  location          text                             nullable
  source            enum('byga')  default 'byga'
  synced_at         timestamptz

Session
  id                uuid pk
  team_id           uuid fk -> Team                  nullable
  name              text                             not null
  library           enum('outfield','goalkeeping')   not null
  date              date                             nullable
  start_time        time                             nullable          -- ADDED
  location          text                             nullable          -- ADDED
  target_minutes    int      default 45                                -- ADDED
  age_band          enum('U6-U8','U9-U11')           nullable
  session_notes     text                             nullable
  reflected_at      timestamptz                      nullable          -- ADDED
  created_at        timestamptz  default now()
  updated_at        timestamptz  default now()
  -- REMOVED: status  (derived, see §10)

SessionDrill
  id                uuid pk
  session_id        uuid fk -> Session               not null
  drill_id          uuid fk -> Drill                 not null
  position          int                              not null
  duration_override int                              nullable
  rating            int (1-5)                        nullable
  note              text                             nullable
```

### Deletion

**Soft delete only.** Drills are never hard-deleted. Library queries filter `deleted_at IS NULL`; session joins do not, so historic sessions keep resolving the full drill and render it marked *removed from library*.

Deletion requires confirmation, and the confirmation states the consequence — "used in 3 sessions, they'll keep it" — not a generic warning.

The PRD's alternative (snapshot columns on `SessionDrill`) is dropped: it duplicates most of the Drill schema into the join table and forces two code paths in the print view.

---

## 10. Derived state

Three things the PRD stored are computed instead. Each was a drift risk, and §7.4's "completed sessions remain fully editable" makes drift near-certain.

**`drill_stats` view** — supplies `times_used` and `avg_rating` per drill, counting `SessionDrill` rows joined to completed sessions. Drill cards and rating-sort read the view. Un-completing or editing a past session corrects the numbers automatically.

**Session status** — derived from date, drill count and `reflected_at`:

| Condition | Status |
|---|---|
| `date IS NULL` | No date |
| `date >= today` and no SessionDrill rows | Plan it |
| `date >= today` and has drills | Ready |
| `date < today` and `reflected_at IS NULL` | Reflect |
| `date < today` and `reflected_at IS NOT NULL` | Done |

**Planner door count** — sessions in *Plan it* state.

---

## 11. Edge cases

- **Empty library, first run** — explain the two libraries, point at quick add. No fake sample data.
- **Empty hub** — before any session exists, the hub shows the two doors and a line explaining that planning a session puts it here. Relevant in Phase 1 → 2.
- **Filters return nothing** — offer to clear the most restrictive filter, not only Clear all.
- **Drill deleted** — confirmation naming the consequence; past sessions unaffected, drill shown as removed from library.
- **Duration override** — never mutates the drill's own default.
- **Long coaching-point lists** — collapse beyond 5 in card view.
- **Same drill name in both libraries** — allowed, fully independent.
- **Team deleted** — its sessions and fixtures keep their data, losing only the live team link.
- **Session's team changed after drills added** — warn on library mismatch, since drill types may not apply.
- **Session with no date** — valid; excluded from Hub and Schedule, listed under "Not scheduled" in the Planner. Never auto-completes.
- **Completed session** — remains fully editable.
- **Draft drill** — cannot be added to a session; surfaces as a pinned row atop the Drills list.

---

## 12. Technical architecture

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) on Vercel |
| Database | Supabase Postgres |
| Image storage | Supabase Storage |
| Fixture sync | Vercel cron route fetching each team's Byga ICS, parsing, upserting `Fixture` rows |
| Access control | None — unlisted URL only |
| Offline | Not supported |
| Data portability | JSON export (drills, teams, sessions, fixtures, image refs), behind the gear |

**Access control is an accepted trade-off, with a caveat worth recording.** "Unlisted URL only" in a static client bundle means the Supabase anon key ships publicly — so it is a URL *and* a scrapeable key, not just a URL. For one user with no personal data this is fine. Supabase RLS with a single hardcoded policy is roughly an hour's work if that ever changes.

**One-time setup (~15–20 min):** create a Supabase project and run the schema; create a Vercel project and deploy; keep the URL unshared; per team, paste the Byga subscription link into Settings.

**Ongoing:** code changes, redeploy. No other maintenance.

---

## 13. Testing

Test the logic, not the UI. Unit tests on the parts where a wrong answer looks exactly like a right one:

- Filter predicate, including the `players_max` range fix
- `drill_stats` derivation across edited and un-completed sessions
- Session status derivation, including the undated and reflected cases
- Byga ICS parser: timezones, all-day events, cancelled events, malformed feeds
- Image compression: output under 150KB, aspect ratio preserved

No component or end-to-end tests. The UI will move substantially across a two-week build, and the sole user finds visual bugs immediately.

---

## 14. Build sequencing

**Phase 1 — P0.** Drill data model with soft delete, Drills screen with filter panel and correct player predicate, quick and full capture, photo attachment with cream mats, drill detail, delete with confirmation. **Drills is the front door in this phase** — the hub, schedule and planner all need sessions to exist, so the app's entry point deliberately changes shape in Phase 2.

**Phase 2 — P1.** Planner (sessions list plus builder), session tray, session view (pitchside and print), auto-completion and reflection, hub, schedule.

**Phase 3 — P1.** Teams and Settings, Byga sync, JSON export.

Each phase is independently useful. Phase 1 alone is a working drill library.

---

## 15. Decisions log

Every change from `TP_Drills.md`, and why.

| # | Decision | Reason |
|---|---|---|
| 1 | Removed `Drill.rating` and `Drill.notes` | Duplicated `SessionDrill` reflection data with no defined relationship |
| 2 | Removed `Drill.times_used`; derived instead | Editable completed sessions guarantee counter drift |
| 3 | Soft delete via `deleted_at` | PRD offered two schemas; snapshots duplicate the Drill table |
| 4 | Players filter is a range check | `players_min ≤ N` alone shows a 4v4 drill when you have 20 |
| 5 | Next.js named explicitly | PRD said only "static React app"; also enables the cron route |
| 6 | Dark palette throughout | Chosen over cream planning / dark pitchside for one token set |
| 7 | No pitchside mode; session view is pitchside | Removes persisted state and the risk of being outdoors in the wrong mode |
| 8 | Cream-matted thumbnails | White-paper diagrams flare against a dark grid |
| 9 | No visual differentiation between libraries | Preserves the two-colour brand; the segment already says which |
| 10 | Hub added as home | The app is a coaching hub, not a drill database |
| 11 | No nav bar | A hub and a nav bar are the same feature; the tray solves lateral movement |
| 12 | One Drills screen, segment resets to Outfield | Avoids opening into a library selected days ago |
| 13 | Planner both creates and plans sessions | Byga supplies fixtures only; something must create empty sessions |
| 14 | Filters moved into a panel | A wrapping chip row competed with results and blocked future age bands |
| 15 | Team detail removed | It is the Schedule filtered by team |
| 16 | Print view merged into session view | Same content, same layout, different stylesheet |
| 17 | Sessions auto-complete on date passing | The PRD never said what marked one complete |
| 18 | Added `start_time`, `location`, `target_minutes`, `reflected_at` | Required by §7.4 and §7.8; absent from the PRD schema |
| 19 | Byga sync moved to a Vercel cron route | Keeps the parser in one codebase, debuggable locally |
| 20 | Logic-only test suite | Silent-failure surfaces covered without slowing a two-week build |
