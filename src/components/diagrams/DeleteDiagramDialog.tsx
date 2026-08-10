'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { deleteDiagram } from '@/lib/diagrams'
import { Button } from '@/components/ui/Button'

export function DeleteDiagramDialog({
  diagramId,
  onClose,
}: {
  diagramId: string
  onClose: () => void
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await deleteDiagram(diagramId)
      router.refresh()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setBusy(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--scrim)', display: 'grid', placeItems: 'center', padding: 20, zIndex: 30 }}>
      <div style={{ background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius)', padding: 20, maxWidth: 400 }}>
        <h3 style={{ fontSize: 18 }}>Delete this diagram?</h3>
        <p style={{ fontSize: 13, color: 'var(--ink-70)', marginTop: 10 }}>This can&apos;t be undone.</p>
        {error && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 9, marginTop: 18 }}>
          <Button onClick={confirm} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</Button>
          <Button variant="secondary" onClick={onClose}>Keep it</Button>
        </div>
      </div>
    </div>
  )
}
