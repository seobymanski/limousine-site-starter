/**
 * scripts/seed-images.ts
 *
 * Local Node runner that backfills hero images for every published blog post
 * that doesn't already have a featuredImage. Calls the deployed CMS's
 * /api/generate-image endpoint (Gemini 2.5 Flash Image / Nano Banana).
 *
 * Idempotent: skips posts that already have a featuredImage.
 *
 * Usage:
 *   CMS_EMAIL=... CMS_PASSWORD=... pnpm seed-images
 *   CMS_EMAIL=... CMS_PASSWORD=... pnpm seed-images --slug=kteb
 *   CMS_EMAIL=... CMS_PASSWORD=... pnpm seed-images --limit=5 --dry-run
 *
 * Per-image cost (~$0.04 charged to your Gemini API balance — separate from
 * Anthropic and Perplexity ledgers).
 */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

interface Args {
  slug?: string
  limit?: number
  dryRun: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = { dryRun: false }
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--slug=')) out.slug = arg.split('=')[1]
    else if (arg.startsWith('--limit=')) {
      const n = Number(arg.split('=')[1])
      if (Number.isFinite(n) && n > 0) out.limit = n
    } else if (arg === '--dry-run') out.dryRun = true
  }
  return out
}

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
    const res = await fetch(`${this.baseUrl}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`login: ${res.status} ${text.slice(0, 200)}`)
    }
    const setCookie = res.headers.get('set-cookie') || ''
    const m = setCookie.match(/payload-token=[^;]+/)
    if (m) this.cookie = m[0]
    try {
      const data = (await res.json()) as { token?: string }
      if (data.token) this.token = data.token
    } catch {}
    if (!this.cookie && !this.token) throw new Error('login: no token returned')
  }

  async listPosts(): Promise<Array<{ id: string | number; slug: string; title: string; category: string; featuredImage?: any }>> {
    const all: any[] = []
    let page = 1
    while (true) {
      const url = new URL(`${this.baseUrl}/api/blog-posts`)
      url.searchParams.set('limit', '100')
      url.searchParams.set('page', String(page))
      url.searchParams.set('depth', '0')
      const res = await fetch(url.toString(), { headers: this.headers({ Accept: 'application/json' }) })
      if (!res.ok) throw new Error(`list posts: ${res.status}`)
      const data = (await res.json()) as { docs: any[]; hasNextPage: boolean }
      all.push(...data.docs)
      if (!data.hasNextPage) break
      page += 1
    }
    return all
  }

  async generateImage(
    postId: string | number,
    slot: 'hero' | 'gallery' = 'hero',
    variant = 0,
  ): Promise<{ mediaId: string | number; filename: string }> {
    const res = await fetch(`${this.baseUrl}/api/generate-image`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ postId, slot, variant }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`generate-image (${slot}-${variant}): ${res.status} ${text.slice(0, 400)}`)
    }
    return res.json() as Promise<{ mediaId: string | number; filename: string }>
  }
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

  console.log(`CMS: ${baseUrl}`)

  const client = new CmsClient(baseUrl)
  console.log('Logging in...')
  await client.login(email, password)

  console.log('Fetching post list...')
  const posts = await client.listPosts()
  console.log(`  found ${posts.length} posts total`)

  // A post is "done" only when it has hero + 2 gallery images.
  let targets = posts.filter((p) => {
    const hasHero = Boolean(p.featuredImage)
    const galleryCount = Array.isArray((p as any).galleryImages) ? (p as any).galleryImages.length : 0
    return !hasHero || galleryCount < 2
  })
  console.log(`  ${posts.length - targets.length} already complete (skipping)`)
  if (args.slug) targets = targets.filter((p) => p.slug === args.slug)
  if (args.limit) targets = targets.slice(0, args.limit)

  if (targets.length === 0) {
    console.log('Nothing to do.')
    return
  }

  console.log(`Plan: generate images for ${targets.length} post(s)${args.dryRun ? ' (DRY RUN)' : ''}`)
  for (const p of targets) console.log(`  - ${p.category.padEnd(13)} ${p.slug.padEnd(20)} ${p.title}`)

  let generated = 0
  let failed = 0

  for (const [i, p] of targets.entries()) {
    const tag = `[${i + 1}/${targets.length}] ${p.category} ${p.slug}`
    if (args.dryRun) {
      console.log(`${tag}  dry-run (would generate hero + 2 gallery)`)
      generated += 3
      continue
    }
    const galleryCount = Array.isArray((p as any).galleryImages) ? (p as any).galleryImages.length : 0
    const slots: Array<{ slot: 'hero' | 'gallery'; variant: number; label: string }> = []
    if (!p.featuredImage) slots.push({ slot: 'hero', variant: 0, label: 'hero' })
    for (let v = galleryCount; v < 2; v += 1) {
      slots.push({ slot: 'gallery', variant: v, label: `gallery-${v + 1}` })
    }
    for (const [j, s] of slots.entries()) {
      const subtag = `${tag} (${j + 1}/${slots.length} ${s.label})`
      try {
        const start = Date.now()
        const res = await client.generateImage(p.id, s.slot, s.variant)
        const secs = ((Date.now() - start) / 1000).toFixed(1)
        console.log(`${subtag}  GENERATED media=${res.mediaId} (${secs}s)  ${res.filename}`)
        generated += 1
      } catch (err: any) {
        console.error(`${subtag}  FAIL  ${err?.message ?? String(err)}`)
        failed += 1
      }
    }
  }

  console.log('---')
  console.log(`Done. generated=${generated}  failed=${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error('FATAL', err)
  process.exit(1)
})
