'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDrill } from '@/lib/drills'
import { typesFor } from '@/lib/taxonomy'
import type { DrillInput, Library } from '@/lib/types'

/** Side-effect-only client half of the diagram-first entry point: creates
    the draft drill and redirects into the diagram editor. `library` comes
    from the server-component parent's searchParams, so this component never
    needs useSearchParams() itself. */
export function NewDrillFromDiagramStarter({ library }: { library: Library }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

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
  }, [router, library])

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
