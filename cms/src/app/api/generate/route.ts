/**
 * POST /api/generate
 *
 * Body: { title: string, hint?: string }
 * Returns: { excerpt, bodyMarkdown, category, tags[], seoTitle, seoDescription, readingTime }
 *
 * Uses Claude to draft a full blog post based on a short title.
 * The admin "Generate with AI" button calls this endpoint, then converts the
 * returned markdown to Lexical and populates the Payload form fields.
 */

import { NextResponse } from 'next/server'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { getPayload } from 'payload'
import {
  convertMarkdownToLexical,
  editorConfigFactory,
} from '@payloadcms/richtext-lexical'
import config from '@payload-config'
import { buildResearchQuery, callPerplexity } from '@/lib/perplexity'

// Static Astro pages that aren't in the CMS but are good internal link targets.
const STATIC_PAGES: Array<{ title: string; url: string }> = [
  { title: 'About [BRAND]', url: '/about' },
  { title: 'Contact', url: '/contact' },
  { title: 'Fleet', url: '/fleet' },
  { title: 'Services', url: '/services' },
  { title: 'Private FBO Transfers', url: '/services/private-fbo-transfers' },
  { title: 'Luxury Ground Transportation', url: '/services/luxury-ground-transportation' },
  { title: 'Charter Bus Service', url: '/services/charter-bus-service' },
  { title: 'Discrete VIP Transportation', url: '/services/discrete-vip-transportation' },
]

// NOTE: This SYSTEM_PROMPT is only a FALLBACK used when AI Settings hasn't been
// configured yet. The real prompt is editable in admin → Settings → AI Settings.
// Update DEFAULT_SYSTEM_PROMPT in cms/src/globals/AISettings.ts for the per-client default.
const SYSTEM_PROMPT = `You are a content writer for [CLIENT NAME].

Voice and tone:
- Professional, specific, and substantive
- Never generic filler. Every sentence should inform, persuade, or build trust

Format:
- Write the body in Markdown (use ##, ###, **, *, -, [links](url), blockquotes)
- First paragraph is a strong hook that draws readers in
- Use 3-5 H2 section headings that structure the post
- Include at least one bulleted or numbered list when relevant
- End with a clear call to action
- Target 600-900 words

SLUG RULES: Use the primary keyword as the slug (2-5 words, hyphen-separated, lowercase). No filler words. Default: NO dates or years. EXCEPTION: for posts in the "events" category, append the event's year so recurring events can coexist year over year (e.g. "annual-gala-2026"). Use the year mentioned in the prompt; if none is given, use the current year.
SEO TITLE RULES: Lead with primary keyword. Keep 50-60 chars total.

IMPORTANT: Respond with a single valid JSON object matching this shape:
{
  "title": "Compelling, specific post title under 80 chars",
  "slug": "primary-keyword-slug",
  "excerpt": "1-2 sentences, 140-160 chars, compelling summary",
  "bodyMarkdown": "full post in markdown, 600-900 words",
  "category": "one of: newsletter, news, building-spotlight, advocacy, events, self-guided-tours, digital-tours",
  "tags": ["tag1", "tag2", "tag3"],
  "seoTitle": "Primary Keyword Phrase | [CLIENT NAME]",
  "seoDescription": "140-160 char meta description ending with a CTA word",
  "readingTime": 4
}

Do NOT include any text before or after the JSON. Do NOT wrap in a code fence.`

