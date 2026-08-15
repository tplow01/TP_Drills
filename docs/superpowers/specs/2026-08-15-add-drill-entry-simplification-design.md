# Add-drill entry simplification — design

## Context

The add-drill entry point (`/drills/new`) currently offers a "Quick add" vs "full details" toggle inside the form itself, plus a separate "Start with a diagram instead" link that routes to `/drills/new/diagram`, which silently creates an untitled draft and redirects into the full-screen `DiagramEditor`. The Drills list header has a single "+ Quick add" button.

In practice this is more surface area than the flow needs: the mode toggle, the scary green "still needed" checklist box, and the disconnected diagram link all add friction to what should be a fast capture step. This spec simplifies entry down to one button, one minimal screen, with the diagram canvas present inline rather than behind a link.

## Entry point: Drills list

The header gets a single button, **"+ Add drill"**, replacing today's "+ Quick add". No second diagram-specific button at this level.

- Desktop: sits at the end of the toolbar row (where "+ Quick add" is today).
- Mobile: full-width button.

## The "Add drill" screen (`/drills/new`)

Replaces the current `DrillForm` quick/full toggle entirely. This screen only ever captures:

- **Name** (required)
- **Type** (required, defaults to the library's first type as today)
- **Note** (optional, single free-text field — maps to `setup: [note]` on save, same as today's quick-add note behavior)
- **Diagram** (optional) — a placeholder canvas box, not a live editor

No "add full details now" expander and no missing-field checklist box live on this screen — those move to `/drills/[id]/edit` only (see below).

### Layout

- Mobile: fields stacked (Name, Type, Note), diagram box below them.
- Desktop: two columns — fields on the left, diagram box on the right, side by side.

### Diagram box behavior

The box is a static placeholder ("Tap to sketch the pitch layout"), not an embedded instance of `DiagramEditor` — that component is a full-screen canvas tool and isn't designed to run compacted inline. Tapping/clicking it:

1. Saves the current Name/Type/Note as a draft (creating the drill if it doesn't exist yet — reusing `createDrill`, defaulting Name to "Untitled drill" if blank, same fallback `NewDrillFromDiagramStarter` uses today).
2. Routes to the existing `/drills/[id]/diagrams/new` full-screen editor.

This reuses today's diagram-first flow end to end; only the trigger changes (inline box instead of a separate route). `/drills/new/diagram` and `NewDrillFromDiagramStarter` are removed since their one job — create a draft, jump to the diagram editor — is now inlined into this screen.

### Save behavior

Clicking **"Add drill"**:

- Saves as a draft (`is_draft: true`, identical logic to today: any drill missing required session-ready fields — age band, duration, setup, coaching points, etc. — saves as a draft regardless of which button was used).
- Routes straight to `/drills/[id]/edit` (the existing full `DrillForm` in `mode="full"`), rather than the drill detail page. This is where the missing-field checklist and all remaining fields (age band, duration, players, setup, how it works, coaching points, equipment, progressions, source, tags, photo) continue to live exactly as they do today — unchanged.

## Draft visibility

No change needed. The Drills list already pins a "N drafts need finishing" strip above results with a chip per draft linking to its detail page, where delete already exists via `DeleteDrillDialog`. This flow is unaffected by the entry simplification and continues to be the way drafts are found and removed.

## Data model changes

None. This is purely an entry-flow/UI simplification — `DrillInput`, `is_draft` logic, validation (`missingFields`/`invalidFields`), and the diagram data model are all unchanged.

## Removed

- `mode` query param and the in-form quick/full toggle in `DrillForm` (component keeps `mode="full"` behavior for the edit page; the `mode="quick"` path and its UI branch are deleted).
- `/drills/new/diagram/page.tsx` and `NewDrillFromDiagramStarter.tsx` (logic inlined into the new diagram box's click handler).
- The green "still needed"/"cannot save" checklist boxes as they appear on `/drills/new` specifically (they remain, unchanged, on `/drills/[id]/edit`).

## Testing

- Manual QA (desktop and mobile breakpoints): click "+ Add drill" from both library tabs, confirm one-button entry; fill name/type/note and save, confirm draft created and lands on `/drills/[id]/edit`; click the diagram box with fields empty, confirm it creates an "Untitled drill" draft and opens the diagram editor; click the diagram box with fields filled, confirm those values are saved before entering the editor; confirm the drafts strip and delete flow on the Drills list are unaffected.
- Unit tests: none needed beyond existing `missingFields`/`invalidFields` coverage, since validation logic is unchanged.

## Out of scope

- Any change to `DiagramEditor.tsx`, auto-extraction from canvas elements, or the diagrams data model — all shipped in the 2026-08-12 spec and untouched here.
- A true inline mini diagram editor (considered and rejected in favor of the tap-to-open-full-editor pattern, to avoid adapting a 500+ line canvas component to run compacted inside a form column).
