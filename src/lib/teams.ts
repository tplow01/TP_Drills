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
 * Client-side. Records that a calendar-subscription URL was saved. Does
 * NOT stamp `calendar_synced_at` — that field means "the last time we
 * actually pulled fixtures in," and connecting a URL hasn't fetched
 * anything yet. Only `syncCalendar` (below) stamps it, after a real sync.
 */
export async function connectCalendar(teamId: string, url: string): Promise<Team> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from('team')
    .update({ calendar_url: url })
    .eq('id', teamId)
    .select()
    .single()
  if (error) throw new Error(`Failed to connect calendar: ${error.message}`)
  return data as Team
}

/** Client-side. Triggers a "Sync now" — fetches and imports new fixtures
    from the team's connected calendar feed via the server-side route
    (needed to avoid the browser CORS restrictions most calendar hosts
    impose). Returns how many new sessions were created. */
export async function syncCalendar(teamId: string): Promise<{ created: number }> {
  const response = await fetch(`/api/teams/${teamId}/sync-calendar`, { method: 'POST' })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? 'Sync failed')
  return body as { created: number }
}
