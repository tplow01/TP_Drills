# Drill Library — PRD (Build-Ready)

**Status:** All open questions resolved. Ready to implement.
**Owner:** Coach (single user, no auth)
**Target:** Live before first session, ~2 weeks out

---

## 1. Problem & goal

Coaching sessions are currently planned from memory, scattered notes, saved social posts, and course PDFs. Drills are forgotten, repeated too often, or reinvented weekly. There is no record of what worked.

The goal is not to store drills. The goal is to plan better sessions and improve as a coach over a season, across two contexts: **youth outfield teams** and **goalkeeper sessions** (all ages).

## 2. Success measures

| Goal | Measure |
|---|---|
| Drills are captured, not lost | Library reaches 25+ drills by week 6 |
| The right drill is findable in under 30 seconds | Filter/sort to a shortlist in ≤3 taps |
| Sessions are planned in the tool, not on paper | ≥80% of sessions built here after month 1 |
| A week's commitments are visible in one place | Schedule view shows all teams' sessions + fixtures together |
| Coaching improves, not just organisation | ≥50% of used drills carry a post-session note |

## 3. Non-goals (v1)

- Video hosting or embedding
- Drag-and-drop pitch diagram editor (photo attachment covers this — see 6.3)
- Sharing drills with other coaches, or any multi-user features
- Player registers, attendance, or individual player tracking — a team is a planning label, not a roster
- In-session timer or whistle
- Login / accounts — access control is the unlisted URL only
- Full offline support — occasional signal gaps are acceptable, not designed around
- Manual fixture entry — fixtures are Byga-sourced only (see 6.6)
- Editing or annotating synced fixtures
- Fixture results / score tracking

## 4. Users and context

One user, two modes, same responsive app:

- **Planning mode** — laptop, at home. Building sessions, browsing widely, writing coaching points.
- **Pitchside mode** — phone, outdoors, one hand, possibly wet/cold. Reading a plan, quick-capturing an idea. Large touch targets, minimal typing, high contrast.

## 5. Core structure

### 5.1 Two parallel libraries

A top-level toggle switches between **Outfield** and **Goalkeeping**. Separate type taxonomies, separate age rules. State persists between visits.

### 5.2 Drill types (single-select, exactly one per drill)

**Outfield:** Warm-up · Passing · Dribbling · Shooting · Finishing · Defending · Possession/Rondo · Small-sided game · Fun game/Cool-down

**Goalkeeping:** Warm-up/Handling · Shot stopping · Footwork · Distribution · Dealing with crosses · Positioning · Reactions · 1v1s

### 5.3 Age handling

- **Outfield drills require** an age band: `U6-U8` | `U9-U11` (structure supports adding `U12-U14`, `U15+` later without migration)
- **Goalkeeping drills have no age band.** Optional free-text `suitable_from` instead (e.g. "confident divers only"). Display-only, not a filter.

### 5.4 Fixed rule

**A drill's library is permanent.** No moving a drill between Outfield and Goalkeeping after creation.

## 6. Features

### 6.1 P0 — Browse, filter, sort

**Filters** (combine with AND; multi-select within an axis = OR):
- Type (chips, always visible — not a dropdown)
- Age band (outfield only)
- Duration: ≤10 / 10–20 / 20+ mins
- Players available: user enters "I have N today" → shows drills where `players_min ≤ N`
- Free text search: name, tags, setup, how_it_works

**Sort** (independent of filters): by duration, by minimum players — both ascending/descending.

Equipment (goals/cones/bibs) is **not** a filter — display-only, see 6.4.

**Acceptance criteria:**
- Active filters visible, individually clearable, plus "clear all"
- Result count always shown
- Filter/sort state persists navigating into and out of a drill
- Empty result state offers to clear filters, not a dead end

### 6.2 P0 — Capture a drill

Two-tier form:
- **Quick add** — name, type, free-text blob. Saves instantly as a draft. Reachable in one tap from anywhere.
- **Full add** — all fields, including coaching points as a repeating list (not one text box).

**`coaching_points` is required, minimum 1 entry.** This is the one deliberately opinionated constraint — a drill without coaching points is an activity, not a session component.

