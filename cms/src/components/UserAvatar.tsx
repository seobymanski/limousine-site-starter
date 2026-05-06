'use client'
import React, { useEffect, useState } from 'react'
import { useAuth } from '@payloadcms/ui'

type MediaDoc = { id: number | string; url?: string | null }

const UserAvatar: React.FC = () => {
  const { user } = useAuth()
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)

  const avatar = (user as { avatar?: MediaDoc | number | string | null } | null)?.avatar ?? null
  const name = (user as { name?: string } | null)?.name
  const email = (user as { email?: string } | null)?.email

  useEffect(() => {
    if (!avatar) {
      setMediaUrl(null)
      return
    }
    if (typeof avatar === 'object' && avatar.url) {
      setMediaUrl(avatar.url)
      return
    }
    const id = typeof avatar === 'object' ? avatar.id : avatar
    if (!id) return
    let cancelled = false
    fetch(`/api/media/${id}`, { credentials: 'include' })
      .then((r) => (r.ok ? (r.json() as Promise<MediaDoc>) : null))
      .then((doc) => {
        if (!cancelled && doc?.url) setMediaUrl(doc.url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [avatar])

  const initial = (name || email || '?').charAt(0).toUpperCase()

  const base: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffc700',
    color: '#111',
    fontWeight: 800,
    fontSize: 13,
    overflow: 'hidden',
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1,
    flexShrink: 0,
  }

  if (mediaUrl) {
    return (
      <img
        src={mediaUrl}
        alt={name || email || 'User'}
        style={{ ...base, objectFit: 'cover' }}
      />
    )
  }

  return <span style={base}>{initial}</span>
}

export default UserAvatar
