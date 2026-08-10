import { createServerClient } from './supabase/server'
import type { Diagram } from './types'

/**
 * Server-only reads, split out from `./diagrams` for the same reason
 * `drills-server.ts` is split from `drills.ts`: `next/headers` (pulled in by
 * the server Supabase client) must never end up in a client bundle.
 */

/** Server-side. Every diagram for one drill, in position order. */
export async function listDiagramsForDrill(drillId: string): Promise<Diagram[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('drill_diagram')
    .select('*')
    .eq('drill_id', drillId)
    .order('position', { ascending: true })
  if (error) throw new Error(`Failed to list diagrams: ${error.message}`)
  return data as Diagram[]
}

/**
 * Server-side. Every diagram for a set of drills, grouped by drill id — the
 * pitchside Session view's shape, one aggregate query instead of one per
 * drill (same tradeoff as drillCountsBySession in sessions-server.ts).
 */
export async function diagramsByDrillId(drillIds: string[]): Promise<Record<string, Diagram[]>> {
  if (drillIds.length === 0) return {}
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('drill_diagram')
    .select('*')
    .in('drill_id', drillIds)
    .order('position', { ascending: true })
  if (error) throw new Error(`Failed to load diagrams: ${error.message}`)

  const grouped: Record<string, Diagram[]> = {}
  for (const diagram of data as Diagram[]) {
    const existing = grouped[diagram.drill_id] ?? []
    existing.push(diagram)
    grouped[diagram.drill_id] = existing
  }
  return grouped
}

/**
 * Server-side. Does not filter on the parent drill's deleted_at — a diagram
 * on a soft-deleted drill still renders in past sessions, same reasoning as
 * getDrill in drills-server.ts.
 */
export async function getDiagram(id: string): Promise<Diagram | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase.from('drill_diagram').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Failed to load diagram: ${error.message}`)
  return (data as Diagram) ?? null
}
