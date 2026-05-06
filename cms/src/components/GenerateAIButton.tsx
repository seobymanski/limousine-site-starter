'use client'

import React, { useEffect, useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

interface PostType {
  slug: string
  label: string
  defaultCategory?: string
}

type RegenerateField = 'title' | 'excerpt' | 'body' | 'seo' | 'slug'

const GenerateAIButton: UIFieldClientComponent = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [regenLoading, setRegenLoading] = useState<RegenerateField | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [postType, setPostType] = useState<string>('')
  const [postTypes, setPostTypes] = useState<PostType[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<
    Array<{ id: number | string; title: string; slug: string; category?: string }>
  >([])
  const [angleSuggestions, setAngleSuggestions] = useState<string[]>([])

  const { value: title, setValue: setTitle } = useField<string>({ path: 'title' })
  const { value: currentSlug, setValue: setSlug } = useField<string>({ path: 'slug' })
  const { value: excerpt, setValue: setExcerpt } = useField<string>({ path: 'excerpt' })
  const { setValue: setBody } = useField<unknown>({ path: 'body' })
  const { value: category, setValue: setCategory } = useField<string>({ path: 'category' })
  const { setValue: setReadingTime } = useField<number>({ path: 'readingTime' })
  const { value: seoTitle, setValue: setSeoTitle } = useField<string>({ path: 'seo.metaTitle' })
  const { value: seoDesc, setValue: setSeoDescription } = useField<string>({ path: 'seo.metaDescription' })
  const { setValue: setTags } = useField<unknown>({ path: 'tags' })
  const { setValue: setLocationSections } = useField<unknown>({ path: 'locationSections' })
  const { setValue: setAirportSections } = useField<unknown>({ path: 'airportSections' })

  // Detect if content already exists (editing an existing post)
  useEffect(() => {
    if (title && title.trim().length > 3) setHasGenerated(true)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/post-types')
        if (!res.ok) return
        const data = (await res.json()) as { postTypes?: PostType[] }
        if (!cancelled && Array.isArray(data.postTypes)) {
          setPostTypes(data.postTypes)
        }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [])

  function triggerSave() {
    setTimeout(() => {
      const saveBtn = document.querySelector<HTMLButtonElement>(
        'button[type="button"][id="action-save"],button[type="submit"],#action-save'
      )
      if (saveBtn) saveBtn.click()
      else {
        const form = document.querySelector<HTMLFormElement>('form[method="POST"], form.collection-edit, form.global-edit, main form')
        if (form) form.requestSubmit()
      }
    }, 500)
  }

  async function generate() {
    setError(null)
    if (!hint.trim()) {
      setError('Provide content context so Claude knows what to write about.')
      return
    }

    // Step 1: scan for existing posts on the same topic before spending
    // tokens on a full generation. If matches come back, surface them and
    // let the user pick a fresh angle (or proceed anyway).
    setIsChecking(true)
    try {
      const checkRes = await fetch('/api/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hint: hint.trim(),
          postType: postType || undefined,
          category: category || undefined,
        }),
      })
      if (checkRes.ok) {
        const data = (await checkRes.json()) as {
          duplicates: boolean
          matches?: typeof duplicateMatches
          angles?: string[]
        }
        if (data.duplicates && Array.isArray(data.matches) && data.matches.length > 0) {
          setDuplicateMatches(data.matches)
          setAngleSuggestions(Array.isArray(data.angles) ? data.angles : [])
          setIsChecking(false)
          return
        }
      }
    } catch (err) {
      console.warn('[GenerateAIButton] duplicate check failed, proceeding anyway', err)
    } finally {
      setIsChecking(false)
    }

    await runGenerate(hint.trim())
  }

  async function runGenerate(promptHint: string) {
    setError(null)
    setDuplicateMatches([])
    setAngleSuggestions([])
    setIsLoading(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, hint: promptHint, postType: postType || undefined }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as Record<string, unknown>

      if (data.title) setTitle(data.title as string)
      if (data.slug) setSlug(data.slug as string)
      if (data.excerpt) setExcerpt(data.excerpt as string)
      if (data.body) setBody(data.body)
      if (data.category) setCategory(data.category as string)
      if (typeof data.readingTime === 'number') setReadingTime(data.readingTime)
      if (data.seoTitle) setSeoTitle(data.seoTitle as string)
      if (data.seoDescription) setSeoDescription(data.seoDescription as string)
      if (Array.isArray(data.tags) && data.tags.length > 0) {
        setTags(data.tags.map((t: string) => ({ tag: t })))
      }
      if (data.locationSections && typeof data.locationSections === 'object') {
        setLocationSections(data.locationSections)
      }
      if (data.airportSections && typeof data.airportSections === 'object') {
        setAirportSections(data.airportSections)
      }
      if (!data.slug && !currentSlug) {
        const finalTitle = (data.title as string) || title
        if (finalTitle) {
          setSlug(finalTitle.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 80))
        }
      }
      setHasGenerated(true)
      triggerSave()
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? 'Something went wrong generating content.')
    } finally {
      setIsLoading(false)
    }
  }

  async function regenerate(field: RegenerateField) {
    setError(null)
    setRegenLoading(field)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          hint: hint.trim() || undefined,
          postType: postType || undefined,
          regenerateField: field,
          existingContent: {
            title: title ?? '',
            excerpt: excerpt ?? '',
            seoTitle: seoTitle ?? '',
            seoDescription: seoDesc ?? '',
          },
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as Record<string, unknown>

      if (field === 'title' && data.title) setTitle(data.title as string)
      if (field === 'slug' && data.slug) setSlug(data.slug as string)
      if (field === 'excerpt' && data.excerpt) setExcerpt(data.excerpt as string)
      if (field === 'body' && data.body) setBody(data.body)
      if (field === 'seo') {
        if (data.seoTitle) setSeoTitle(data.seoTitle as string)
        if (data.seoDescription) setSeoDescription(data.seoDescription as string)
      }

      triggerSave()
    } catch (err: any) {
      console.error(err)
      setError(err?.message ?? `Failed to regenerate ${field}.`)
    } finally {
      setRegenLoading(null)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid var(--theme-elevation-150, #ccc)',
    borderRadius: '4px',
    fontSize: '0.85rem',
    marginBottom: '0.75rem',
    fontFamily: 'inherit',
    background: 'white',
    color: '#111',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '0.25rem',
    color: 'var(--theme-elevation-600, #666)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const regenBtnStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    border: '1px solid var(--theme-elevation-200, #ddd)',
    borderRadius: 6,
    background: active ? '#eee' : 'white',
    color: active ? '#999' : '#333',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: active ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  })

  const refreshIcon = (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )

  return (
    <div
      style={{
        marginBottom: '1rem',
        padding: '1rem',
        border: '1px solid var(--theme-elevation-100, #e5e5e5)',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, rgba(255,199,0,0.04), rgba(255,199,0,0.1))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '1.25rem' }}>✨</span>
        <strong style={{ fontSize: '0.95rem' }}>AI Content Generator</strong>
      </div>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: 'var(--theme-elevation-600, #666)', lineHeight: 1.5 }}>
        Pick a post type, describe what to write about, then Generate. Claude creates the title, body, excerpt, SEO, and tags.
      </p>

      {postTypes.length > 0 && (
        <>
          <label style={labelStyle}>Post Type</label>
          <select value={postType} onChange={(e) => setPostType(e.target.value)} disabled={isLoading || !!regenLoading} style={inputStyle}>
            <option value="">— Choose a type (or leave blank for base prompt) —</option>
            {postTypes.map((pt) => (<option key={pt.slug} value={pt.slug}>{pt.label}</option>))}
          </select>
        </>
      )}

      <label style={labelStyle}>Content Context</label>
      <textarea
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        placeholder="What should Claude write about? Include key details: buildings, people, dates, locations, angles to take..."
        rows={3}
        style={{ ...inputStyle, resize: 'vertical' }}
        disabled={isLoading || !!regenLoading}
        required
      />

      {duplicateMatches.length > 0 && (
        <div style={{
          margin: '0.75rem 0',
          padding: '0.85rem 1rem',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          borderRadius: 8,
          background: 'rgba(245, 158, 11, 0.06)',
        }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 700, color: '#92400e' }}>
            ⚠ You already have {duplicateMatches.length === 1 ? 'a published post' : `${duplicateMatches.length} published posts`} on this topic
          </p>
          <ul style={{ margin: '0 0 0.75rem', padding: '0 0 0 1.1rem', fontSize: '0.8rem', color: '#444' }}>
            {duplicateMatches.map((m) => (
              <li key={m.id} style={{ marginBottom: 4 }}>
                <a href={`/admin/collections/blog-posts/${m.id}`} target="_blank" rel="noreferrer" style={{ color: '#92400e', textDecoration: 'underline' }}>
                  {m.title}
                </a>
                {m.category && (
                  <span style={{ color: '#888', marginLeft: 6, textTransform: 'capitalize' }}>
                    ({m.category.replace(/-/g, ' ')})
                  </span>
                )}
              </li>
            ))}
          </ul>

          {angleSuggestions.length > 0 && (
            <>
              <p style={{ margin: '0 0 0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Try a different angle
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: '0.75rem' }}>
                {angleSuggestions.map((angle, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setHint(angle); runGenerate(angle) }}
                    disabled={isLoading}
                    style={{
                      textAlign: 'left',
                      padding: '0.55rem 0.75rem',
                      background: 'white',
                      border: '1px solid var(--theme-elevation-200, #ddd)',
                      borderRadius: 6,
                      fontSize: '0.82rem',
                      lineHeight: 1.4,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      color: '#222',
                    }}
                  >
                    {angle}
                  </button>
                ))}
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => runGenerate(hint.trim())}
              disabled={isLoading}
              style={{
                padding: '0.4rem 0.85rem',
                background: '#fff',
                color: '#92400e',
                border: '1px solid #92400e',
                borderRadius: 6,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Write it anyway
            </button>
            <button
              type="button"
              onClick={() => { setDuplicateMatches([]); setAngleSuggestions([]) }}
              disabled={isLoading}
              style={{
                padding: '0.4rem 0.85rem',
                background: 'transparent',
                color: '#666',
                border: 'none',
                fontSize: '0.78rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={generate}
        disabled={isLoading || isChecking || !!regenLoading || !hint.trim() || duplicateMatches.length > 0}
        style={{
          padding: '0.6rem 1.2rem',
          background: (isLoading || isChecking) ? '#aaa' : '#FFC700',
          color: '#111',
          border: 'none',
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: isLoading || isChecking || !!regenLoading || !hint.trim() || duplicateMatches.length > 0 ? 'not-allowed' : 'pointer',
          transition: 'opacity 0.2s',
        }}
      >
        {isChecking ? 'Checking for duplicates…' : isLoading ? 'Generating…' : '✨ Generate with Claude'}
      </button>

      {/* Individual field regeneration buttons */}
      {hasGenerated && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--theme-elevation-150, #e0e0e0)' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--theme-elevation-500, #888)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
            Regenerate individual fields
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {([
              { field: 'title' as RegenerateField, label: 'Title' },
              { field: 'excerpt' as RegenerateField, label: 'Excerpt' },
              { field: 'body' as RegenerateField, label: 'Body' },
              { field: 'seo' as RegenerateField, label: 'SEO' },
              { field: 'slug' as RegenerateField, label: 'Slug' },
            ]).map(({ field, label }) => (
              <button
                key={field}
                type="button"
                onClick={() => regenerate(field)}
                disabled={!!regenLoading || isLoading}
                style={regenBtnStyle(regenLoading === field)}
              >
                {regenLoading === field ? (
                  <span style={{ fontSize: '0.7rem' }}>…</span>
                ) : refreshIcon}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem', color: '#c00' }}>{error}</p>
      )}
    </div>
  )
}

export default GenerateAIButton
