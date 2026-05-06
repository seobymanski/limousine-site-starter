'use client'
import React, { useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

const SecretField: TextFieldClientComponent = ({ path }) => {
  const { value, setValue } = useField<string>({ path: path ?? 'anthropicApiKey' })
  const [visible, setVisible] = useState(false)

  const masked = value
    ? value.slice(0, 10) + '•'.repeat(Math.max(0, value.length - 14)) + value.slice(-4)
    : ''

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        style={{
          display: 'block',
          fontSize: '0.75rem',
          fontWeight: 600,
          marginBottom: '0.35rem',
          color: 'var(--theme-elevation-600, #666)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Claude API Key
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          value={value ?? ''}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-ant-api03-..."
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.6rem 3rem 0.6rem 0.6rem',
            border: '1px solid var(--theme-elevation-150, #ccc)',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontFamily: 'monospace',
            background: 'var(--theme-elevation-0, #fff)',
            color: 'var(--theme-elevation-900, #111)',
          }}
        />
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--theme-elevation-500, #888)',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
          title={visible ? 'Hide key' : 'Show key'}
        >
          {visible ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </div>
      <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--theme-elevation-500, #888)', lineHeight: 1.5 }}>
        Your Anthropic API key (starts with sk-ant-). Get one at console.anthropic.com.
      </p>
    </div>
  )
}

export default SecretField
