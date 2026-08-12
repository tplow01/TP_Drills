'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createDrill } from '@/lib/drills'
import { typesFor } from '@/lib/taxonomy'
import type { DrillInput, Library } from '@/lib/types'

/**
 * "Start with a diagram" entry point (add-drill experience design,
 * 2026-08-12): creates a minimal draft drill immediately — drill_diagram
 * rows require an existing drill_id — then hands off to the diagram editor
 * itself. The coach never sees this screen; it's a one-tick redirect.
 */
export default function NewDrillFromDiagramPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const library: Library = searchParams.get('library') === 'goalkeeping' ? 'goalkeeping' : 'outfield'
    const input: DrillInput = {
      library, name: 'Untitled drill', type: typesFor(library)[0], age_band: null,
      suitable_from: null, duration_mins: null, players_min: null, players_max: null,
      goals_needed: 0, cones_needed: 0, bibs_needed: false, image_url: null,
      setup: [], how_it_works: [], coaching_points: [], progressions: null,
      source: null, tags: [], is_draft: true,
    }

    createDrill(input)
      .then((drill) => router.replace(`/drills/${drill.id}/diagrams/new?entry=diagram`))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to start drill'))
  }, [router, searchParams])

  return (
    <main style={{ padding: 40, textAlign: 'center' }}>
      {error ? (
        <p style={{ color: 'var(--accent)', fontSize: 13 }}>{error}</p>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--ink-45)' }}>Setting up your canvas…</p>
      )}
    </main>
  )
}
