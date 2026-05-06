'use client'
import React from 'react'
import Link from 'next/link'

const DashboardHeader: React.FC = () => {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #111 0%, #1a1a1a 100%)',
        borderRadius: 12,
        padding: '32px 36px',
        marginBottom: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 16,
              color: '#111',
              letterSpacing: '0.05em',
              fontFamily: '"Cormorant Garamond", "Garamond", serif',
            }}
          >
            II
          </div>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 900,
              color: '#fff',
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '-0.3px',
            }}
          >
            {greeting}
          </h2>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'system-ui, sans-serif',
            paddingLeft: 52,
          }}
        >
          Manage city pages, FBO/airport pages, blog posts, and contact submissions.
        </p>
      </div>
      <Link
        href="/admin/collections/blog-posts/create"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: '#fff',
          color: '#111',
          fontWeight: 700,
          fontSize: 12,
          padding: '10px 20px',
          borderRadius: 8,
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: '"Cormorant Garamond", "Garamond", serif',
          whiteSpace: 'nowrap',
        }}
      >
        + New Content
      </Link>
    </div>
  )
}

export default DashboardHeader
