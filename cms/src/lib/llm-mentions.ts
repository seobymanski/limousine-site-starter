/**
 * Weekly LLM mention tracker.
 *
 * For each active row in llm-target-prompts, send the prompt to each
 * supported LLM platform (Claude, ChatGPT, Perplexity), then check whether
 * the response cites our domain or any of our brand variants, and record
 * which tracked competitors got mentioned in the same response.
 *
 * Designed to be cheap: uses Anthropic Haiku tier for Claude calls and
 * gpt-4o-mini for ChatGPT. A weekly run with 10 prompts × 3 platforms is
 * roughly $0.05-$0.10/month total.
 */

import type { Payload } from 'payload'
import { getCloudflareContext } from '@opennextjs/cloudflare'
import { callPerplexity } from './perplexity'
import { OUR_DOMAIN, OUR_BRAND_VARIANTS } from './analytics-config'

/**
 * How many times to sample each prompt per platform per run. LLMs are
 * stochastic — single samples are noisy, but ~5 averaged samples give a
 * useful "% of responses cite us" signal without burning much budget.
 *
 * Cost per run with current pricing (Haiku, gpt-4o-mini, sonar):
 *   prompts × platforms × samples × ~$0.001 ≈ $0.10 for 5 prompts.
 */
const SAMPLES_PER_PLATFORM = 5

export type Platform = 'claude' | 'chatgpt' | 'perplexity'

interface MentionAnalysis {
  mentioned: boolean
  domainCited: boolean
  competitorMentions: Array<{ domain: string; mentioned: boolean }>
  responseSnippet: string
}

interface LLMResult {
  platform: Platform
  response: string
  citedUrls: string[]
  error?: string
}

function readEnv(name: string): string | undefined {
  // On Cloudflare Workers, secrets live on the Cloudflare context — not in
  // process.env. Match the same chain the existing /api/generate route uses.
  try {
    const { env } = getCloudflareContext()
    const v = (env as any)?.[name]
    if (v) return v
  } catch {}
  return (
    (globalThis as any).process?.env?.[name] ??
    (typeof process !== 'undefined' ? process.env?.[name] : undefined)
  )
}

/**
 * Find the position of any brand variant in lowercased text. Returns -1
 * if not found. Uses substring matching, so don't include single common
 * words in OUR_BRAND_VARIANTS that would false-positive.
 */
function findBrandIndex(lowerText: string): number {
  for (const variant of OUR_BRAND_VARIANTS) {
    const i = lowerText.indexOf(variant)
    if (i !== -1) return i
  }
  return -1
}

/**
 * Pull a ~400-char excerpt centered on the first brand mention, falling
 * back to the response opening when nothing's found.
 */
function extractSnippet(response: string, anchorIndex: number): string {
  const cleaned = response.replace(/\s+/g, ' ').trim()
  if (anchorIndex === -1) {
    return cleaned.slice(0, 400)
  }
  const start = Math.max(0, anchorIndex - 120)
  const end = Math.min(cleaned.length, anchorIndex + 280)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < cleaned.length ? '...' : ''
  return prefix + cleaned.slice(start, end) + suffix
}

export function analyzeMentions(
  response: string,
  citedUrls: string[],
  competitors: string[],
): MentionAnalysis {
  const proseLowered = response.toLowerCase()
  // For domain detection, scan both prose AND the cited URL list (Perplexity
  // often only mentions the domain via citation, never by brand name).
  const haystack = (response + '\n' + citedUrls.join('\n')).toLowerCase()
  const brandIdx = findBrandIndex(proseLowered)
  const brandInProse = brandIdx !== -1
  const domainCited = haystack.includes(OUR_DOMAIN)

  const competitorMentions = competitors.map((domain) => ({
    domain,
    mentioned: haystack.includes(domain.toLowerCase()),
  }))

  return {
    mentioned: brandInProse || domainCited,
    domainCited,
    competitorMentions,
    responseSnippet: extractSnippet(response, brandIdx),
  }
}

async function queryClaude(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Claude ${res.status}: ${errText.slice(0, 300)}`)
  }
  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> }
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
}

async function queryChatGPT(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 300)}`)
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

async function queryPerplexitySimple(
  prompt: string,
  apiKey: string,
): Promise<{ text: string; citedUrls: string[] }> {
  const res = await callPerplexity({
    query: prompt,
    apiKey,
    model: 'sonar',
  })
  return {
    text: res.summary,
    citedUrls: res.citations.map((c) => c.url).filter(Boolean),
  }
}

