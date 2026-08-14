import { createBrowserClient } from './supabase/client'
import type { Team, TeamInput } from './types'

/** Client-side. Creates a team. */
export async function createTeam(input: TeamInput): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('team').insert(input).select().single()
  if (error) throw new Error(`Failed to create team: ${error.message}`)
  return data as Team
}

/**
 * Client-side. Records that a calendar-subscription URL was saved and stamps
 * calendar_synced_at with the connection time. Does not fetch or parse the
 * ICS feed — real sync is out of scope for this plan (see design doc).
 */
export async function connectCalendar(teamId: string, url: string): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from('team')
    .update({ calendar_url: url, calendar_synced_at: new Date().toISOString() })
    .eq('id', teamId)
    .select()
    .single()
  if (error) throw new Error(`Failed to connect calendar: ${error.message}`)
  return data as Team
}
