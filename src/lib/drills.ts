import { createBrowserClient } from './supabase/client'
import { compressImage } from './image'
import type { Drill, DrillInput } from './types'

/**
 * Browser-side writes, safe to import from client components. Server-side
 * reads (listDrills, getDrill, countSessionsUsing) live in `./drills-server`
 * — see that file for why they are split out.
 */

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
