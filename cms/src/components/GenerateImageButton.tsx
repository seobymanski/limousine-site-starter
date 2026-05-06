'use client'

import React, { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

/**
 * Admin button: generate a brand-consistent hero image for the current post
 * via /api/generate-image (Gemini 2.5 Flash Image / Nano Banana).
 *
 * Shown as a UI field on BlogPosts. Only enabled once the post has been saved
 * (because the API needs the post id to look up category + sections for the
 * prompt template).
 */
const GenerateImageButton: UIFieldClientComponent = () => {
  const { id } = useDocumentInfo()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!id) {
    return (
      <div style={{ padding: '12px 0', color: '#888', fontSize: 13, fontStyle: 'italic' }}>
        Save the post first, then come back here to generate a hero image.
      </div>
    )
  }

  async function generate() {
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: id }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { mediaId: string | number; filename: string }
      setSuccess(`Generated ${data.filename}. Reloading...`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
      <button
        type="button"
        onClick={generate}
        disabled={isLoading}
        style={{
          padding: '10px 18px',
          background: isLoading ? '#444' : '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: isLoading ? 'wait' : 'pointer',
          fontSize: 13,
          fontWeight: 500,
          letterSpacing: '0.02em',
          alignSelf: 'flex-start',
        }}
      >
        {isLoading ? 'Generating hero image — this takes ~15-30s' : 'Generate hero image (Nano Banana)'}
      </button>
      <div style={{ fontSize: 12, color: '#888' }}>
        Generates a brand-consistent hero (~$0.04 per image) and attaches it as the featured + banner image. Re-run anytime to replace.
      </div>
      {error && <div style={{ color: '#c33', fontSize: 13 }}>Error: {error}</div>}
      {success && <div style={{ color: '#393', fontSize: 13 }}>{success}</div>}
    </div>
  )
}

export default GenerateImageButton
