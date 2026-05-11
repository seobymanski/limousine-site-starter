import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'
import { r2Storage } from '@payloadcms/storage-r2'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { BlogPosts } from './collections/BlogPosts'
import { Authors } from './collections/Authors'
import { PetitionSignatures } from './collections/PetitionSignatures'
import { ContactSubmissions } from './collections/ContactSubmissions'
import { NewsletterSubscribers } from './collections/NewsletterSubscribers'
import { AnalyticsGa4Snapshots } from './collections/AnalyticsGa4Snapshots'
import { AnalyticsGscSnapshots } from './collections/AnalyticsGscSnapshots'
import { AnalyticsKeywordRankings } from './collections/AnalyticsKeywordRankings'
import { AnalyticsCompetitorSnapshots } from './collections/AnalyticsCompetitorSnapshots'
import { TrackedKeywords } from './collections/TrackedKeywords'
import { TrackedCompetitors } from './collections/TrackedCompetitors'
import { LLMTargetPrompts } from './collections/LLMTargetPrompts'
import { LLMMentionSnapshots } from './collections/LLMMentionSnapshots'
import { AISettings } from './globals/AISettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

// Treat both Payload's own CLI (payload/bin.js) and any local Node script under
// cms/scripts/ as CLI invocations — they run outside a Cloudflare Worker, so
// they need wrangler's PlatformProxy for bindings rather than
// @opennextjs/cloudflare's runtime context.
const isCLI = process.argv.some((value) => {
  const resolved = realpath(value)
  return Boolean(
    resolved?.endsWith(path.join('payload', 'bin.js')) ||
      resolved?.includes(path.join('cms', 'scripts')),
  )
})

// `payload generate:importmap` walks the full collection + plugin graph to
// register every component path. If we strip plugins (like r2Storage) when
// isCLI=true, the regen drops their imports — and the deployed Worker then
// fails to mount the admin because R2ClientUploadHandler can't be resolved.
// importmap gen is metadata-only (no R2 writes), so it's safe to load
// r2Storage during it. Detect that command specifically.
const isImportMapGen = process.argv.includes('generate:importmap')
const isProduction = process.env.NODE_ENV === 'production'

const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any

const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' · [BRAND] CMS',
      description: 'Content management for the [BRAND] site.',
    },
    avatar: {
      Component: '@/components/UserAvatar#default',
    },
    components: {
      graphics: {
        Logo: '@/components/AdminLogo#default',
        Icon: '@/components/AdminIcon#default',
      },
      beforeNavLinks: ['@/components/NavLogo#default'],
      beforeDashboard: [
        '@/components/DashboardHeader#default',
        '@/components/DashboardCards#default',
      ],
      afterNavLinks: [
        '@/components/AnalyticsNavLinks#default',
        '@/components/AdminListStyles#default',
      ],
    },
  },
  collections: [
    BlogPosts,
    Authors,
    Media,
    PetitionSignatures,
    ContactSubmissions,
    NewsletterSubscribers,
    Users,
    AnalyticsGa4Snapshots,
    AnalyticsGscSnapshots,
    AnalyticsKeywordRankings,
    AnalyticsCompetitorSnapshots,
    TrackedKeywords,
    TrackedCompetitors,
    LLMTargetPrompts,
    LLMMentionSnapshots,
  ],
  globals: [AISettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteD1Adapter({ binding: cloudflare.env.D1, blocksAsJSON: true }),
  logger: isProduction ? cloudflareLogger : undefined,
  cors: [
    'https://example.com',
    'https://www.example.com',
    'https://CLIENT-site.workers.dev',
    'http://localhost:4321',
    'http://localhost:3000',
  ],
  // r2Storage attaches lifecycle hooks to the media collection that assert
  // a Worker-style R2 binding shape. Those assertions throw when running
  // local CLI scripts (e.g. cms/scripts/migrate-content.ts) even on
  // metadata-only creates, so we skip the plugin in CLI mode. importmap
  // regen is special-cased: we DO load r2Storage there so the deployed
  // Worker keeps its R2ClientUploadHandler imports in the generated map.
  plugins: isCLI && !isImportMapGen
    ? []
    : [
        r2Storage({
          bucket: cloudflare.env.R2,
          collections: { media: true },
        }),
      ],
})

function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}
