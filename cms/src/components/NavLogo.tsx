'use client'
import React from 'react'
import Link from 'next/link'
import { brand } from '../lib/brand'

/**
 * Wordmark at the top of the admin sidebar. The starter sidebar is dark
 * ink, so we use `mix-blend-mode: screen` to blend out any near-black
 * pixels in the source logo without us having to regenerate the asset.
 *
 * Per-client: drop a new `public/brand/logo.svg` (or .png) and the
 * sidebar picks it up automatically. The placeholder ships with the
 * starter and renders a "YOUR BRAND" wordmark.
 */
const NavLogo: React.FC = () => (
  <div
    style={{
      padding: '20px 18px 14px',
      borderBottom: `1px solid ${brand.sidebarLinkBg}`,
      marginBottom: 8,
      display: 'flex',
      justifyContent: 'center',
    }}
  >
    <Link
      href="/admin"
      aria-label="Back to dashboard"
      style={{
        display: 'block',
        textDecoration: 'none',
      }}
    >
      <img
        src="/brand/logo.svg"
        alt="Brand"
        width={170}
        height={60}
        style={{
          display: 'block',
          width: 170,
          height: 'auto',
          mixBlendMode: 'screen',
        }}
      />
    </Link>
  </div>
)

export default NavLogo
