/**
 * scripts/seed-cms.ts
 *
 * Local Node runner that seeds the deployed Payload CMS with location and
 * airport pages by calling /api/generate (Claude + Perplexity) per item, then
 * POSTing the structured result to the blog-posts collection.
 *
 * Why local instead of a CMS endpoint? Each /api/generate call takes 1-2
 * minutes (Perplexity research + Claude Opus body). Cloudflare Workers have a
 * CPU time limit; running 30 airports in one Worker request would time out.
 * Running locally bypasses that — the script just hits the deployed REST API.
 *
 * Usage:
 *   CMS_URL=https://CLIENT-cms.workers.dev \
 *   CMS_EMAIL=you@example.com \
 *   CMS_PASSWORD='...' \
 *   pnpm tsx scripts/seed-cms.ts --type=airports
 *
 *   --type=airports | locations | both     (default: both)
 *   --limit=N                              (default: all)
 *   --slug=kteb                            (run a single item by slug)
 *   --dry-run                              (skip the create POST; just log)
 *
 * Idempotent: skips items whose slug already exists in the CMS.
 * Resumable: re-running picks up the rest.
 */

import { airports, type Airport } from '../src/data/airports'
import { siteConfig } from '../src/data/site-config'

type SectionType = 'airport-page' | 'location-page'

interface SeedTarget {
  slug: string
  title: string
  postType: SectionType
  hint: string
}

/* -------------------------------------------------------------------------- */
/* Build the targets                                                          */
/* -------------------------------------------------------------------------- */

function airportTargets(): SeedTarget[] {
  return airports.map((a: Airport) => {
    const fboList = a.fbos.length > 0 ? a.fbos.join(', ') : 'major FBO operators on field'
    const cityList = a.cityCodes
      .map((slug) => siteConfig.cities.find((c) => c.slug === slug))
      .filter(Boolean)
      .map((c) => `${c!.city}, ${c!.state}`)
      .join('; ')
    const hint = [
      `Airport: ${a.name} (ICAO ${a.icao}${a.iata ? ` / IATA ${a.iata}` : ''}).`,
      `Region: ${a.region}.`,
      `Located in ${a.city}.`,
      `FBOs known to be on field: ${fboList}. Verify current operator list with Perplexity research.`,
      cityList ? `Common destinations from this airport: ${cityList}.` : '',
      a.notes ? `Operational notes: ${a.notes}` : '',
    ]
      .filter(Boolean)
      .join(' ')
    return {
      slug: a.slug,
      title: `Private Jet Transfer at ${a.name} (${a.icao})`,
      postType: 'airport-page',
      hint,
    }
  })
}

function locationTargets(): SeedTarget[] {
  return siteConfig.cities.map((c) => {
    const cityAirports = airports.filter((a) => a.cityCodes.includes(c.slug))
    const airportLine =
      cityAirports.length > 0
        ? `Served by ${cityAirports.map((a) => `${a.icao} (${a.name})`).join(', ')}.`
        : ''
    const hint = [
      `City: ${c.city}, ${c.state}.`,
      `Region: ${c.region}.`,
      airportLine,
      'Use Perplexity research to surface specific neighborhoods, current named events, real venues, and pricing context for this city.',
    ]
      .filter(Boolean)
      .join(' ')
    return {
      slug: c.slug,
      title: `Private Jet Transfer in ${c.city}, ${c.state}`,
      postType: 'location-page',
      hint,
    }
  })
}

/* -------------------------------------------------------------------------- */
/* CMS client                                                                 */
/* -------------------------------------------------------------------------- */

interface ParsedArgs {
  type: 'airports' | 'locations' | 'both'
  limit?: number
  slug?: string
  dryRun: boolean
}

function parseArgs(argv: string[]): ParsedArgs {
  const out: ParsedArgs = { type: 'both', dryRun: false }
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--type=')) {
      const v = arg.split('=')[1]
      if (v === 'airports' || v === 'locations' || v === 'both') out.type = v
    } else if (arg.startsWith('--limit=')) {
      const n = Number(arg.split('=')[1])
      if (Number.isFinite(n) && n > 0) out.limit = n
    } else if (arg.startsWith('--slug=')) {
      out.slug = arg.split('=')[1]
    } else if (arg === '--dry-run') {
      out.dryRun = true
    }
  }
  return out
}

// Cloudflare blocks default Node fetch User-Agents (error 1010). Send a real
// browser UA so requests get through.
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

class CmsClient {
  private cookie: string | null = null
  private token: string | null = null

