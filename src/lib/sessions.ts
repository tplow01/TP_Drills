import { createBrowserClient } from './supabase/client'
import type { Session, SessionInput, SessionDrill, DrillType } from './types'

/**
 * Browser-side writes, safe to import from client components. Server-side
 * reads (listSessions, getSession, listSessionsInWindow,
 * drillCountsBySession, listDrillStats) live in `./sessions-server` — see
 * that file for why they are split out.
 */

/** Browser-side. Creates a session. */
export async function createSession(input: SessionInput): Promise<Session> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('session').insert(input).select().single()
  if (error) throw new Error(`Failed to create session: ${error.message}`)
  return data as Session
}

/** Browser-side. Partial update; a completed session stays fully editable (spec 7.4). */
export async function updateSession(id: string, patch: Partial<SessionInput>): Promise<Session> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from('session')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(`Failed to update session: ${error.message}`)
  return data as Session
}

/** Browser-side. Replaces the session's set of themes wholesale. */
export async function updateSessionThemes(sessionId: string, themes: DrillType[]): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('session').update({ themes }).eq('id', sessionId)
  if (error) throw new Error(`Failed to update session themes: ${error.message}`)
}

/** Browser-side. Sessions, unlike drills, may be hard-deleted (spec 9). */
export async function deleteSession(id: string): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('session').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete session: ${error.message}`)
}

/**
 * Browser-side. Appends the drill at the end: (current max position) + 1,
 * or 0 if the session has no drills yet. Never trusts a caller-supplied
 * position.
 */
export async function addDrillToSession(sessionId: string, drillId: string): Promise<SessionDrill> {
  const supabase = createBrowserClient()

  const { data: existing, error: maxError } = await supabase
    .from('session_drill')
    .select('position')
    .eq('session_id', sessionId)
    .order('position', { ascending: false })
    .limit(1)
  if (maxError) throw new Error(`Failed to add drill to session: ${maxError.message}`)

  const nextPosition = existing.length > 0 ? existing[0].position + 1 : 0

  const { data, error } = await supabase
    .from('session_drill')
    .insert({ session_id: sessionId, drill_id: drillId, position: nextPosition })
    .select()
    .single()
  if (error) throw new Error(`Failed to add drill to session: ${error.message}`)
  return data as SessionDrill
}

/** Browser-side. Removes one drill from a session. */
export async function removeSessionDrill(sessionDrillId: string): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('session_drill').delete().eq('id', sessionDrillId)
  if (error) throw new Error(`Failed to remove session drill: ${error.message}`)
}

/**
 * Browser-side. Writes every row's new position in one batched call. The
 * (session_id, position) unique constraint is deferrable, but that only
 * helps within a single statement/transaction — sequential single-row
 * updates would still collide, so this upserts all rows at once.
 */
export async function reorderSessionDrills(sessionId: string, orderedIds: string[]): Promise<void> {
  const supabase = createBrowserClient()

  // Postgres validates NOT NULL columns while building the proposed insert
  // tuple, before conflict detection runs — an upsert payload missing
  // drill_id (not null) fails even though every row already exists. Fetch
  // the full rows first so the upsert carries every column, preserving
  // duration_override/rating/note instead of nulling them out.
  const { data: existing, error: fetchError } = await supabase
    .from('session_drill')
    .select('*')
    .eq('session_id', sessionId)
  if (fetchError) throw new Error(`Failed to reorder session drills: ${fetchError.message}`)

  const byId = new Map((existing as SessionDrill[]).map((row) => [row.id, row]))
  const rows = orderedIds.map((id, position) => {
    const row = byId.get(id)
    if (!row) throw new Error(`Failed to reorder session drills: unknown session_drill id ${id}`)
    return { ...row, position }
  })

  const { error } = await supabase.from('session_drill').upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`Failed to reorder session drills: ${error.message}`)
}

/** Browser-side. Per-drill duration override; never mutates the drill's own duration_mins (spec 7.4). */
export async function setDurationOverride(sessionDrillId: string, mins: number | null): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase
    .from('session_drill')
    .update({ duration_override: mins })
    .eq('id', sessionDrillId)
  if (error) throw new Error(`Failed to set duration override: ${error.message}`)
}

/**
 * Browser-side. Writes per-drill ratings and notes, sets session_notes, and
 * marks the session reflected. Reflection is skippable, so every rating may
 * be null.
 *
 * Delegates to the save_reflection() Postgres function (migration 0005)
 * rather than issuing sequential per-row updates from here: a partial
 * failure partway through used to leave some ratings persisted with
 * reflected_at never set, stranding the session in `reflect` with no way to
 * tell which entries had saved. The function body commits or rolls back as
 * one unit.
 */
export async function saveReflection(
  sessionId: string,
  entries: { sessionDrillId: string; rating: number | null; note: string | null }[],
  sessionNotes: string | null,
): Promise<void> {
  const supabase = createBrowserClient()

  const { error } = await supabase.rpc('save_reflection', {
    p_session_id: sessionId,
    p_entries: entries,
    p_session_notes: sessionNotes,
  })
  if (error) throw new Error(`Failed to save reflection: ${error.message}`)
}

/**
 * Browser-side. Copies the session's shape, not its history: target_minutes,
 * library, age_band, and each drill's drill_id, position and
 * duration_override. Does not copy date, start_time, location,
 * session_notes, reflected_at, or any rating/note — a duplicate is a
 * starting point, not a record of something that happened.
 */
export async function duplicateSession(sessionId: string, name: string): Promise<Session> {
  const supabase = createBrowserClient()

  const { data: original, error: sessionError } = await supabase
    .from('session')
    .select('target_minutes, library, age_band')
    .eq('id', sessionId)
    .single()
  if (sessionError) throw new Error(`Failed to duplicate session: ${sessionError.message}`)

  const { data: drills, error: drillsError } = await supabase
    .from('session_drill')
    .select('drill_id, position, duration_override')
    .eq('session_id', sessionId)
  if (drillsError) throw new Error(`Failed to duplicate session: ${drillsError.message}`)

  const { data: created, error: createError } = await supabase
    .from('session')
    .insert({
      name,
      library: original.library,
      target_minutes: original.target_minutes,
      age_band: original.age_band,
    })
    .select()
    .single()
  if (createError) throw new Error(`Failed to duplicate session: ${createError.message}`)

  if (drills.length > 0) {
    const rows = drills.map((d) => ({
      session_id: created.id,
      drill_id: d.drill_id,
      position: d.position,
      duration_override: d.duration_override,
    }))
    const { error: insertError } = await supabase.from('session_drill').insert(rows)
    if (insertError) throw new Error(`Failed to duplicate session: ${insertError.message}`)
  }

  return created as Session
}
