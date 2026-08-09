import { createBrowserClient } from './supabase/client'
import { createServerClient } from './supabase/server'
import { compressImage } from './image'
import type { Drill, DrillInput, Library } from './types'

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

/** Browser-side. `library` is set here once and never updated again. */
export async function createDrill(input: DrillInput): Promise<Drill> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill').insert(input).select().single()
  if (error) throw new Error(`Failed to save drill: ${error.message}`)
  return data as Drill
}

/** Browser-side. `library` is stripped: a drill's library is permanent (spec 5.4). */
export async function updateDrill(id: string, patch: Partial<DrillInput>): Promise<Drill> {
  const { library: _ignored, ...safe } = patch
  void _ignored
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill').update(safe).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update drill: ${error.message}`)
  return data as Drill
}

/** Browser-side. Drills are never hard-deleted (spec 9). */
export async function softDeleteDrill(id: string): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase
    .from('drill')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`Failed to delete drill: ${error.message}`)
}

/** Browser-side. Compresses, uploads, returns the public URL. */
export async function uploadDrillImage(file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${crypto.randomUUID()}.jpg`
  const supabase = createBrowserClient()

  const { error } = await supabase.storage
    .from('drill-images')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(`Failed to upload image: ${error.message}`)

  const { data } = supabase.storage.from('drill-images').getPublicUrl(path)
  return data.publicUrl
}

/**
 * How many sessions use this drill. Phase 1 has no session table yet, so this
 * returns 0 and the delete dialog says "not used in any session". Phase 2
 * replaces the body with a count over session_drill; the signature does not change.
 */
export async function countSessionsUsing(_drillId: string): Promise<number> {
  return 0
}
