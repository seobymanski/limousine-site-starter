'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  label: string
  href: string
  id: string
}

const ITEMS: NavItem[] = [
  { label: 'Overview', href: '/admin/analytics/overview', id: 'nav-analytics-overview' },
  { label: 'Tracked Keywords', href: '/admin/analytics/keywords', id: 'nav-tracked-keywords' },
  { label: 'Tracked Competitors', href: '/admin/analytics/competitors', id: 'nav-tracked-competitors' },
  { label: 'LLM Prompts', href: '/admin/analytics/llm-prompts', id: 'nav-llm-prompts' },
]

const AnalyticsNavLinks: React.FC = () => {
  const pathname = usePathname()

  return (
    <div className="nav-group">
      <div className="nav-group__toggle" style={{ cursor: 'default' }}>
        <div className="nav-group__label">Analytics</div>
      </div>
      <div className="nav-group__content">
        {ITEMS.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          if (isActive) {
            return (
              <div key={item.id} className="nav__link" id={item.id}>
                <div className="nav__link-indicator" />
                <span className="nav__link-label">{item.label}</span>
              </div>
            )
          }
          return (
            <Link key={item.id} className="nav__link" href={item.href} id={item.id} prefetch={false}>
              <span className="nav__link-label">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default AnalyticsNavLinks
