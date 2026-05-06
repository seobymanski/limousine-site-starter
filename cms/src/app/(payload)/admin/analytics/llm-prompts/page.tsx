import React from 'react'
import Link from 'next/link'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { Gutter } from '@payloadcms/ui'
import { getPayload } from 'payload'
import config from '@payload-config'
import LLMPromptsManager from '@/components/analytics/LLMPromptsManager'

export const dynamic = 'force-dynamic'

export default async function LLMPromptsPage() {
  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/admin/login')

  const result = await payload.find({
    collection: 'llm-target-prompts',
    sort: 'createdAt',
    limit: 500,
    depth: 0,
  })

  const rows = (result.docs as any[]).map((d) => ({
    id: d.id,
    prompt: d.prompt ?? '',
    description: d.description ?? null,
    active: Boolean(d.active),
  }))

  return (
    <Gutter>
      <PageHeader />
      <LLMPromptsManager initialRows={rows} />
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
        LLM Mention Prompts
      </h1>
      <p
        style={{
          margin: 0,
          fontSize: 12,
          color: 'rgba(255, 255, 255, 0.6)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Questions sent weekly to Claude, ChatGPT, and Perplexity. Each response is parsed for citations of your domain and tracked competitors.
      </p>
    </div>
  </div>
)