/**
 * Resolve the API key for a given platform from Cloudflare Worker secrets
 * (with a process.env fallback for local dev). Set with:
 *   cd cms && npx wrangler secret put ANTHROPIC_API_KEY
 */
async function resolveKey(platform: Platform, _payload: Payload): Promise<string | undefined> {
  switch (platform) {
    case 'claude':
      return readEnv('ANTHROPIC_API_KEY')
    case 'chatgpt':
      return readEnv('OPENAI_API_KEY')
    case 'perplexity':
      return readEnv('PERPLEXITY_API_KEY')
  }
}

async function queryPlatform(
  platform: Platform,
  prompt: string,
  payload: Payload,
): Promise<LLMResult> {
  const key = await resolveKey(platform, payload)
  if (!key) {
    return { platform, response: '', citedUrls: [], error: `${platform} API key not configured` }
  }
  try {
    let response: string
    let citedUrls: string[] = []
    switch (platform) {
      case 'claude':
        response = await queryClaude(prompt, key)
        break
      case 'chatgpt':
        response = await queryChatGPT(prompt, key)
        break
      case 'perplexity': {
        const r = await queryPerplexitySimple(prompt, key)
        response = r.text
        citedUrls = r.citedUrls
        break
      }
    }
    return { platform, response, citedUrls }
  } catch (err: any) {
    return { platform, response: '', citedUrls: [], error: err?.message ?? 'unknown error' }
  }
}

interface RunResult {
  date: string
  promptCount: number
  samplesPerPlatform: number
  platformResults: Record<Platform, { ok: number; failed: number; configured: boolean }>
  totalRowsWritten: number
}

interface AggregatedResult {
  samplesTotal: number
  samplesMentioned: number
  mentioned: boolean
  domainCited: boolean
  competitorMentions: Array<{ domain: string; mentioned: boolean; sampledMentions: number }>
  responseSnippet: string
  responseFull: string
  citedUrls: string[]
}

/**
 * Run a platform N times for the same prompt and aggregate the responses.
 * Uses Promise.all so the N calls go out in parallel — total wall time is
 * roughly one call's latency, not N×.
 */
async function querySamples(
  platform: Platform,
  prompt: string,
  payload: Payload,
  samples: number,
  competitorDomains: string[],
): Promise<{ aggregated: AggregatedResult | null; error?: string }> {
  const calls = Array.from({ length: samples }, () => queryPlatform(platform, prompt, payload))
  const results = await Promise.all(calls)

  const successful = results.filter((r) => !r.error)
  if (successful.length === 0) {
    return { aggregated: null, error: results[0]?.error ?? 'all samples failed' }
  }

  let samplesMentioned = 0
  let domainCitedAny = false
  const competitorCounts = new Map<string, number>()
  const citedUrlSet = new Set<string>()
  let representativeSnippet = ''
  let representativeResponse = ''

  for (const r of successful) {
    const analysis = analyzeMentions(r.response, r.citedUrls, competitorDomains)
    if (analysis.mentioned) samplesMentioned++
    if (analysis.domainCited) domainCitedAny = true
    for (const cm of analysis.competitorMentions) {
      if (cm.mentioned) {
        competitorCounts.set(cm.domain, (competitorCounts.get(cm.domain) ?? 0) + 1)
      }
    }
    for (const url of r.citedUrls) citedUrlSet.add(url)
    if (analysis.mentioned && !representativeSnippet) {
      representativeSnippet = analysis.responseSnippet
      representativeResponse = r.response
    }
  }

  // If no sample mentioned us, use the first successful response as the
  // representative excerpt so the dashboard can still show what the LLM said.
  if (!representativeResponse) {
    representativeResponse = successful[0].response
    const analysis = analyzeMentions(successful[0].response, successful[0].citedUrls, [])
    representativeSnippet = analysis.responseSnippet
  }

  return {
    aggregated: {
      samplesTotal: successful.length,
      samplesMentioned,
      mentioned: samplesMentioned > 0,
      domainCited: domainCitedAny,
      competitorMentions: competitorDomains.map((d) => ({
        domain: d,
        mentioned: (competitorCounts.get(d) ?? 0) > 0,
        sampledMentions: competitorCounts.get(d) ?? 0,
      })),
      responseSnippet: representativeSnippet,
      responseFull: representativeResponse,
      citedUrls: Array.from(citedUrlSet),
    },
  }
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

const PLATFORMS: Platform[] = ['claude', 'chatgpt', 'perplexity']

/**
 * D1 stores Payload date fields as plain YYYY-MM-DD strings, so we use the
 * `like` operator to upsert by date prefix (same pattern as the other
 * analytics runners).
 */
async function upsertSnapshot(
  payload: Payload,
  date: string,
  prompt: string,
  platform: Platform,
  data: Record<string, any>,
) {
  const existing = await payload.find({
    collection: 'llm-mention-snapshots',
    where: {
      and: [
        { snapshotDate: { like: date } } as any,
        { prompt: { equals: prompt } },
        { platform: { equals: platform } },
      ],
    } as any,
    limit: 1,
  })
  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'llm-mention-snapshots',
      id: existing.docs[0].id,
      data: data as any,
    })
  } else {
    await payload.create({ collection: 'llm-mention-snapshots', data: data as any })
  }
}

