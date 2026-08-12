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
  patch: { title: string | null; elements: DiagramInput['elements']; sequence_group?: string },
): Promise<Diagram> {
  const supabase = createBrowserClient()
  const { data, error } = await supabase.from('drill_diagram').update(patch).eq('id', id).select().single()
  if (error) throw new Error(`Failed to update diagram: ${error.message}`)
  return data as Diagram
}

/**
 * "+ New step" (add-drill experience design, 2026-08-12): starts the next
 * step in a sequence from a copy of `source`'s elements, since most step
 * transitions only move a few things rather than starting from a blank
 * canvas. If `source` isn't part of a sequence yet, this is the moment one
 * begins — a fresh group id is generated and written back onto `source` too,
 * so the two diagrams become Step 1 and Step 2 of the same group.
 */
export async function createDiagramStep(source: Diagram, nextPosition: number): Promise<Diagram> {
  const sequenceGroup = source.sequence_group ?? crypto.randomUUID()
  if (source.sequence_group === null) {
    await updateDiagram(source.id, { title: source.title, elements: source.elements, sequence_group: sequenceGroup })
  }

  const supabase = createBrowserClient()
  const { data, error } = await supabase
    .from('drill_diagram')
    .insert({
      drill_id: source.drill_id,
      position: nextPosition,
      title: null,
      pitch_preset: source.pitch_preset,
      elements: source.elements,
      sequence_group: sequenceGroup,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create diagram step: ${error.message}`)
  return data as Diagram
}

export async function deleteDiagram(id: string): Promise<void> {
  const supabase = createBrowserClient()
  const { error } = await supabase.from('drill_diagram').delete().eq('id', id)
  if (error) throw new Error(`Failed to delete diagram: ${error.message}`)
}
