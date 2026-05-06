'use client'
import React from 'react'

const NavLogo: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '20px 16px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      marginBottom: 8,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: '#fff',
        color: '#111',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.05em',
        fontFamily: '"Cormorant Garamond", "Garamond", serif',
        flexShrink: 0,
      }}
    >
      II
    </div>
    <div style={{ lineHeight: 1.2 }}>
      <div
        style={{
          fontWeight: 700,
          fontSize: 13,
          color: '#fff',
          letterSpacing: '0.04em',
          fontFamily: '"Cormorant Garamond", "Garamond", serif',
          textTransform: 'uppercase',
        }}
      >
        [BRAND]
      </div>
    </div>
  </div>
)

export default NavLogo
