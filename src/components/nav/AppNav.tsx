'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/sessions', label: 'Sessions' },
  { href: '/drills', label: 'Drills' },
] as const

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="app-nav">
      <div className="app-nav-inner">
        <span className="app-nav-brand">TP DRILLS</span>
        <div className="app-nav-tabs">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="app-nav-tab"
                data-active={active ? 'true' : 'false'}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
