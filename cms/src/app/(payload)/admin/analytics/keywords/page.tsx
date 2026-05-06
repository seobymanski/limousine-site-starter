import React from 'react'
import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { Gutter } from '@payloadcms/ui'
import { getPayload } from 'payload'
import config from '@payload-config'
import KeywordsManager from '@/components/analytics/KeywordsManager'
import { DEFAULT_LOCATION } from '@/lib/analytics-config'

export const dynamic = 'force-dynamic'

export default async function TrackedKeywordsPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/admin/login')

  const result = await payload.find({
    collection: 'tracked-keywords',
    sort: 'keyword',
    limit: 500,
    depth: 0,
  })

  const rows = (result.docs as any[]).map((d) => ({
    id: d.id,
    keyword: d.keyword ?? '',
    location: d.location ?? DEFAULT_LOCATION,
    active: Boolean(d.active),
    notes: d.notes ?? null,
  }))

  return (
    <Gutter>
      <PageHeader />
      <KeywordsManager initialRows={rows} />
    </Gutter>
  )
}

const PageHeader: React.FC = () => (
  <div
    style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      borderRadius: 12,
      padding: '24px 28px',
      marginBottom: 24,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at top right, rgba(255, 199, 0, 0.15), transparent 60%)',
        pointerEvents: 'none',
      }}
    />
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            padding: '4px 10px',
            background: '#FFC700',
            color: '#111',
            fontSize: 10,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            borderRadius: 4,
          }}
        >
          Analytics
        </span>
        <Link
          href="/admin"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 6,
            textDecoration: 'none',
            border: '1px solid rgba(255,255,255,0.12)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <span aria-hidden="true">←</span> Back to admin
        </Link>
      </div>
      <h1
        style={{
          margin: '0 0 4px',
          fontSize: 24,
          fontWeight: 800,
          color: '#fff',
          letterSpacing: '-0.4px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Tracked Keywords
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Keywords monitored weekly via DataForSEO. Position, search volume, and ranking URL are pulled into the Overview dashboard.
      </p>
    </div>
  </div>
)
