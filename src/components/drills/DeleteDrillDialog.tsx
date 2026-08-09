'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { softDeleteDrill } from '@/lib/drills'
import { Button } from '@/components/ui/Button'

export function DeleteDrillDialog({
  drillId,
  drillName,
  sessionCount,
  backHref = '/drills',
}: {
  drillId: string
  drillName: string
  sessionCount: number
  /** Where to land after deleting — carries the list's filter state. */
  backHref?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Spec 9: the confirmation names the consequence, not a generic warning.
  const consequence =
    sessionCount === 0
      ? 'It is not used in any session.'
      : `It is used in ${sessionCount} session${sessionCount > 1 ? 's' : ''}. Those sessions keep it, marked as removed from the library.`

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await softDeleteDrill(drillId)
      router.push(backHref)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Delete
      </Button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 30 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius)', padding: 20, maxWidth: 400 }}>
            <h3 style={{ fontSize: 18 }}>Delete {drillName}?</h3>
            <p style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 10 }}>{consequence}</p>
            {error && (
              <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
              <Button onClick={confirm} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete'}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Keep it
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