export async function runLLMMentionsSnapshot(payload: Payload): Promise<RunResult> {
  const date = todayIso()

  const [prompts, competitors] = await Promise.all([
    payload.find({
      collection: 'llm-target-prompts',
      where: { active: { equals: true } },
      limit: 100,
      depth: 0,
    }),
    payload.find({
      collection: 'tracked-competitors',
      where: { active: { equals: true } },
      limit: 50,
      depth: 0,
    }),
  ])

  const competitorDomains = (competitors.docs as any[])
    .map((c) => (c.domain ?? '').toLowerCase().trim())
    .filter(Boolean)

  const [claudeKey, chatgptKey, perplexityKey] = await Promise.all([
    resolveKey('claude', payload),
    resolveKey('chatgpt', payload),
    resolveKey('perplexity', payload),
  ])
  const configured: Record<Platform, boolean> = {
    claude: Boolean(claudeKey),
    chatgpt: Boolean(chatgptKey),
    perplexity: Boolean(perplexityKey),
  }

  const result: RunResult = {
    date,
    promptCount: prompts.docs.length,
    samplesPerPlatform: SAMPLES_PER_PLATFORM,
    platformResults: {
      claude: { ok: 0, failed: 0, configured: configured.claude },
      chatgpt: { ok: 0, failed: 0, configured: configured.chatgpt },
      perplexity: { ok: 0, failed: 0, configured: configured.perplexity },
    },
    totalRowsWritten: 0,
  }

  for (const promptDoc of prompts.docs as any[]) {
    const promptText: string = promptDoc.prompt ?? ''
    if (!promptText.trim()) continue

    // For each configured platform, run N samples in parallel and aggregate.
    // Then write one snapshot row per platform with the aggregated stats.
    const platformsToTry = PLATFORMS.filter((p) => result.platformResults[p].configured)
    const aggregated = await Promise.all(
      platformsToTry.map(async (platform) => ({
        platform,
        ...(await querySamples(platform, promptText, payload, SAMPLES_PER_PLATFORM, competitorDomains)),
      })),
    )

    for (const item of aggregated) {
      if (!item.aggregated) {
        result.platformResults[item.platform].failed++
        await upsertSnapshot(payload, date, promptText, item.platform, {
          snapshotDate: date,
          prompt: promptText,
          platform: item.platform,
          mentioned: false,
          domainCited: false,
          samplesTotal: 0,
          samplesMentioned: 0,
          competitorMentions: [],
          responseSnippet: '',
          responseFull: '',
          citedUrls: [],
          errorMessage: item.error ?? 'unknown error',
        })
        result.totalRowsWritten++
        continue
      }
      const a = item.aggregated
      await upsertSnapshot(payload, date, promptText, item.platform, {
        snapshotDate: date,
        prompt: promptText,
        platform: item.platform,
        mentioned: a.mentioned,
        domainCited: a.domainCited,
        samplesTotal: a.samplesTotal,
        samplesMentioned: a.samplesMentioned,
        competitorMentions: a.competitorMentions,
        responseSnippet: a.responseSnippet,
        responseFull: a.responseFull,
        citedUrls: a.citedUrls,
        errorMessage: null,
      })
      result.platformResults[item.platform].ok++
      result.totalRowsWritten++
    }
  }

  return result
}
