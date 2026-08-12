// src/components/diagrams/DrillMetadataPanel.tsx
'use client'

import { useState } from 'react'
import type { Drill, DrillInput } from '@/lib/types'
import type { DerivedDrillMetadata } from '@/lib/diagram-metadata'
import { AGE_BANDS, typeLabel, typesFor } from '@/lib/taxonomy'

const cardStyle: React.CSSProperties = {
  background: '#ffffff', border: '1px solid #e4e7ec', borderRadius: 14,
  boxShadow: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.1)',
}

/**
 * Shown only on the diagram-first entry path (spec: add-drill experience,
 * 2026-08-12) — editing an existing drill's second/third diagram via
 * DiagramGallery does not pass this in, since taxonomy is already set for
 * that drill. Two layouts: `sidebar` (desktop, always expanded) and `chip`
 * (mobile, collapsed to a summary pill until tapped).
 */
export function DrillMetadataPanel({
  drill,
  derived,
  onPatch,
  variant,
}: {
  drill: Drill
  derived: DerivedDrillMetadata
  onPatch: (patch: Partial<DrillInput>) => void
  variant: 'sidebar' | 'chip'
}) {
  const [expanded, setExpanded] = useState(variant === 'sidebar')
  const equipmentSummary = `${derived.conesNeeded} cones · ${derived.goalsNeeded} goals`
  const summary = `${derived.playerCount} players · ${equipmentSummary}`

  if (variant === 'chip' && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
          background: '#101828', color: '#ffffff', border: 'none', fontSize: 12, fontWeight: 600,
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
      >
        {summary}
      </button>
    )
  }

  const content = (
    <>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#667085', marginBottom: 10 }}>
        Detected
      </div>
      <div style={{ fontSize: 13, color: '#101828', marginBottom: 4 }}>
        Players:{' '}
        <input
          type="number"
          min={0}
          value={drill.players_min ?? derived.playerCount}
          onChange={(e) => onPatch({ players_min: e.target.value === '' ? null : Number(e.target.value) })}
          style={{ width: 48, border: '1px solid #e4e7ec', borderRadius: 6, padding: '2px 6px' }}
        />
      </div>
      <div style={{ fontSize: 13, color: '#101828', marginBottom: 4 }}>{equipmentSummary}</div>

      {derived.suggestedTags.length > 0 && (
        <div style={{ marginTop: 10, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 6 }}>Suggested tags</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {derived.suggestedTags.map((tag) => {
              const active = drill.tags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => onPatch({ tags: active ? drill.tags.filter((t) => t !== tag) : [...drill.tags, tag] })}
                  style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    background: active ? '#f0fdf4' : '#f9fafb',
                    border: active ? '1.5px solid #16a34a' : '1px solid #e4e7ec',
                    color: active ? '#16a34a' : '#475467',
                  }}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 6 }}>Age band</div>
        <select
          value={drill.age_band ?? ''}
          onChange={(e) => onPatch({ age_band: e.target.value === '' ? null : (e.target.value as Drill['age_band']) })}
          style={{ width: '100%', border: '1px solid #e4e7ec', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}
        >
          <option value="">Choose…</option>
          {AGE_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#667085', marginBottom: 6 }}>Type</div>
        <select
          value={drill.type}
          onChange={(e) => onPatch({ type: e.target.value as Drill['type'] })}
          style={{ width: '100%', border: '1px solid #e4e7ec', borderRadius: 8, padding: '6px 8px', fontSize: 12 }}
        >
          {typesFor(drill.library).map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
      </div>
    </>
  )

  if (variant === 'sidebar') {
    return <div style={{ width: 220, flex: 'none', padding: 16, ...cardStyle }}>{content}</div>
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', zIndex: 10 }}>
      <div style={{ width: '100%', padding: 20, borderRadius: '18px 18px 0 0', ...cardStyle }}>
        {content}
        <button
          onClick={() => setExpanded(false)}
          style={{ marginTop: 14, width: '100%', padding: '10px 0', borderRadius: 10, cursor: 'pointer', background: '#101828', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13 }}
        >
          Done
        </button>
      </div>
    </div>
  )
}