  constructor(private baseUrl: string) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { 'User-Agent': UA, ...extra }
    if (this.cookie) h['Cookie'] = this.cookie
    if (this.token) h['Authorization'] = `JWT ${this.token}`
    return h
  }

  async login(email: string, password: string): Promise<void> {
    const url = `${this.baseUrl}/api/users/login`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`login failed: ${res.status} ${text.slice(0, 200)}`)
    }
    const setCookie = res.headers.get('set-cookie') || ''
    const match = setCookie.match(/payload-token=[^;]+/)
    if (match) this.cookie = match[0]
    // Body also returns a JWT — keep it as a fallback auth method.
    try {
      const data = (await res.json()) as { token?: string }
      if (data.token) this.token = data.token
    } catch {}
    if (!this.cookie && !this.token) throw new Error('login: no token returned')
  }

  async findExistingSlug(slug: string): Promise<{ id: string | number } | null> {
    const url = new URL(`${this.baseUrl}/api/blog-posts`)
    url.searchParams.set('where[slug][equals]', slug)
    url.searchParams.set('limit', '1')
    url.searchParams.set('depth', '0')
    const res = await fetch(url.toString(), {
      headers: this.headers({ Accept: 'application/json' }),
    })
    if (!res.ok) {
      throw new Error(`existence check failed: ${res.status}`)
    }
    const data = (await res.json()) as { docs?: Array<{ id: string | number }> }
    const doc = data.docs?.[0]
    return doc ? { id: doc.id } : null
  }

  async generate(target: SeedTarget): Promise<any> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: target.title,
        hint: target.hint,
        postType: target.postType,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`generate failed: ${res.status} ${text.slice(0, 300)}`)
    }
    return res.json()
  }

  async createPost(payload: Record<string, any>): Promise<{ id: string | number }> {
    const res = await fetch(`${this.baseUrl}/api/blog-posts`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`createPost failed: ${res.status} ${text.slice(0, 500)}`)
    }
    const data = (await res.json()) as { doc?: { id: string | number }; id?: string | number }
    const id = data.doc?.id ?? data.id
    if (id === undefined) throw new Error('createPost: no id in response')
    return { id }
  }
}

/* -------------------------------------------------------------------------- */
/* Main                                                                       */
/* -------------------------------------------------------------------------- */

function buildPostPayload(target: SeedTarget, generated: any): Record<string, any> {
  const base: Record<string, any> = {
    title: generated.title || target.title,
    slug: target.slug, // forced — we want stable URLs
    excerpt: generated.excerpt || '',
    body: generated.body, // Lexical
    category: target.postType,
    tags: Array.isArray(generated.tags)
      ? generated.tags.filter((t: any) => typeof t === 'string').map((t: string) => ({ tag: t }))
      : [],
    status: 'published',
    publishedDate: new Date().toISOString(),
    readingTime: typeof generated.readingTime === 'number' ? generated.readingTime : 6,
    seo: {
      metaTitle: generated.seoTitle || generated.title || target.title,
      metaDescription: generated.seoDescription || generated.excerpt || '',
    },
  }
  if (target.postType === 'location-page' && generated.locationSections) {
    base.locationSections = generated.locationSections
  }
  if (target.postType === 'airport-page' && generated.airportSections) {
    base.airportSections = generated.airportSections
  }
  return base
}

async function main() {
  const args = parseArgs(process.argv)
  const baseUrl =
    process.env.CMS_URL?.replace(/\/$/, '') ||
    'https://CLIENT-cms.workers.dev'
  const email = process.env.CMS_EMAIL
  const password = process.env.CMS_PASSWORD

  if (!email || !password) {
    console.error('CMS_EMAIL and CMS_PASSWORD env vars are required.')
    process.exit(1)
  }

  const allTargets: SeedTarget[] = []
  if (args.type === 'airports' || args.type === 'both') allTargets.push(...airportTargets())
  if (args.type === 'locations' || args.type === 'both') allTargets.push(...locationTargets())

  let targets = allTargets
  if (args.slug) targets = targets.filter((t) => t.slug === args.slug)
  if (args.limit) targets = targets.slice(0, args.limit)

  if (targets.length === 0) {
    console.log('No targets matched.')
    return
  }

  console.log(`CMS: ${baseUrl}`)
  console.log(`Plan: ${targets.length} item(s)${args.dryRun ? ' (DRY RUN)' : ''}`)
  for (const t of targets) console.log(`  - ${t.postType.padEnd(13)} ${t.slug.padEnd(20)} ${t.title}`)

  const client = new CmsClient(baseUrl)
  console.log('Logging in...')
  await client.login(email, password)

  let created = 0
  let skipped = 0
  let failed = 0

  for (const [i, t] of targets.entries()) {
    const tag = `[${i + 1}/${targets.length}] ${t.postType} ${t.slug}`
    try {
      const existing = await client.findExistingSlug(t.slug)
      if (existing) {
        console.log(`${tag}  SKIP (exists, id=${existing.id})`)
        skipped += 1
        continue
      }

      const start = Date.now()
      console.log(`${tag}  generating...`)
      const generated = await client.generate(t)
      const generatedSecs = ((Date.now() - start) / 1000).toFixed(1)

      if (args.dryRun) {
        const sectionKey = t.postType === 'airport-page' ? 'airportSections' : 'locationSections'
        const hasSections = Boolean(generated[sectionKey])
        console.log(`${tag}  dry-run OK (${generatedSecs}s, sections=${hasSections})`)
        created += 1
        continue
      }

      const payload = buildPostPayload(t, generated)
      const post = await client.createPost(payload)
      console.log(`${tag}  CREATED id=${post.id} (${generatedSecs}s)`)
      created += 1
    } catch (err: any) {
      console.error(`${tag}  FAIL  ${err?.message ?? String(err)}`)
      failed += 1
    }
  }

  console.log('---')
  console.log(`Done. created=${created}  skipped=${skipped}  failed=${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
