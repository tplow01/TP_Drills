import { createBrowserClient } from './supabase/client'
import type { Diagram, DiagramInput } from './types'

/** Browser-side writes, safe to import from client components. */

export async function createDiagram(input: DiagramInput): Promise<Diagram> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill_diagram').insert(input).select().single()
  if (error) throw new Error(`Failed to save diagram: ${error.message}`)
  return data as Diagram
}

/**
 * `pitch_preset` and `drill_id` are deliberately not part of the patch type —
 * the background is fixed at creation (design decision: no in-place preset
 * switching) and a diagram's parent drill never changes.
 */
export async function updateDiagram(
  id: string,
  patch: { title: string | null; elements: DiagramInput['elements'] },
): Promise<Diagram> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill_diagram').update(patch).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update diagram: ${error.message}`)
  return data as Diagram
}

export async function deleteDiagram(id: string): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('drill_diagram').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete diagram: ${error.message}`)
}
