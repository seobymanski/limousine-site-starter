'use client'
import React from 'react'
import Link from 'next/link'
import { brand } from '../lib/brand'

/**
 * Gradient header above the dashboard cards. Dark ink gradient with a
 * brand-accent "New Content" CTA and a subtle outline "View Live Site"
 * link. Colors come from lib/brand.ts.
 *
 * Update the live-site URL when configuring a new client — the
 * starter's CORS list still uses https://example.com as the
 * placeholder, so we mirror that here.
 */
const DashboardHeader: React.FC = () => {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
        borderRadius: 8,
        padding: '8px 16px',
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}
    >
      <div>
        <h2
          style={{
            margin: '0 0 1px',
            fontSize: 16,
            fontWeight: 900,
            color: '#ffffff',
            fontFamily: 'system-ui, sans-serif',
            letterSpacing: '-0.2px',
          }}
        >
          {greeting}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.7)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Manage city pages, FBO/airport pages, blog posts, and contact submissions.
        </p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Link
          href="/admin/collections/blog-posts/create"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: brand.primary,
            color: brand.onPrimary,
            fontWeight: 800,
            fontSize: 11,
            padding: '7px 14px',
            borderRadius: 6,
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          + New Content
        </Link>
        <a
          href="https://example.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: 11,
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid rgba(255, 255, 255, 0.3)',
            textDecoration: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontFamily: 'system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}
        >
          View Live Site
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default DashboardHeader
