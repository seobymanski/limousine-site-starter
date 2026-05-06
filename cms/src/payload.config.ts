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

const isCLI = process.argv.some((value) => realpath(value)?.endsWith(path.join('payload', 'bin.js')))
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
    components: {
      graphics: {
        Logo: '@/components/AdminLogo#default',
        Icon: '@/components/AdminIcon#default',
      },
      beforeNavLinks: ['@/components/NavLogo#default', '@/components/AdminListStyles#default'],
      beforeDashboard: ['@/components/DashboardHeader#default'],
      afterNavLinks: ['@/components/AnalyticsNavLinks#default'],
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
  plugins: [
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
