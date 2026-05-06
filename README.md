# limousine-site-starter

A production-grade starter for **chauffeur / limousine / private-aviation
ground transportation** websites. Two Cloudflare Workers (Astro frontend +
Payload CMS) with structured location & airport pages, AI content
generation, image generation, and one-command deploys via GitHub Actions.

## What you get out of the box

- **Astro 6 SSR** site on Cloudflare Workers — homepage with split video
  hero, services grid, fleet page with mix-blend vehicle photos, fleet
  category page, contact, plus the structured detail-page system below.
- **Structured location pages** (`/private-jet-transfer/<city>/`) and
  **airport pages** (`/airports/<icao>/`) — each has typed CMS fields for
  FBO operators, drive times, quick facts, FAQ, top services, etc.
  rendered by dedicated Astro components, **not** one prose dump.
- **Payload CMS** (Next.js + D1 + R2) with admin UI, auth, custom AI
  generation buttons, and migration history.
- **Claude-powered content generation** with Perplexity grounding for
  location/airport pages.
- **Gemini Nano Banana image generation** (`gemini-2.5-flash-image`) —
  per-post hero + 2 gallery images.
- **Bulk seed scripts** (`pnpm seed-cms`, `pnpm seed-images`) that loop
  through every airport + city defined in `src/data/`, idempotent and
  resumable.
- **CI preflight guard** that fails the deploy in 5 seconds if any
  `wrangler.jsonc` placeholder slipped through, instead of dying inside a
  cryptic Cloudflare API error 40 seconds later.

## Stack

- Astro 6 + React 19 + Tailwind 4
- Payload CMS 3 (Next.js 15) on Cloudflare Workers via OpenNext
- Cloudflare D1 (SQLite) + R2 (media)
- Anthropic + Perplexity + Google Gemini APIs

---

## Initial setup (one-time, ~30 minutes)

### 1. Clone and rename

```bash
gh repo create my-org/<client>-site --template <your-org>/limousine-site-starter --clone
cd <client>-site
pnpm install
```

### 2. Cloudflare account prep

You need:

- A Cloudflare account
- An API token with permissions: Workers Scripts:Edit, D1:Edit, Workers R2 Storage:Edit, Account Settings:Read, User Details:Read
- The account ID (visible in the dashboard sidebar)

Create a D1 database and an R2 bucket for the new client:

```bash
cd cms
npx wrangler d1 create <client>-cms      # copy the returned database_id
npx wrangler r2 bucket create <client>-media
cd ..
```

Now open these and replace placeholders with the real values:

| File | What to set |
|---|---|
| `wrangler.jsonc` | `name` → `<client>-site`, `PAYLOAD_CMS_URL` → final CMS URL |
| `cms/wrangler.jsonc` | `name`, `database_id`, `database_name`, `service`, `bucket_name` |
| `astro.config.mjs` | `site` → client's production domain |

The CI preflight job will refuse to deploy if any placeholder values are
left in.

### 3. GitHub Actions secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo <owner>/<repo>
gh secret set CLOUDFLARE_ACCOUNT_ID --repo <owner>/<repo>
```

### 4. Worker secrets (per client, set on the deployed CMS)

These are runtime API keys for the AI services — never commit them.

```bash
cd cms
npx wrangler login                                # one-time browser auth
npx wrangler secret put PAYLOAD_SECRET            # paste any 32+ char random string
npx wrangler secret put ANTHROPIC_API_KEY         # paste sk-ant-...
npx wrangler secret put PERPLEXITY_API_KEY        # paste pplx-...
npx wrangler secret put GEMINI_API_KEY            # paste AIza...
npx wrangler secret put RESEND_API_KEY            # optional, for newsletter
```

### 5. First deploy

Push to `main` and the GitHub Actions workflow deploys both Workers
automatically. After the first successful deploy:

1. Open `https://<client>-cms.<your-account>.workers.dev/admin` and
   create the first admin user (Payload prompts inline).
2. From the terminal, push the latest AI prompt presets:

   ```bash
   curl -X POST 'https://<client>-cms.<your-account>.workers.dev/api/seed-ai-settings' \
     -H "Cookie: <your payload-token>" \
     -H 'Content-Type: application/json' \
     -d '{}'
   ```

   (Or just go into /admin → Settings → AI Settings and click Save once.)

---

## Customizing per client

Most of the per-client work is in `src/data/`:

