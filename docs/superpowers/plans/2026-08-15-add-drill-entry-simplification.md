# Add-Drill Entry Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the quick/full toggle on `/drills/new` with a single minimal "Add drill" screen (name, type, note, inline diagram box) and collapse the Drills list's two potential entry actions into one "+ Add drill" button.

**Architecture:** A new `AddDrillForm` client component replaces the quick-add branch of the existing `DrillForm`. `DrillForm` itself sheds its `mode` prop and always renders the full field set (it's only ever reached from `/drills/[id]/edit` and `/drills/[id]/finish` now). The diagram-first entry (`/drills/new/diagram`) is deleted; its "create a draft, then open the diagram editor" behavior is inlined as the `AddDrillForm`'s diagram-box click handler.

**Tech Stack:** Next.js 15 (App Router), React client components, Supabase (via existing `createDrill` in `src/lib/drills.ts`), no new dependencies.

## Global Constraints

- A drill's `library` is fixed at creation and never changes (existing rule, unaffected).
- No data model changes — `DrillInput`, `is_draft`, `missingFields`/`invalidFields` validation are unchanged.
- Follow existing component conventions: inline `style` objects (no CSS-in-JS library), `Field`/`TextInput`/`Button` from `src/components/ui/`, dark theme tokens (`var(--field-bg)`, `var(--hairline)`, `var(--radius)`, etc.) from `src/app/globals.css`.
- No component test suite exists in this codebase (only `src/lib/*.test.ts` for pure functions via `vitest run`) — verification for these tasks is manual QA in the browser, not new test files.

---

### Task 1: Build `AddDrillForm`

**Files:**
- Create: `src/components/drills/AddDrillForm.tsx`

**Interfaces:**
- Consumes: `createDrill(input: DrillInput): Promise<Drill>` from `src/lib/drills.ts`; `typesFor(library): readonly DrillType[]` and `typeLabel(type): string` from `src/lib/taxonomy.ts`; `Button`, `Field`, `TextInput` from `src/components/ui/`.
- Produces: `AddDrillForm({ library: Library })` — a default-exportless named export consumed by Task 2's page.

- [ ] **Step 1: Write `AddDrillForm.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createDrill } from '@/lib/drills'
import { typeLabel, typesFor } from '@/lib/taxonomy'
import type { DrillInput, DrillType, Library } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { TextInput } from '@/components/ui/TextInput'

const selectStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--field-bg)',
  border: '1px solid var(--hairline)',
  borderRadius: 'var(--radius-sm)',
  padding: '10px 12px',
  fontFamily: 'inherit',
  fontWeight: 500,
  fontSize: 14,
  color: 'var(--ink)',
}

const diagramBoxStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%',
  minHeight: 180,
  background: 'var(--field-bg)',
  border: '1px dashed var(--hairline)',
  borderRadius: 'var(--radius)',
  color: 'var(--ink-45)',
  fontSize: 13,
  fontFamily: 'inherit',
  fontWeight: 500,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
})

/**
 * Every drill created here is missing the fields a session needs (setup
 * beyond one note, coaching points, etc.), so it always saves as a draft —
 * unlike `DrillForm`, there's no need to compute `missingFields`.
 */
function draftInput(library: Library, name: string, type: DrillType, note: string): DrillInput {
  const trimmedNote = note.trim()
  return {
    library,
    name: name.trim() || 'Untitled drill',
    type,
    age_band: null,
    suitable_from: null,
    duration_mins: null,
    players_min: null,
    players_max: null,
    goals_needed: 0,
    cones_needed: 0,
    bibs_needed: false,
    image_url: null,
    setup: trimmedNote ? [trimmedNote] : [],
    how_it_works: [],
    coaching_points: [],
    progressions: null,
    source: null,
    tags: [],
    is_draft: true,
  }
}

export function AddDrillForm({ library }: { library: Library }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [type, setType] = useState<DrillType>(typesFor(library)[0])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function saveAndGo(destination: (id: string) => string) {
    if (saving) return
    setSaving(true)
    setError(null)
    try {
      const drill = await createDrill(draftInput(library, name, type, note))
      router.push(destination(drill.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 900 }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <div style={{ marginBottom: 15 }}>
            <Field label="Name">
              <TextInput value={name} onChange={setName} placeholder="Four-Goal Rondo" />
            </Field>
          </div>

          <div style={{ marginBottom: 15 }}>
            <Field label="Type">
              <select
                style={selectStyle}
                value={type}
                onChange={(e) => setType(e.target.value as DrillType)}
              >
                {typesFor(library).map((t) => (
                  <option key={t} value={t}>{typeLabel(t)}</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginBottom: 18 }}>
            <Field label="Note (optional)">
              <TextInput
                value={note}
                onChange={setNote}
                placeholder="Anything you want to remember. This lands in Setup."
              />
            </Field>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginBottom: 12 }}>{error}</div>}

          <Button
            onClick={() => saveAndGo((id) => `/drills/${id}/edit`)}
            disabled={saving || name.trim() === ''}
          >
            {saving ? 'Saving…' : 'Add drill'}
          </Button>
        </div>

        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <Field label="Diagram (optional)">
            <button
              type="button"
              onClick={() => saveAndGo((id) => `/drills/${id}/diagrams/new?entry=diagram`)}
              disabled={saving}
              style={diagramBoxStyle(saving)}
            >
              Tap to sketch the pitch layout
            </button>
          </Field>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors referencing `AddDrillForm.tsx` (unrelated pre-existing errors, if any, are out of scope).

- [ ] **Step 3: Commit**

```bash
git add src/components/drills/AddDrillForm.tsx
git commit -m "feat: add minimal AddDrillForm component"
```

---

### Task 2: Wire `AddDrillForm` into `/drills/new`

**Files:**
- Modify: `src/app/drills/new/page.tsx`

**Interfaces:**
- Consumes: `AddDrillForm({ library: Library })` from Task 1.

- [ ] **Step 1: Replace the page body**

Replace the full contents of `src/app/drills/new/page.tsx` with:

```tsx
import { AddDrillForm } from '@/components/drills/AddDrillForm'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import type { Library } from '@/lib/types'

export default async function NewDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ library?: string }>
}) {
  const params = await searchParams
  const library: Library = params.library === 'goalkeeping' ? 'goalkeeping' : 'outfield'

  return (
    <main>
      <ScreenHeader
        title={library === 'outfield' ? 'Add outfield drill' : 'Add goalkeeping drill'}
        backHref="/drills"
        backLabel="Drills"
      />
      <AddDrillForm library={library} />
    </main>
  )
}
```

This drops the `mode` search param, the `DrillForm` import, and the "Start with a diagram instead" ghost-button link (the diagram box on `AddDrillForm` replaces it).

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `src/app/drills/new/page.tsx`.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, visit `http://localhost:3000/drills/new?library=outfield`.
Expected: page shows "Add outfield drill" header, Name/Type/Note on the left, a dashed diagram box on the right (side by side on a wide window). Typing a name and clicking "Add drill" creates a draft and navigates to `/drills/<id>/edit`. Clicking the diagram box with the name field empty creates an "Untitled drill" draft and navigates to `/drills/<id>/diagrams/new?entry=diagram`.