interface GenerateRequest {
  title: string
  hint?: string
  postType?: string
  regenerateField?: 'title' | 'excerpt' | 'body' | 'seo' | 'slug'
  existingContent?: {
    title?: string
    excerpt?: string
    bodyMarkdown?: string
    category?: string
    tags?: string[]
    seoTitle?: string
    seoDescription?: string
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRequest
    const { title, hint, postType, regenerateField, existingContent } = body

    if (!regenerateField && (!hint || typeof hint !== 'string' || hint.trim().length < 5)) {
      return NextResponse.json(
        { error: 'Content context is required (at least 5 characters).' },
        { status: 400 },
      )
    }

    // API key priority: AI Settings (admin-editable) → Worker secret → process.env
    let apiKey: string | undefined

    // Load AI settings (key + prompt + model) in one query
    let systemPrompt = SYSTEM_PROMPT
    let model = 'claude-sonnet-4-5'
    let maxTokens = 4096
    let temperature = 0.7
    let defaultCategory: string | undefined
    let internalLinksBlock = ''
    let researchBlock = ''
    let researchCitations: Array<{ url: string; title?: string }> = []
    try {
      const payload = await getPayload({ config })
      const settings = await payload.findGlobal({ slug: 'ai-settings' })

      // Fetch published blog posts for internal linking context
      // Only needed for full generation or body regeneration
      const needsInternalLinks = !regenerateField || regenerateField === 'body'
      if (needsInternalLinks) {
        try {
          const posts = await payload.find({
            collection: 'blog-posts',
            where: { status: { equals: 'published' } },
            sort: '-publishedDate',
            limit: 30,
            depth: 0,
            select: { title: true, slug: true, category: true },
          })
          const postLinks = posts.docs
            .filter((p: any) => p.slug && p.title)
            .map((p: any) => `- [${p.title}](/blog/${p.slug})${p.category ? ` — ${p.category}` : ''}`)
          const staticLinks = STATIC_PAGES.map((p) => `- [${p.title}](${p.url})`)

          if (postLinks.length > 0 || staticLinks.length > 0) {
            internalLinksBlock = `\n\n---\n\nAVAILABLE INTERNAL LINKS FOR THIS SITE:

Site pages:
${staticLinks.join('\n')}

Published blog posts:
${postLinks.join('\n')}

INTERNAL LINKING RULES (MANDATORY):
- Add 2-4 internal links in the body, using ONLY the URLs from the list above.
- Link when topically relevant — do not force links where they don't fit.
- Use descriptive, keyword-rich anchor text (the page title or a close variant), not "click here" or bare URLs.
- Never invent URLs. If nothing above is relevant, include fewer or zero links rather than making one up.
- Spread links across the body. Do not cluster them in one paragraph.`
          }
        } catch (err) {
          console.warn('[/api/generate] could not fetch internal links', err)
        }
      }

      if (settings?.systemPrompt) systemPrompt = settings.systemPrompt
      if (settings?.model) model = settings.model
      if (typeof settings?.maxTokens === 'number') maxTokens = settings.maxTokens
      if (typeof settings?.temperature === 'number') temperature = settings.temperature

      // If a postType is specified, find matching preset and append instructions
      let presetUseLiveResearch = false
      if (postType && Array.isArray(settings?.postTypes)) {
        const preset = settings.postTypes.find((p: any) => p?.slug === postType)
        if (preset) {
          if (preset.additionalInstructions) {
            systemPrompt = `${systemPrompt}\n\n---\n\nADDITIONAL INSTRUCTIONS FOR THIS POST TYPE (${preset.label ?? preset.slug}):\n\n${preset.additionalInstructions}`
          }
          if (preset.defaultCategory) {
            defaultCategory = preset.defaultCategory
          }
          if (preset.useLiveResearch === true) {
            presetUseLiveResearch = true
          }
        }
      }

      // Live web research via Perplexity (when preset opts in).
      // Skipped when regenerating non-body fields (title/excerpt/seo/slug) since
      // those don't need fact-checking and we'd just burn API quota.
      const needsResearch =
        presetUseLiveResearch && (!regenerateField || regenerateField === 'body')
      if (needsResearch) {
        try {
          // Worker secret → process.env (local dev). Set with:
          //   cd cms && npx wrangler secret put PERPLEXITY_API_KEY
          let perplexityKey: string | undefined
          try {
            const { env } = getCloudflareContext()
            perplexityKey = (env as any)?.PERPLEXITY_API_KEY
          } catch {}
          if (!perplexityKey) perplexityKey = process.env.PERPLEXITY_API_KEY

          if (!perplexityKey) {
            console.warn('[/api/generate] live research requested but PERPLEXITY_API_KEY is missing')
          } else {
            const { query, recency, focus } = buildResearchQuery({
              title: title || existingContent?.title,
              hint,
              postTypeSlug: postType,
              currentDate: new Date(),
            })
            if (query.length >= 3) {
              const research = await callPerplexity({
                query,
                recency,
                focus,
                apiKey: perplexityKey,
              })
              if (research.summary && research.summary !== 'No current information available.') {
                researchCitations = research.citations
                const citationLines = research.citations
                  .map((c, i) => `[${i + 1}] ${c.title ? `${c.title} — ` : ''}${c.url}`)
                  .join('\n')
                researchBlock = `\n\n---\n\nLIVE RESEARCH CONTEXT (from Perplexity web search, ${new Date().toISOString().slice(0, 10)}):

${research.summary}

SOURCES FOUND:
${citationLines || '(no citations returned)'}

RESEARCH USAGE RULES (MANDATORY):
- Ground factual claims (dates, names, outcomes, status, numbers) in the research above. Do NOT invent facts not supported by the research or the author's hint.
- If the research conflicts with an assumption in the author's hint, favor the research and note the update in plain language.
- Weave sourced facts into the narrative naturally; do not dump them.
- At the END of the body markdown, append a final H2 "## Sources" section with a numbered list linking to each source URL, formatted as: \`1. [Source title or publisher name](URL)\`. Use the sources actually referenced in the post. Omit this section only if no sources were used.
- Use plain markdown links for sources — no footnote superscripts.

DIFFERENTIATION RULES (MANDATORY — this is how we rank and get cited, not rewritten):
- DO NOT simply rewrite what the research sources already say. That produces competitor-parity content that Google and AI answer engines ignore.
- For every post, offer at least ONE of:
  1. A different angle the research sources missed (architectural, neighborhood, historical, or community-impact lens)
  2. An original framework or lens (e.g., "Three patterns repeat across every [topic] we've seen…")
  3. A contrarian take grounded in the research evidence — where the prevailing narrative is incomplete or misleading
  4. Connective tissue between this story and adjacent preservation events the competitors aren't linking
- Use proprietary [CLIENT NAME] data and first-hand content when the author's hint provides it: petition signature counts, volunteer observations, chapter tour attendance, archival photos, member quotes, past advocacy outcomes with specifics.
- When proprietary data is clearly called for but NOT provided in the author's hint, insert a bracketed placeholder the author can fill in during review. Use these exact formats:
  - \`[MTM DATA: what data to fill in]\` — e.g., \`[MTM DATA: petition signature count as of publish date]\`
  - \`[QUOTE NEEDED: name, role, topic]\` — e.g., \`[QUOTE NEEDED: local architect or preservation board member on significance]\`
  - \`[CASE STUDY: past MTM advocacy outcome relevant to this issue]\`
  - \`[BEFORE/AFTER: metric, e.g., square footage saved, trees retained, original materials preserved]\`
  - \`[OUTCOME: named person or building, with permission to share]\`
- Never fake proprietary data. A clearly marked placeholder is better than an invented number or fake quote.
- Expert commentary: if the research found named experts, paraphrase their cited positions (with sources). Do not invent quotes or attribute them to people.
- First-hand experience: [CLIENT NAME] is a volunteer-run chapter — when appropriate, reference the chapter's own work (tours, surveys, past alerts) in plain language, not grandiose phrasing.`
              }
            }
          }
        } catch (err) {
          console.warn('[/api/generate] live research failed, continuing without it', err)
        }
      }
    } catch (err) {
      console.warn('[/api/generate] could not load AI settings, using defaults', err)
    }

    // 2. Fall back to Worker env secret
    if (!apiKey) {
      try {
        const { env } = getCloudflareContext()
        apiKey = (env as any)?.ANTHROPIC_API_KEY
      } catch {}
    }
    // 3. Fall back to process.env (local dev)
    if (!apiKey) apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'No Claude API key found. Add your key in Settings → AI Settings, or contact your developer.' },
        { status: 500 },
      )
    }

    let userPrompt: string

    if (regenerateField && existingContent) {
      const fieldInstructions: Record<string, string> = {
        title: `Regenerate ONLY the title for this existing post. Return a JSON object with just: {"title": "new title under 80 chars"}. The current title is: "${existingContent.title ?? ''}". The post body starts with: "${(existingContent.bodyMarkdown ?? '').slice(0, 300)}..."`,
        excerpt: `Regenerate ONLY the excerpt for this existing post. Return a JSON object with just: {"excerpt": "new 140-160 char summary"}. The post title is: "${existingContent.title ?? ''}". The post body starts with: "${(existingContent.bodyMarkdown ?? '').slice(0, 500)}..."`,
        body: `Regenerate ONLY the body content for this existing post. Return a JSON object with just: {"bodyMarkdown": "full markdown body 500-900 words"}. The post title is: "${existingContent.title ?? ''}". Content context: ${hint?.trim() ?? existingContent.excerpt ?? ''}`,
        seo: `Regenerate ONLY the SEO title and description. Return a JSON object with just: {"seoTitle": "50-60 chars ending with | [CLIENT NAME]", "seoDescription": "140-160 char meta description"}. The post title is: "${existingContent.title ?? ''}". Excerpt: "${existingContent.excerpt ?? ''}"`,
        slug: `Regenerate ONLY the URL slug for this post. Return a JSON object with just: {"slug": "keyword-slug"}. Follow the slug rules: 2-5 words, primary keyword, no dates, no filler words. The post title is: "${existingContent.title ?? ''}"`,
      }
      userPrompt = fieldInstructions[regenerateField] ?? `Regenerate the ${regenerateField} field.`
      userPrompt += '\n\nReturn ONLY the JSON object with the specified field(s). No other fields. No code fences.'
    } else if (title && title.trim().length >= 3) {
      userPrompt = `Draft a [CLIENT NAME] blog post with this title: "${title.trim()}"\n\nContent context from the author: ${hint!.trim()}`
    } else {
      userPrompt = `Draft a [CLIENT NAME] blog post based on this context: ${hint!.trim()}\n\nGenerate an appropriate title for the post.`
    }

    // Append internal links list (populated above from DB) to the system prompt
    if (internalLinksBlock) {
      systemPrompt = `${systemPrompt}${internalLinksBlock}`
    }
    // Append live research context (from Perplexity) to the system prompt
    if (researchBlock) {
      systemPrompt = `${systemPrompt}${researchBlock}`
    }

    // Direct fetch to Anthropic API — more reliable on Workers than the SDK
    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!apiResponse.ok) {
      const errText = await apiResponse.text()
      console.error('[/api/generate] Anthropic API error', apiResponse.status, errText)
      return NextResponse.json(
        { error: `Anthropic API ${apiResponse.status}: ${errText.slice(0, 300)}` },
        { status: 500 },
      )
    }

    const response = (await apiResponse.json()) as { content: Array<{ type: string; text?: string }> }

    const textBlock = response.content?.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text' || !textBlock.text) {
      return NextResponse.json({ error: 'Empty response from Claude' }, { status: 500 })
    }

    // Parse JSON (defensive — handle code fences if present)
    let raw = textBlock.text!.trim()
    if (raw.startsWith('```')) {
      raw = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim()
    }

    let parsed: any
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      return NextResponse.json(
        {
          error: 'Claude returned invalid JSON. Try a different title or try again.',
          raw: raw.slice(0, 200),
        },
        { status: 500 },
      )
    }

    // Convert markdown body to Lexical JSON server-side. Reuse the same
    // editorConfig for the structured section fields below.
    const resolvedConfig = await config
    const editorConfig = await editorConfigFactory.default({ config: resolvedConfig })

    const md2lex = (markdown: string | undefined | null): any => {
      if (typeof markdown !== 'string' || markdown.trim() === '') return undefined
      try {
        return convertMarkdownToLexical({ editorConfig, markdown })
      } catch (err) {
        console.error('[/api/generate] markdown->lexical failed for snippet', err)
        return undefined
      }
    }

    const lexicalBody: any = md2lex(parsed.bodyMarkdown)

    // For location/airport pages, transform the structured section payload —
    // every markdown field becomes Lexical so Payload can store it directly.
    let locationSections: any
    let airportSections: any

    if (parsed.locationSections && typeof parsed.locationSections === 'object') {
      const ls = parsed.locationSections
      locationSections = {
        opening: md2lex(ls.opening),
        benefitsHeading: typeof ls.benefitsHeading === 'string' ? ls.benefitsHeading : undefined,
        benefitsBody: md2lex(ls.benefitsBody),
        about: md2lex(ls.about),
        ctaHeading: typeof ls.ctaHeading === 'string' ? ls.ctaHeading : undefined,
        whatWeOffer: md2lex(ls.whatWeOffer),
        topServices: Array.isArray(ls.topServices)
          ? ls.topServices.slice(0, 3).map((s: any) => ({
              heading: typeof s?.heading === 'string' ? s.heading : '',
              body: md2lex(s?.body),
            }))
          : [],
        whyChooseUs: md2lex(ls.whyChooseUs),
        pricing: md2lex(ls.pricing),
        events: md2lex(ls.events),
        neighborhoods: md2lex(ls.neighborhoods),
        venues: md2lex(ls.venues),
        closingCtaHeading: typeof ls.closingCtaHeading === 'string' ? ls.closingCtaHeading : undefined,
        faqs: Array.isArray(ls.faqs)
          ? ls.faqs.slice(0, 5).map((f: any) => ({
              question: typeof f?.question === 'string' ? f.question : '',
              answer: typeof f?.answer === 'string' ? f.answer : '',
            }))
          : [],
      }
    }

    if (parsed.airportSections && typeof parsed.airportSections === 'object') {
      const as = parsed.airportSections
      const qf = as.airportQuickFacts && typeof as.airportQuickFacts === 'object' ? as.airportQuickFacts : {}
      airportSections = {
        opening: md2lex(as.opening),
        benefitsHeading: typeof as.benefitsHeading === 'string' ? as.benefitsHeading : undefined,
        benefitsBody: md2lex(as.benefitsBody),
        about: md2lex(as.about),
        ctaHeading: typeof as.ctaHeading === 'string' ? as.ctaHeading : undefined,
        whatWeOffer: md2lex(as.whatWeOffer),
        topServices: Array.isArray(as.topServices)
          ? as.topServices.slice(0, 3).map((s: any) => ({
              heading: typeof s?.heading === 'string' ? s.heading : '',
              body: md2lex(s?.body),
            }))
          : [],
        whyChooseUs: md2lex(as.whyChooseUs),
        fboOperators: Array.isArray(as.fboOperators)
          ? as.fboOperators.map((f: any) => ({
              name: typeof f?.name === 'string' ? f.name : '',
              url: typeof f?.url === 'string' ? f.url : undefined,
              terminal: typeof f?.terminal === 'string' ? f.terminal : undefined,
              body: md2lex(f?.body),
            }))
          : [],
        airportQuickFacts: {
          runwayCount: typeof qf.runwayCount === 'string' ? qf.runwayCount : undefined,
          longestRunway: typeof qf.longestRunway === 'string' ? qf.longestRunway : undefined,
          elevation: typeof qf.elevation === 'string' ? qf.elevation : undefined,
          hours: typeof qf.hours === 'string' ? qf.hours : undefined,
          customsAvailable: typeof qf.customsAvailable === 'boolean' ? qf.customsAvailable : undefined,
          slotPPR: typeof qf.slotPPR === 'string' ? qf.slotPPR : undefined,
          body: md2lex(qf.body),
          sourceUrl: typeof qf.sourceUrl === 'string' ? qf.sourceUrl : undefined,
        },
        driveTimes: Array.isArray(as.driveTimes)
          ? as.driveTimes.slice(0, 8).map((d: any) => ({
              destination: typeof d?.destination === 'string' ? d.destination : '',
              range: typeof d?.range === 'string' ? d.range : '',
              url: typeof d?.url === 'string' ? d.url : undefined,
              blurb: typeof d?.blurb === 'string' ? d.blurb : undefined,
            }))
          : [],
        localConsiderations: md2lex(as.localConsiderations),
        closingCtaHeading: typeof as.closingCtaHeading === 'string' ? as.closingCtaHeading : undefined,
        faqs: Array.isArray(as.faqs)
          ? as.faqs.slice(0, 5).map((f: any) => ({
              question: typeof f?.question === 'string' ? f.question : '',
              answer: typeof f?.answer === 'string' ? f.answer : '',
            }))
          : [],
      }
    }

    return NextResponse.json({
      title: parsed.title ?? '',
      slug: parsed.slug ?? '',
      excerpt: parsed.excerpt ?? '',
      bodyMarkdown: parsed.bodyMarkdown ?? '',
      body: lexicalBody,
      category: parsed.category ?? defaultCategory ?? 'newsletter',
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter((t: any) => typeof t === 'string') : [],
      seoTitle: parsed.seoTitle ?? '',
      seoDescription: parsed.seoDescription ?? '',
      readingTime: typeof parsed.readingTime === 'number' ? parsed.readingTime : 4,
      locationSections,
      airportSections,
      researchUsed: researchCitations.length > 0,
      researchCitations,
    })
  } catch (err: any) {
    console.error('[/api/generate] error', err)
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error generating content.' },
      { status: 500 },
    )
  }
}
