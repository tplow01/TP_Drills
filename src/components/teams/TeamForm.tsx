'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createTeam } from '@/lib/teams'
import { AGE_BANDS } from '@/lib/taxonomy'
import type { AgeBand, Library } from '@/lib/types'

export function TeamForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [library, setLibrary] = useState<Library>('outfield')
  const [ageBand, setAgeBand] = useState<AgeBand | ''>('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const team = await createTeam({
        name,
        library,
        age_band: library === 'outfield' && ageBand !== '' ? ageBand : null,
        byga_url: null,
      })
      router.push(`/teams/${team.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label>
        <div className="lbl" style={{ marginBottom: 4 }}>Team name</div>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
        />
      </label>

      <label>
        <div className="lbl" style={{ marginBottom: 4 }}>Type</div>
        <select
          value={library}
          onChange={(e) => setLibrary(e.target.value as Library)}
          style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
        >
          <option value="outfield">Outfield</option>
          <option value="goalkeeping">Goalkeeping</option>
        </select>
      </label>

      {library === 'outfield' && (
        <label>
          <div className="lbl" style={{ marginBottom: 4 }}>Age band</div>
          <select
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as AgeBand)}
            style={{ width: '100%', background: 'var(--field-bg)', border: '1px solid var(--control-border)', borderRadius: 8, padding: '8px 10px', color: 'var(--ink)' }}
          >
            <option value="">Select…</option>
            {AGE_BANDS.map((band) => <option key={band} value={band}>{band}</option>)}
          </select>
        </label>
      )}

      <button type="submit" disabled={saving || name.trim() === ''} className="header-cta" style={{ alignSelf: 'flex-start' }}>
        {saving ? 'Creating…' : 'Create team'}
      </button>
    </form>
  )
}
