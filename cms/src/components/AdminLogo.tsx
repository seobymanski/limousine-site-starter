'use client'
import React from 'react'

const AdminLogo: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        background: '#111',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: '0.05em',
        fontFamily: '"Cormorant Garamond", "Garamond", serif',
      }}
    >
      II
    </div>
    <span
      style={{
        fontWeight: 700,
        fontSize: 16,
        color: '#111',
        letterSpacing: '0.04em',
        fontFamily: '"Cormorant Garamond", "Garamond", serif',
        textTransform: 'uppercase',
      }}
    >
      [BRAND]
    </span>
  </div>
)

export default AdminLogo