- [ ] **Step 4: Commit**

```bash
git add src/app/drills/new/page.tsx
git commit -m "feat: swap /drills/new to the minimal AddDrillForm"
```

---

### Task 3: Strip the quick/full toggle out of `DrillForm`

**Files:**
- Modify: `src/components/drills/DrillForm.tsx:47-141` (component signature and the quick-mode branch)
- Modify: `src/app/drills/[id]/edit/page.tsx:21`
- Modify: `src/app/drills/[id]/finish/page.tsx:22`

**Interfaces:**
- Produces: `DrillForm({ library: Library, initial: Drill | null }): JSX.Element` — the `mode` prop is removed; the component now always renders what used to be the `full` branch.

`DrillForm` is reached only from the edit and finish pages after this plan (both always passed `mode="full"`), so the component can drop the toggle entirely rather than defaulting it.

- [ ] **Step 1: Remove the `mode` prop and `full` state from `DrillForm`**

In `src/components/drills/DrillForm.tsx`, change the function signature (currently lines 47-55):

```tsx
export function DrillForm({
  library,
  initial,
  mode,
}: {
  library: Library
  initial: Drill | null
  mode: 'quick' | 'full'
}) {
  const router = useRouter()
  const [full, setFull] = useState(mode === 'full')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
```

to:

```tsx
export function DrillForm({
  library,
  initial,
}: {
  library: Library
  initial: Drill | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
```

- [ ] **Step 2: Remove the quick-mode branch and unwrap the full-mode branch**

Delete the `{!full && ( ... )}` block (the "Notes — tidy it up later" `PointListField` and "Add the full details now →" button — currently between the Type field and the age-band/suitable-from field).

Change `{full && ( ... )}` to render unconditionally: remove the `{full && (` opening and its matching `)}` closing, keeping everything in between (age band / suitable-from through the `PhotoField`).

- [ ] **Step 3: Remove now-unused `Button` import if applicable**

`Button` is still used at the bottom of the file (the Save button) and was used by the removed "Add the full details now" link — check the remaining file still references `Button`; it does (the final Save button), so the import stays. No import changes needed.

- [ ] **Step 4: Update `src/app/drills/[id]/edit/page.tsx`**

Change line 21 from:

```tsx
      <DrillForm library={drill.library} initial={drill} mode="full" />
```

to:

```tsx
      <DrillForm library={drill.library} initial={drill} />
```

- [ ] **Step 5: Update `src/app/drills/[id]/finish/page.tsx`**

Change line 22 from:

```tsx
      <DrillForm library={drill.library} initial={drill} mode="full" />
```

to:

