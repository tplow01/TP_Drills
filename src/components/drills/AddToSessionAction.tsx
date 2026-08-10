'use client'

import { useState } from 'react'
import { addDrillToSession } from '@/lib/sessions'
import { Button } from '@/components/ui/Button'

/**
 * Add-to-session action for the drill detail screen (spec 6.3: drill detail
 * lists add-to-session alongside edit/delete). Only rendered when the
 * screen was reached with a `session` id on the URL — the same tray-arrival
 * signal drills/[id]/page.tsx already derives for its back link — so an
 * ordinary visit to a drill never grows session-builder furniture it didn't
 * ask for.
 *
 * Deliberately a single action reusing `addDrillToSession`, not a rebuilt
 * tray or session summary — the tray itself lives on the Planner/Drills
 * screens (spec 7.4). Mirrors DrillsBrowser.handleAdd's error/busy/added
 * pattern so a coach arriving here from the tray gets the same feedback.
 */
export function AddToSessionAction({
  sessionId,
  drillId,
  drillName,
  disabled = false,
}: {
  sessionId: string
  drillId: string
  drillName: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (busy || added || disabled) return
    setBusy(true)
    setError(null)
    try {
      await addDrillToSession(sessionId, drillId)
      setAdded(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to add ${drillName}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <Button
        variant={added ? 'secondary' : 'primary'}
        onClick={handleAdd}
        disabled={disabled || busy || added}
      >
        {added ? 'Added' : busy ? 'Adding…' : 'Add to session'}
      </Button>
      {error && (
        <div style={{ fontSize: 11, color: 'var(--accent)', maxWidth: 220, textAlign: 'right' }}>
          {error}
        </div>
      )}
    </div>
  )
}
