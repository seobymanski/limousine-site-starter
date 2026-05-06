/**
 * Perplexity Sonar API helper.
 *
 * Synthesizes a short, cited summary from live web search. Used by /api/generate
 * to ground content in current facts when a post type opts into live research.
 */

export type PerplexityCitation = {
  url: string
  title?: string
}

export type PerplexityResult = {
  summary: string
  citations: PerplexityCitation[]
}

export type PerplexityCallOptions = {
  query: string
  /** Bias search toward recent results. */
  recency?: 'day' | 'week' | 'month' | 'year'
  /** Optional steer text — appended to the system prompt Perplexity uses. */
  focus?: string
  /** Sonar model tier. sonar-pro is higher quality, slightly pricier. */
  model?: 'sonar' | 'sonar-pro'
  /** API key. Required — pass from caller (Worker env). */
  apiKey: string
}

const PERPLEXITY_SYSTEM_PROMPT = `You are a research assistant producing a concise factual brief for a content writer.

RULES:
- Return 3-6 short factual paragraphs. No preamble, no marketing language.
- Favor primary sources: news outlets, government records, official organization pages, academic sources.
- When sources conflict, say so briefly.
- If nothing relevant or recent is found, say exactly: "No current information available." and stop.
- Prefer information from the last 12 months unless the query is explicitly historical.
- Include dates, numbers, names, and places precisely.`

export async function callPerplexity(opts: PerplexityCallOptions): Promise<PerplexityResult> {
  const { query, recency, focus, model = 'sonar', apiKey } = opts

  if (!apiKey) throw new Error('Perplexity API key is required')
  if (!query || query.trim().length < 3) throw new Error('Perplexity query is too short')

  const systemPrompt = focus
    ? `${PERPLEXITY_SYSTEM_PROMPT}\n\nFOCUS FOR THIS REQUEST:\n${focus}`
    : PERPLEXITY_SYSTEM_PROMPT

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query.trim() },
    ],
    temperature: 0.2,
    max_tokens: 1200,
  }
  if (recency) body.search_recency_filter = recency

  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Perplexity API ${res.status}: ${errText.slice(0, 300)}`)
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    citations?: string[]
    search_results?: Array<{ url?: string; title?: string }>
  }

  const summary = data.choices?.[0]?.message?.content?.trim() ?? ''

  let citations: PerplexityCitation[] = []
  if (Array.isArray(data.search_results)) {
    citations = data.search_results
      .filter((r) => typeof r.url === 'string')
      .map((r) => ({ url: r.url as string, title: r.title }))
  } else if (Array.isArray(data.citations)) {
    citations = data.citations.filter((u) => typeof u === 'string').map((u) => ({ url: u }))
  }

  return { summary, citations }
}

/**
 * Build a Perplexity query string from a post's title + hint + post-type modifier.
 * The post type adds search style, not content — the actual topic comes from the
 * author's title/hint so searches stay specific to what's being written about.
 */
export function buildResearchQuery(opts: {
  title?: string
  hint?: string
  postTypeSlug?: string
  currentDate?: Date
}): { query: string; recency: PerplexityCallOptions['recency']; focus: string } {
  const { title, hint, postTypeSlug } = opts
  const topic = [title, hint].filter(Boolean).join(' — ').trim()

  let modifier = ''
  let recency: PerplexityCallOptions['recency'] = 'year'
  let focus = 'Research this topic for a Central Texas preservation nonprofit. Prioritize facts, dates, names, and outcomes.'

  switch (postTypeSlug) {
    case 'newsletter':
    case 'news':
      modifier = 'latest news updates Central Texas preservation'
      recency = 'month'
      focus = 'Recent news, developments, and community updates on this topic. Prioritize reporting from the last 30-90 days.'
      break
    case 'demolition-alert':
      modifier = 'demolition permit preservation city council hearing status'
      recency = 'month'
      focus = 'Current demolition status, city council actions, hearings, preservation group responses, and timeline. Prioritize official records and local reporting.'
      break
    case 'building-spotlight':
    case 'building-showcase':
      modifier = 'history architect construction date architectural style'
      recency = 'year'
      focus = 'Historical facts: architect, construction date, architectural style, notable features, changes of ownership, current status. Include authoritative historical sources.'
      break
    case 'advocacy':
      modifier = 'preservation policy legislation Texas historic landmark'
      recency = 'month'
      focus = 'Policy context, legislation, advocacy positions, and recent commission or council decisions affecting this topic.'
      break
    case 'events':
      modifier = 'event date time location Central Texas'
      recency = 'month'
      focus = 'Event details, context, and related programming. Include dates and locations if known.'
      break
    default:
      modifier = ''
  }

  const query = [topic, modifier].filter(Boolean).join(' ').trim()
  return { query, recency, focus }
}
