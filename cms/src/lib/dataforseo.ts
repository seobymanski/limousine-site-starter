/**
 * Thin wrapper around the DataForSEO API. Used by the weekly analytics cron
 * to pull keyword rankings + competitor metrics into D1.
 *
 * Auth: HTTP Basic with login + password from Worker secrets
 *   DATAFORSEO_LOGIN
 *   DATAFORSEO_PASSWORD
 *
 * Cost discipline: callers should request only what they need. The client
 * doesn't auto-paginate — pass a `limit` and accept the truncation.
 */

const API_BASE = 'https://api.dataforseo.com/v3'

// United States, country-level. Sufficient for organic SERP checks; for
// city-level local pack work you'd switch per-keyword.
const DEFAULT_LOCATION_CODE = 2840
const DEFAULT_LANGUAGE_CODE = 'en'

interface DfsResponse<T> {
  status_code: number
  status_message: string
  tasks: Array<{
    id: string
    status_code: number
    status_message: string
    result?: T[]
  }>
}

function readEnv(name: string): string | undefined {
  return (
    (globalThis as any).process?.env?.[name] ??
    (typeof process !== 'undefined' ? process.env?.[name] : undefined)
  )
}

function getAuthHeader(): string {
  const login = readEnv('DATAFORSEO_LOGIN')
  const password = readEnv('DATAFORSEO_PASSWORD')
  if (!login || !password) {
    throw new Error('DataForSEO secrets missing: need DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD as Worker secrets.')
  }
  // btoa is available in Workers; falls back to Buffer in Node.
  const raw = `${login}:${password}`
  const encoded =
    typeof btoa === 'function' ? btoa(raw) : Buffer.from(raw).toString('base64')
  return `Basic ${encoded}`
}

async function dfsPost<T>(path: string, body: unknown): Promise<T[]> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      authorization: getAuthHeader(),
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`DataForSEO ${path} failed (${res.status}): ${errText}`)
  }
  const json = (await res.json()) as DfsResponse<T>
  if (json.status_code !== 20000) {
    throw new Error(`DataForSEO ${path} returned ${json.status_code}: ${json.status_message}`)
  }
  const task = json.tasks?.[0]
  if (!task) throw new Error(`DataForSEO ${path}: no task in response`)
  if (task.status_code !== 20000) {
    throw new Error(`DataForSEO ${path} task ${task.id} returned ${task.status_code}: ${task.status_message}`)
  }
  return task.result ?? []
}

interface RankedKeywordItem {
  keyword_data?: {
    keyword?: string
    keyword_info?: {
      search_volume?: number
    }
  }
  ranked_serp_element?: {
    serp_item?: {
      rank_absolute?: number
      url?: string
    }
  }
}

interface RankedKeywordsResult {
  total_count?: number
  metrics?: {
    organic?: {
      etv?: number
      count?: number
    }
  }
  items?: RankedKeywordItem[]
}

export interface DomainKeyword {
  keyword: string
  position: number
  searchVolume: number
  url: string
}

export interface DomainProfile {
  domain: string
  estimatedTraffic: number
  rankedKeywordsCount: number
  keywords: DomainKeyword[] // up to `limit` ordered by search volume desc
}

/**
 * Pull the top N keywords a domain ranks for in Google US, ordered by
 * monthly search volume. Returns normalized rows + headline metrics.
 *
 * One call costs ~$0.05 regardless of `limit` (up to 1000).
 */
export async function fetchDomainProfile(
  domain: string,
  limit: number = 500,
): Promise<DomainProfile> {
  const result = await dfsPost<RankedKeywordsResult>(
    '/dataforseo_labs/google/ranked_keywords/live',
    [
      {
        target: domain,
        location_code: DEFAULT_LOCATION_CODE,
        language_code: DEFAULT_LANGUAGE_CODE,
        limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
        filters: [
          ['keyword_data.keyword_info.search_volume', '>', 0],
        ],
      },
    ],
  )

  const first = result[0]
  const keywords: DomainKeyword[] = (first?.items ?? [])
    .map((item): DomainKeyword | null => {
      const keyword = item.keyword_data?.keyword
      const position = item.ranked_serp_element?.serp_item?.rank_absolute
      const url = item.ranked_serp_element?.serp_item?.url
      const searchVolume = item.keyword_data?.keyword_info?.search_volume ?? 0
      if (!keyword || !position) return null
      return {
        keyword,
        position,
        searchVolume,
        url: url ?? '',
      }
    })
    .filter((k): k is DomainKeyword => k !== null)

  return {
    domain,
    estimatedTraffic: Math.round(first?.metrics?.organic?.etv ?? 0),
    rankedKeywordsCount: first?.total_count ?? keywords.length,
    keywords,
  }
}

/**
 * Compute the keywords a competitor ranks for that we don't.
 * Uses lowercase exact-match on keyword strings (DataForSEO normalizes).
 */
export function computeGapKeywords(
  ourKeywords: DomainKeyword[],
  theirKeywords: DomainKeyword[],
  limit: number = 25,
): Array<{ keyword: string; theirPosition: number; searchVolume: number; theirUrl: string }> {
  const ourSet = new Set(ourKeywords.map((k) => k.keyword.toLowerCase()))
  return theirKeywords
    .filter((k) => !ourSet.has(k.keyword.toLowerCase()))
    .slice(0, limit)
    .map((k) => ({
      keyword: k.keyword,
      theirPosition: k.position,
      searchVolume: k.searchVolume,
      theirUrl: k.url,
    }))
}

/**
 * Compute the count of keywords both domains rank for.
 */
export function computeOverlapCount(
  ourKeywords: DomainKeyword[],
  theirKeywords: DomainKeyword[],
): number {
  const ourSet = new Set(ourKeywords.map((k) => k.keyword.toLowerCase()))
  let n = 0
  for (const k of theirKeywords) {
    if (ourSet.has(k.keyword.toLowerCase())) n++
  }
  return n
}

/**
 * Find the position of a specific tracked keyword in our domain profile.
 * Returns null if the keyword isn't in our top-`limit` ranked keywords.
 */
export function findKeywordRanking(
  profile: DomainProfile,
  keyword: string,
): { position: number; url: string; searchVolume: number } | null {
  const target = keyword.toLowerCase().trim()
  const hit = profile.keywords.find((k) => k.keyword.toLowerCase() === target)
  if (!hit) return null
  return { position: hit.position, url: hit.url, searchVolume: hit.searchVolume }
}