| File | What to edit |
|---|---|
| `src/data/site-config.ts` | Brand name, phone, email, addresses, services, fleet, cities. Drives header, footer, schema markup, and most page metadata. |
| `src/data/airports.ts` | The airports the company actually services. Each entry creates `/airports/<icao>/`. Demo set ships with 5; replace. |
| `src/data/navigation.ts` | Wired to `siteConfig.cities` and `siteConfig.services` automatically. Add custom links here. |
| `src/data/testimonials.ts` | Customer reviews shown on homepage and select pages. Empty array is fine. |
| `src/data/content/*.md` | Static page copy (about, contact, fleet, services). The starter has demo copy with `[BRAND]` placeholders — search and replace. |

Brand assets:

| File | Replace with |
|---|---|
| `public/brand/logo.svg` | Client's logo. Black wordmark on transparent works best (the header uses `mix-blend-screen` on dark hero pages). |
| `public/og-default.svg` | Social-share preview. 1200×630 ideal. |

Fleet vehicle photos in `public/fleet/` are placeholder shots that work for
most chauffeur businesses. Replace with the client's actual fleet photos
(white background works — `mix-blend-multiply` knocks out the white
against the ivory page).

Color palette in `src/styles/global.css` (`--color-accent-500` is the gold
accent). Most clients keep the black + ivory + warm gold scheme; if a
client wants something different, change the variables once and every
component picks it up.

---

## Filling the CMS with content

After deploy, the CMS has the schema but no posts. Two options:

### Option A — bulk seed (one command, ~$15-20 in API credits, ~90 min)

Generates a full structured page for every airport in `airports.ts` and
every city in `siteConfig.cities` using Claude + Perplexity research.

```bash
export CMS_EMAIL='your-admin@example.com'
export CMS_PASSWORD='your-admin-password'
pnpm seed-cms                                # all categories
pnpm seed-cms --type=airports --limit=5      # subset
pnpm seed-cms --slug=kteb --dry-run          # preview cost without writing
```

Then generate hero + gallery images for every post (~$2-6 in Gemini credits):

```bash
pnpm seed-images
```

### Option B — write each page manually in /admin

Go to `/admin → Website Content → Create New`, pick the category, click
"Generate with Claude" on the AI Generator field, fill the brief.

---

## Local development

```bash
pnpm dev               # Astro frontend on :4321
cd cms && pnpm dev     # Payload CMS on :3000
```

The Astro site reads `PAYLOAD_CMS_URL` from `wrangler.jsonc` at build time.
For local-only dev against the deployed CMS, that's the URL the dev server
hits.

---

## Project structure

```
.
├── src/                     Astro frontend
│   ├── components/          Hero, FBOList, DriveTimesTable, AirportPageBody, ...
│   ├── data/                site-config, airports, navigation, testimonials
│   ├── data/content/        Static page copy (markdown)
│   ├── lib/                 payload.ts (CMS fetcher), content.ts (md loader)
│   ├── pages/               Astro routes (incl. /airports/[slug] and /private-jet-transfer/[slug])
│   └── styles/global.css    Color tokens, typography, button styles
├── cms/                     Payload CMS (Next.js)
│   ├── src/collections/     Payload schemas (BlogPosts, Authors, ...)
│   ├── src/globals/         AI Settings, etc.
│   ├── src/migrations/      D1 migrations (hand-written, see CLAUDE.md)
│   ├── src/app/api/         /generate, /generate-image, /seed-ai-settings, ...
│   └── wrangler.jsonc       CMS Worker config
├── scripts/
│   ├── seed-cms.ts          Bulk content generation
│   └── seed-images.ts       Bulk image generation
├── public/
│   ├── brand/               Logo + OG image
│   ├── fleet/               Vehicle photos
│   └── textures/            SVG textures for CTA waves and FBO grid pads
├── .github/workflows/
│   └── deploy.yml           Push-to-deploy with preflight guard
├── astro.config.mjs
├── wrangler.jsonc           Astro Worker config
├── CLAUDE.md                Conventions for AI agents working in this repo
└── README.md                You are here
```

---

## Caveats

- **Payload migrations are hand-written.** `payload migrate:create`
  produces broken auto-generated migrations because the snapshot system in
  this template lineage is out of sync. See CLAUDE.md.
- **Don't run seed scripts inside the Worker.** Cloudflare Workers have a
  CPU time limit (~30s default, 5min on paid plans) and the seeds make
  ~50+ API calls of ~100s each. Always run locally.
- The site is **server-rendered** (`output: 'server'`); no static export.

---

## License

Private template, all rights reserved.
