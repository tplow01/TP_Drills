import { createServerClient } from './supabase/server'
import type { Session, SessionWithDrills, DrillStats } from './types'

/**
 * Server-only reads, split out from `./sessions` so that `next/headers`
 * (pulled in by the server Supabase client) never ends up in a client
 * bundle. `./sessions` holds the browser-side writes used from client
 * components; this file holds the reads used only from Server Components.
 * Same split as `./drills` / `./drills-server`.
 */

/** Server-side. Every session, newest first. */
export async function listSessions(): Promise<Session[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('session')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list sessions: ${error.message}`)
  return data as Session[]
}

/**
 * Server-side. Session plus its drills, joined to the full drill and
 * ordered by position. Does NOT filter deleted_at on the joined drill: a
 * soft-deleted drill still belongs to a past session, and renders marked
 * "removed from library" (spec 9).
 */
export async function getSession(id: string): Promise<SessionWithDrills | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('session')
    .select('*, drills:session_drill(*, drill:drill(*))')
    .eq('id', id)
    .order('position', { referencedTable: 'session_drill', ascending: true })
    .maybeSingle()

  if (error) throw new Error(`Failed to load session: ${error.message}`)
  return (data as SessionWithDrills) ?? null
}

/** Server-side. Dated sessions within an inclusive date range, ordered by date then start_time, nulls last. */
export async function listSessionsInWindow(fromISO: string, toISO: string): Promise<Session[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('session')
    .select('*')
    .gte('date', fromISO)
    .lte('date', toISO)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) throw new Error(`Failed to list sessions in window: ${error.message}`)
  return data as Session[]
}

/** Server-side. Number of drills in each session, keyed by session id. */
export async function drillCountsBySession(): Promise<Record<string, number>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('session_drill').select('session_id')
  if (error) throw new Error(`Failed to count session drills: ${error.message}`)

  const counts: Record<string, number> = {}
  for (const row of data as { session_id: string }[]) {
    counts[row.session_id] = (counts[row.session_id] ?? 0) + 1
  }
  return counts
}

/** One past reflection entry for a drill, with the session it came from. */
export interface DrillHistoryEntry {
  session_id: string
  session_name: string
  session_date: string
  rating: number | null
  note: string | null
}

/**
 * Server-side. Every past session_drill row for one drill — rating and note,
 * each with the session it came from and its date — newest first. Gated on
 * "session date has passed" to match drill_stats (0005): a rating on a
 * not-yet-past session must not appear as history before the session runs.
 */
export async function listDrillHistory(drillId: string): Promise<DrillHistoryEntry[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('session_drill')
    .select('rating, note, session:session(id, name, date)')
    .eq('drill_id', drillId)

  if (error) throw new Error(`Failed to load drill history: ${error.message}`)

  const today = new Date()
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  type SessionRef = { id: string; name: string; date: string | null }
  type Row = { rating: number | null; note: string | null; session: SessionRef | SessionRef[] | null }

  function sessionOf(row: Row): SessionRef | null {
    if (row.session === null) return null
    return Array.isArray(row.session) ? (row.session[0] ?? null) : row.session
  }

  return (data as Row[])
    .map((row) => ({ row, session: sessionOf(row) }))
    .filter(
      (r): r is { row: Row; session: SessionRef } =>
        r.session !== null && r.session.date !== null && (r.session.date as string) < todayISO,
    )
    .map(({ row, session }) => ({
      session_id: session.id,
      session_name: session.name,
      session_date: session.date as string,
      rating: row.rating,
      note: row.note,
    }))
    .sort((a, b) => b.session_date.localeCompare(a.session_date))
}

/** Server-side. Reads the drill_stats view, keyed by drill_id. */
export async function listDrillStats(): Promise<Record<string, DrillStats>> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('drill_stats').select('*')
  if (error) throw new Error(`Failed to load drill stats: ${error.message}`)

  const stats: Record<string, DrillStats> = {}
  for (const row of data as DrillStats[]) {
    stats[row.drill_id] = row
  }
  return stats
}
