'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Phone-only "Teams" trigger opening a bottom sheet with the same key/filter
 * content the sidebar shows on desktop — same pattern as Drills' Filters
 * sheet (spec 2026-08-15). `children` is the sidebar content itself,
 * rendered once by the caller and reused here, exactly like Drills' `panel`.
 */
export function ScheduleMobileTeamsTrigger({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="filter-trigger" style={{ display: 'none', marginBottom: 14 }}>
        <Button variant="secondary" fullWidth onClick={() => setOpen(true)}>
          Teams
        </Button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              maxHeight: '80vh', overflowY: 'auto',
              background: 'var(--ground)',
              borderTop: '1px solid var(--hairline)',
              borderRadius: '16px 16px 0 0', padding: 18,
            }}
          >
            {children}
            <div style={{ marginTop: 12 }}>
              <Button fullWidth onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
