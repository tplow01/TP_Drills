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
