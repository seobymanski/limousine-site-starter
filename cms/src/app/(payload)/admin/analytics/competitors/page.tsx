import React from 'react'
import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { Gutter } from '@payloadcms/ui'
import { getPayload } from 'payload'
import config from '@payload-config'
import CompetitorsManager from '@/components/analytics/CompetitorsManager'

export const dynamic = 'force-dynamic'

function normalizeDomain(input: string): string {
  let d = (input ?? '').trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.replace(/^www\./, '')
  d = d.split('/')[0]
  d = d.split('?')[0]
  return d
}

export default async function TrackedCompetitorsPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/admin/login')

  const result = await payload.find({
    collection: 'tracked-competitors',
    sort: 'domain',
    limit: 500,
    depth: 0,
  })

  // One-time legacy cleanup: rows entered before normalization landed may have
  // https://www. prefixes. Normalize the stored value so the runner queries
  // DataForSEO with the bare domain (and the dashboard reads consistently).
  for (const doc of result.docs as any[]) {
    const cleaned = normalizeDomain(doc.domain ?? '')
    if (cleaned && cleaned !== doc.domain) {
      try {
        await payload.update({
          collection: 'tracked-competitors',
          id: doc.id,
          data: { domain: cleaned } as any,
        })
        doc.domain = cleaned
      } catch {
        // Best-effort — if it fails we'll try again on next page load
      }
    }
  }

  const rows = (result.docs as any[]).map((d) => ({
    id: d.id,
    domain: d.domain ?? '',
    label: d.label ?? null,
    active: Boolean(d.active),
    notes: d.notes ?? null,
  }))

  return (
    <Gutter>
      <PageHeader />
      <CompetitorsManager initialRows={rows} />
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
        Tracked Competitors
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Domains analyzed weekly via DataForSEO. Each yields traffic estimate, ranked-keyword count, overlap with your site, and a content gap list.
      </p>
    </div>
  </div>
)
