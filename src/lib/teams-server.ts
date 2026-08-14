import { createServerClient } from './supabase/server'
import type { Team } from './types'

/** Server-side. One team by id, or null if not found. */
export async function getTeam(id: string): Promise<Team | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('team').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load team: ${error.message}`)
  return (data as Team) ?? null
}
