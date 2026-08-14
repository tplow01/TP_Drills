'use client'

import { useState } from 'react'
import { typesFor, typeLabel } from '@/lib/taxonomy'
import { updateSessionThemes } from '@/lib/sessions'
import type { DrillType, Library } from '@/lib/types'

export function SessionThemePicker({
  sessionId,
  library,
  initialThemes,
}: {
  sessionId: string
  library: Library
  initialThemes: DrillType[]
}) {
  const [themes, setThemes] = useState<DrillType[]>(initialThemes)
  const [pending, setPending] = useState(false)
  const options = typesFor(library)

  async function toggle(type: DrillType) {
    const next = themes.includes(type)
      ? themes.filter((t) => t !== type)
      : [...themes, type]
    setThemes(next)
    setPending(true)
    try {
      await updateSessionThemes(sessionId, next)
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <div className="lbl" style={{ marginBottom: 6 }}>Session theme</div>
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
        {options.map((type) => {
          const selected = themes.includes(type)
          return (
            <button
              key={type}
              type="button"
              disabled={pending}
              onClick={() => toggle(type)}
              className="theme-chip"
              data-selected={selected ? 'true' : 'false'}
            >
              {typeLabel(type)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
