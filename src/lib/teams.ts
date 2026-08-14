import { createBrowserClient } from './supabase/client'
import type { Team, TeamInput } from './types'

/** Client-side. Creates a team. */
export async function createTeam(input: TeamInput): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('team').insert(input).select().single()
  if (error) throw new Error(`Failed to create team: ${error.message}`)
  return data as Team
}
