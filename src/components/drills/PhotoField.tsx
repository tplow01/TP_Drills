'use client'

import { useRef, useState } from 'react'
import { uploadDrillImage } from '@/lib/drills'
import { Button } from '@/components/ui/Button'

export function PhotoField({
  value,
  onChange,
}: {
  value: string | null
  onChange: (url: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadDrillImage(file))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>Photo</div>

      <div
        style={{
          background: 'var(--ink)', borderRadius: 'var(--radius-sm)',
          minHeight: 120, display: 'grid', placeItems: 'center',
          padding: 8, overflow: 'hidden',
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', color: 'rgba(21,21,21,0.35)' }}>
            {busy ? 'COMPRESSING…' : 'NO IMAGE'}
          </span>
        )}
      </div>

      {/* capture="environment" opens the camera directly on phone. */}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Button variant="secondary" onClick={() => input.current?.click()} disabled={busy}>
          {value ? 'Replace' : 'Add photo'}
        </Button>
        {value && (
          <Button variant="ghost" onClick={() => onChange(null)}>
            Remove
          </Button>
        )}
      </div>

      {error && <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8 }}>{error}</div>}
    </div>
  )
}