```tsx
      <DrillForm library={drill.library} initial={drill} />
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. In particular, confirm no other file still passes a `mode` prop to `DrillForm` (`grep -rn "DrillForm" src` should show only the two call sites above and the component definition/import).

- [ ] **Step 7: Manual check**

Run: `npm run dev`, visit `http://localhost:3000/drills/<some-existing-drill-id>/edit`.
Expected: full form renders exactly as before (age band/suitable-from, duration/players, setup/how-it-works/coaching-points, equipment, progressions, source, tags, photo) — no quick-mode UI, no "Add the full details now" link.

- [ ] **Step 8: Commit**

```bash
git add src/components/drills/DrillForm.tsx src/app/drills/[id]/edit/page.tsx src/app/drills/[id]/finish/page.tsx
git commit -m "refactor: drop DrillForm's quick/full mode toggle"
```

---

### Task 4: Simplify the Drills list header button

**Files:**
- Modify: `src/components/drills/DrillsBrowser.tsx:175-177`

- [ ] **Step 1: Update the header link**

Change (currently lines 175-177):

```tsx
            <Link href={`/drills/new?library=${library}&mode=quick`} className="header-cta">
              + Quick add
            </Link>
```

to:

```tsx
            <Link href={`/drills/new?library=${library}`} className="header-cta">
              + Add drill
            </Link>
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, visit `http://localhost:3000/drills`.
Expected: header shows a single "+ Add drill" button (no separate diagram button); clicking it goes to `/drills/new?library=outfield` (or `goalkeeping`, matching the active segment). Confirm on a narrow window too — the button remains a single full-width-friendly control, no layout break.

- [ ] **Step 4: Commit**

```bash
git add src/components/drills/DrillsBrowser.tsx
git commit -m "feat: simplify Drills list to a single Add drill button"
```

---

### Task 5: Remove the standalone diagram-first entry route

**Files:**
- Delete: `src/app/drills/new/diagram/page.tsx`
- Delete: `src/app/drills/new/diagram/NewDrillFromDiagramStarter.tsx`

This route's job — create a draft, redirect into the diagram editor — is now handled inline by `AddDrillForm`'s diagram box (Task 1). Nothing else links to `/drills/new/diagram` after Task 2 removed the "Start with a diagram instead" link.

- [ ] **Step 1: Confirm nothing else references this route**

Run: `grep -rn "drills/new/diagram\|NewDrillFromDiagramStarter" src`
Expected: no matches (Task 2 already removed the only link; this route's own two files will still show up until deleted in the next step — that's expected).

- [ ] **Step 2: Delete the route**

```bash
git rm -r src/app/drills/new/diagram
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, visit `http://localhost:3000/drills/new/diagram?library=outfield`.
Expected: Next's default 404 page (route no longer exists). Then re-confirm the diagram box on `/drills/new` (Task 1/2) still works end to end — this is the replacement path.

- [ ] **Step 5: Commit**

```bash
git commit -m "chore: remove standalone diagram-first entry route"
```

---

### Task 6: Full end-to-end manual QA

No code changes — this task is a final walkthrough confirming the whole flow described in the spec works together, across the pieces built in Tasks 1-5.

- [ ] **Step 1: Desktop — text-first path**

Run: `npm run dev`. On a wide browser window, go to `/drills`, click "+ Add drill". Confirm: fields on the left, diagram box on the right, side by side. Fill Name "Test Rondo", pick a Type, leave Note blank. Click "Add drill". Confirm: lands on `/drills/<id>/edit`, drill shows as a draft, Name/Type are pre-filled from what you typed.

- [ ] **Step 2: Desktop — diagram-first path**

Go to `/drills`, click "+ Add drill" again. Leave Name blank, click the diagram box. Confirm: navigates to `/drills/<id>/diagrams/new?entry=diagram`, and back on `/drills` (after leaving the editor) a new "Untitled drill" draft appears in the drafts strip.

- [ ] **Step 3: Desktop — diagram-first with fields filled**

Go to `/drills`, click "+ Add drill". Fill Name "Passing Square" and a Note "warm the group up first", then click the diagram box (not "Add drill"). Confirm: the created drill's `setup` ends up as `["warm the group up first"]` and its name is "Passing Square" — check this via `/drills/<id>/edit` after leaving the diagram editor.

- [ ] **Step 4: Mobile breakpoint**

Resize the browser to a phone width (or use dev tools device toolbar). Repeat Step 1. Confirm: Name/Type/Note stack above the diagram box (not side by side); the "+ Add drill" button on `/drills` is full-width.

- [ ] **Step 5: Drafts strip unaffected**

On `/drills`, confirm the "N drafts need finishing" strip still appears above the results when drafts exist, each draft is a clickable chip to its detail page, and delete still works from there (`DeleteDrillDialog`, unchanged by this plan).

- [ ] **Step 6: Full test suite**

Run: `npm run test`
Expected: all existing `src/lib/*.test.ts` tests still pass (none of them touch the files changed in this plan, so this is a regression check, not new coverage).

- [ ] **Step 7: Final commit (if any QA fixes were needed)**

If Steps 1-6 surfaced any fixes, commit them individually with descriptive messages before considering this plan complete. If no fixes were needed, this task requires no commit.
