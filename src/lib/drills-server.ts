import { createServerClient } from './supabase/server'
import type { Drill, Library } from './types'

/**
 * Server-only reads, split out from `./drills` so that `next/headers`
 * (pulled in by the server Supabase client) never ends up in a client
 * bundle. `./drills` holds the browser-side writes used from client
 * components (DrillForm, DeleteDrillDialog, PhotoField); this file holds the
 * reads used only from Server Components.
 */

/** Server-side. Every live drill in one library, newest first. */
export async function listDrills(library: Library): Promise<Drill[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('drill')
    .select('*')
    .eq('library', library)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list drills: ${error.message}`)
  return data as Drill[]
}

/**
 * Server-side. Does NOT filter deleted_at: a soft-deleted drill is still
 * reachable from a past session, and renders marked "removed from library".
 */
export async function getDrill(id: string): Promise<Drill | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('drill').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load drill: ${error.message}`)
  return (data as Drill) ?? null
}

/**
 * How many sessions use this drill. Phase 1 has no session table yet, so this
 * returns 0 and the delete dialog says "not used in any session". Phase 2
 * replaces the body with a count over session_drill, which means a
 * `createServerClient()` call — i.e. `next/headers` — same as listDrills and
 * getDrill above. It belongs in this server-only module for that reason even
 * though the Phase 1 body touches no Supabase client yet: keep it here, do
 * not move it back to `./drills` when Phase 2 implements the real query.
 */
export async function countSessionsUsing(_drillId: string): Promise<number> {
  return 0
}