A draft (missing required fields) is saved and marked incomplete; it cannot be added to a session until completed. Nothing is lost if the form is closed mid-entry.

### 6.3 P0 — Photo attachment

One image per drill — screenshot, photo of a page, photo of a hand-drawn diagram.

- Add from camera or photo library, one tap from the drill form
- Client-side compression on upload: resize longest edge to ~1000px, JPEG ~q0.7, target <150KB
- Thumbnail on card, full size on tap; replaceable/removable
- Included in JSON export

### 6.4 Equipment

Three display fields, not filters: `goals_needed` (int), `cones_needed` (int, rough), `bibs_needed` (bool). Player counts are already covered by `players_min`/`players_max`.

### 6.5 P1 — Session builder

- Add drills to a session tray from the library; reorder (drag or up/down)
- Per-drill duration override (never mutates the drill's own default)
- Running time total against a target session length, warns when over
- Save as named session; duplicate a past session as a starting point
- Optional link to a team — pre-fills library and age band
- **A completed session remains fully editable** — no lock on drills, order, or date after marking done

### 6.6 P1 — Teams and schedule

- Create a team: name, library, age band (youth teams only — GK teams have no age band)
- No player roster and no standalone recurring-slot field — "when" comes entirely from dated sessions and synced fixtures
- Team view: sessions in date order + synced fixtures (youth teams only)
- **Combined schedule view**: every dated session + every synced fixture across all teams, chronological

### 6.7 P1 — Byga fixture sync

Byga (the coach's existing schedule tool) publishes a per-team, read-only ICS subscription link (in-app under Subscribe/Export) — no API approval needed.

- **One Byga URL per team**, entered once in that team's settings
- Fetching happens server-side (Supabase scheduled job) — browsers can't fetch cross-origin calendar feeds directly; the frontend only ever reads what's already stored
- Parses date, opponent, time, location into `Fixture` rows
- **Refresh is not real-time** — expect 12–24h lag, matching Byga's own downstream sync behaviour. Fine for "do I have a game this week," not for matchday changes.
- Fixtures are read-only in this app — no editing, no manual entry, no result tracking (see non-goals)

### 6.8 P1 — Post-session reflection

After a session is marked complete: rate each drill (1–5), add a per-drill note and an overall session note, `times_used` increments. One prompted, skippable screen.

`times_used` **is shown** on the drill card.

### 6.9 P1 — Print / export view

Clean, high-contrast single-page layout of a session: names, durations, setup, coaching points. Printable and phone-readable in daylight.

### 6.10 P2 — Later (not v1)

- Drag-and-drop pitch diagram editor, if photos prove insufficient
- Multiple images per drill
- Duplicate a drill as a variation
- "Not run recently" surfacing
- Additional age bands as coaching remit grows
- Manual fixture entry, if Byga ever falls short

## 7. Data model

```
Drill
  id                uuid, pk
  library           enum('outfield','goalkeeping')      not null
  name              text                                 not null
  type              enum (per library's type list)       not null
  age_band          enum('U6-U8','U9-U11')                outfield only
  suitable_from     text                                  GK only, free text
  duration_mins     int                                  not null
  players_min       int                                  not null
  players_max       int                                  nullable = no upper limit
  goals_needed      int          default 0
  cones_needed      int          default 0
  bibs_needed       bool         default false
  image_url         text                                  nullable, Supabase Storage ref
  setup             text                                 not null
  how_it_works      text                                 not null
  coaching_points   text[]                               not null, min 1 entry
  progressions      text                                  nullable
  source            text                                  nullable
  tags              text[]                                nullable
  rating            int (1-5)                             nullable
  notes             text                                  nullable
  times_used        int          default 0
  is_draft          bool         default false
  created_at        timestamptz  default now()
  updated_at        timestamptz  default now()

Team
  id                uuid, pk
  name              text                                 not null
  library           enum('outfield','goalkeeping')      not null
  age_band          enum('U6-U8','U9-U11')                youth teams only
  byga_url          text                                  nullable
  created_at        timestamptz  default now()

Fixture
  id                uuid, pk
  team_id           uuid, fk -> Team                     not null
  opponent          text                                 not null
  date              date                                 not null
  time              time                                  nullable
  location          text                                  nullable
  source            enum('byga')          default 'byga'
  synced_at         timestamptz

Session
  id                uuid, pk
  team_id           uuid, fk -> Team                      nullable
  name              text                                 not null
  library            enum('outfield','goalkeeping')      not null  -- from team if linked, else set manually
  date              date                                  nullable
  age_band          enum('U6-U8','U9-U11')                 nullable, from team if linked
  session_notes     text                                  nullable
  status            enum('planned','completed')  default 'planned'
  created_at        timestamptz  default now()
  updated_at        timestamptz  default now()

SessionDrill  (join table — ordered, with override + reflection data)
  id                uuid, pk
  session_id        uuid, fk -> Session                  not null
  drill_id          uuid, fk -> Drill                    not null
  position           int                                  not null   -- running order
  duration_override int                                   nullable
  rating            int (1-5)                              nullable  -- set at reflection
  note              text                                    nullable  -- set at reflection
```

**Deletion rule:** deleting a drill requires explicit confirmation. Past `SessionDrill` rows keep a denormalised snapshot (`drill_name_snapshot`, `drill_setup_snapshot`, etc. — or simply don't hard-delete, soft-delete with `deleted_at`) so historic sessions never silently lose content.

## 8. Screens

1. **Library** — toggle, filter chips, sort, search, drill cards, add button
2. **Drill detail** — full fields, edit, delete (confirm), add-to-session, rating/notes history
3. **Add/edit drill** — quick + full modes
4. **Teams** — list, add/edit team (incl. Byga URL field)
5. **Team detail** — sessions in date order, synced fixtures
6. **Schedule** — combined calendar, all teams, sessions + fixtures
7. **Sessions list** — planned + completed
8. **Session builder** — ordered drills, running time, target length, team link
9. **Session review** — post-session ratings/notes
10. **Print view**

## 9. Edge cases

- Empty library on first run → explain the two libraries, point at quick add. No fake sample data.
- Filters return nothing → offer to clear the most restrictive filter, not just "clear all"
- Drill deleted → confirmation required; past sessions retain a snapshot, unaffected
- Duration override → never mutates the drill's own default
- Long coaching-point lists → collapse beyond 5 in card view
- Same drill name in both libraries → allowed, fully independent
- Team deleted → its sessions/fixtures keep their own data, just lose the live team link
- Session's team changed after drills added → warn if library mismatch, since drill types may not apply
- Session with no date → valid, just excluded from the schedule view until dated
- Completed session → remains fully editable, no lock

## 10. Technical architecture

| Layer | Choice |
|---|---|
| Frontend | Static React app, deployed on **Vercel** |
| Database | **Supabase** (Postgres) |
| Image storage | **Supabase Storage** |
| Fixture sync | Supabase scheduled function — fetches each team's Byga ICS URL periodically, parses, writes `Fixture` rows |
| Access control | None — unlisted URL is the only barrier (explicitly accepted trade-off, single user) |
| Offline | Not supported — occasional signal gaps acceptable |
| Data portability | JSON export (drills, teams, sessions, fixtures, image refs) |

**One-time user setup (~15–20 min):**
1. Create free Supabase account + project, run provided schema
2. Create free Vercel account, connect provided repo, deploy
3. Save the resulting URL — keep it unshared, it is the access control
4. Per team: copy the Byga subscription link (Byga app → Subscribe/Export) into that team's settings

**Ongoing:** code changes → redeploy (one click on Vercel). No other maintenance.

## 11. Build sequencing (suggested)

Given the two-week runway, P0 first gets something usable before teams/sessions exist to fill it:

1. **Phase 1 (P0):** Drill data model, library browse/filter/sort, capture (quick + full), photo attachment, delete with confirmation
2. **Phase 2 (P1):** Session builder, post-session reflection, print view
3. **Phase 3 (P1):** Teams, schedule view, Byga sync

Each phase is independently useful — Phase 1 alone is a working drill library.
