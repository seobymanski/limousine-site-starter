# Limousine Site Starter — Per-Client Setup Checklist

A reusable Astro + Payload CMS starter for limousine / black-car / chauffeur businesses. Clone it for each new client and walk through this checklist before first deploy.

## Stack

- **Astro 6** — public site, SSR on Cloudflare Workers
- **Payload CMS 3** — admin + content API, also on Cloudflare Workers
- **Cloudflare D1** — SQLite database
- **Cloudflare R2** — media storage
- **Resend** — transactional email (contact form + newsletter)
- **Anthropic Claude** — AI content generation for location/airport/service pages
- **Perplexity Sonar** — live web research with citations (optional)
- **GA4 + Google Search Console** — daily traffic + search-impression snapshots
- **DataForSEO** — weekly keyword rankings + competitor gap analysis
- **OpenAI** — used alongside Claude/Perplexity for weekly LLM-mention tracking

## Per-client setup

### 1. Project naming

- [ ] `package.json` root → set `name` to `<client>-site`
- [ ] `wrangler.jsonc` (root) → `name`, `vars.PAYLOAD_CMS_URL`
- [ ] `astro.config.mjs` → `site` = client's production URL
- [ ] `cms/wrangler.jsonc` → `name` (Worker), `database_id`, `database_name`, `services[0].service`, `r2_buckets[0].bucket_name`

### 2. Brand palette (the most important step for rebranding)

All admin brand colors live in **`cms/src/lib/brand.ts`** — a single source of truth. Editing this one file re-skins the entire CMS admin (sidebar, buttons, dashboard cards, focus rings, links, transactional emails).

For each new client:

- [ ] Set `primary` (hex of primary brand color)
- [ ] Set `primaryRgb` to the SAME color in `r, g, b` digits (e.g. `#005580` → `'0, 85, 128'`) — needed for the `primaryAlpha()` helper to build translucent washes
- [ ] Set `primaryDark` to a slightly darker hover/pressed shade (reduce each RGB channel by ~15-20%)
- [ ] Set `primaryDeep` to a deep accent for section labels & link text on the light content surface (~30-35% darker than primary)
- [ ] Set `onPrimary` to the readable text color when sitting ON the primary bg — use `'#111111'` if primary is light, `'#ffffff'` if primary is dark (luminance check: `(0.299*R + 0.587*G + 0.114*B) / 255 > 0.5` → primary is light)

The surface tokens (dark sidebar, light content area) only need touching if you want to flip the canvas — most rebrands leave them alone.

> If `/build-website` is orchestrating this setup, it will write `brand.ts` automatically from the palette collected in the onboarding questionnaire.

### 3. Cloudflare infrastructure (run once per client)

```bash
# Replace <client> with the client's short name
pnpm wrangler d1 create <client>-cms
# Paste the returned database_id into cms/wrangler.jsonc

pnpm wrangler r2 bucket create <client>-media
# Paste the bucket name into cms/wrangler.jsonc
```

### 4. Secrets (run inside `cms/`)

```bash
cd cms
pnpm wrangler secret put PAYLOAD_SECRET        # openssl rand -hex 32
pnpm wrangler secret put ANTHROPIC_API_KEY     # console.anthropic.com
pnpm wrangler secret put PERPLEXITY_API_KEY    # perplexity.ai/settings/api
pnpm wrangler secret put RESEND_API_KEY        # resend.com/api-keys

# --- Analytics module (skip if not using analytics) ---
pnpm wrangler secret put CRON_SECRET                # openssl rand -hex 32
pnpm wrangler secret put GA4_PROPERTY_ID            # numeric GA4 property ID
pnpm wrangler secret put GSC_SITE_URL               # "https://www.example.com/" or "sc-domain:example.com"
pnpm wrangler secret put GOOGLE_OAUTH_CLIENT_ID
pnpm wrangler secret put GOOGLE_OAUTH_CLIENT_SECRET
pnpm wrangler secret put GOOGLE_OAUTH_REFRESH_TOKEN
pnpm wrangler secret put DATAFORSEO_LOGIN
pnpm wrangler secret put DATAFORSEO_PASSWORD
pnpm wrangler secret put OPENAI_API_KEY
```

### 5. CORS origins

Search for `CLIENT.workers.dev` and `example.com` placeholders:

```bash
grep -rn "CLIENT.workers.dev\|example.com" cms/src src/
```

Replace each hit with the client's real Astro site + CMS Worker URLs. Files to check:

- [ ] `cms/src/payload.config.ts` → `cors` array
- [ ] `cms/src/app/api/sign-petition/route.ts` → `ALLOWED_ORIGINS` (if petitions are used)
- [ ] `cms/src/app/api/petition-stats/route.ts` → `ALLOWED_ORIGINS`
- [ ] `cms/src/app/api/generate/route.ts` → `STATIC_PAGES`
- [ ] `src/lib/payload.ts` → `FALLBACK_PAYLOAD_URL`
- [ ] `src/pages/api/contact.ts` → `from:` and `to:` emails
- [ ] `cms/src/lib/newsletter-broadcast.ts` → `SITE_URL`
- [ ] `cms/src/app/api/newsletter/unsubscribe/route.ts` → `SITE_URL`
- [ ] `cms/src/app/api/subscribe-newsletter/route.ts` → `SITE_URL`, `CMS_URL`, `LOGO_URL`

### 6. Brand / admin UI

- [ ] `cms/src/components/AdminLogo.tsx` → swap placeholder for client wordmark
- [ ] `cms/src/components/NavLogo.tsx` → drop a new `public/brand/logo.svg` (the component already uses `mix-blend-mode: screen` so a dark-on-white logo blends out on the dark sidebar)
- [ ] `cms/src/components/DashboardHeader.tsx` → update greeting description
- [ ] `cms/src/components/PublishButton.tsx` → `SITE_URL` + `categoryPaths`
- [ ] `cms/src/payload.config.ts` → `admin.meta.titleSuffix` and `description`

### 7. Astro public-site

The `src/` folder ships with a working limousine-industry skeleton (homepage, services index, locations index, blog index, contact form). Per-client edits:

- [ ] `src/layouts/BaseLayout.astro` — confirm `SITE_URL` + `SITE_NAME` are set via env or inline
- [ ] `src/lib/payload.ts` — update `FALLBACK_PAYLOAD_URL`
- [ ] Hero copy, services list, locations list, testimonials, hours — replace placeholder copy
- [ ] `src/pages/api/contact.ts` — Resend `from:` and `to:` emails

### 8. AI Settings (after first deploy + login)

The `DEFAULT_SYSTEM_PROMPT` and `DEFAULT_POST_TYPES` in `cms/src/globals/AISettings.ts` are tuned for ground-transportation businesses. Per-client:

- [ ] Rewrite `DEFAULT_SYSTEM_PROMPT()` with the client's brand voice and service area
- [ ] Edit `DEFAULT_POST_TYPES()` — remove types that don't apply (e.g. limousine vs party-bus vs shuttle vs black-car), tune `additionalInstructions` and `useLiveResearch`
- [ ] After first deploy, seed from the UI console:
  ```js
  fetch('/api/seed-ai-settings', { method: 'POST', credentials: 'include' })
    .then(r => r.json())
    .then(console.log)
  ```

### 9. Analytics module (skip if not using analytics)

Same as `astro-payload-starter` — full SEO analytics layer with `/admin/analytics/*` dashboards. Per-client config in `cms/src/lib/analytics-config.ts`:

- [ ] `OUR_DOMAIN` — bare domain (e.g. `'acmelimo.com'`)
- [ ] `OUR_BRAND_VARIANTS` — lowercase substrings (e.g. `['acme limo', 'acme limousine']`)
- [ ] `DEFAULT_LOCATION` — geo for keyword tracking
- [ ] `OUR_BRAND_DISPLAY` — pretty name shown in the dashboard

After deploy, seed lists from `/admin/analytics/keywords`, `/admin/analytics/competitors`, `/admin/analytics/llm-prompts` and wire the cron routes from cron-job.org or GitHub Actions:

| Route | Cadence |
|---|---|
| `GET /api/analytics/cron/google-daily` | daily ~08:00 UTC |
| `GET /api/analytics/cron/dataforseo-weekly` | weekly Mon ~09:00 UTC |
| `GET /api/analytics/cron/llm-mentions-weekly` | weekly Mon ~10:00 UTC |

All cron routes are `CRON_SECRET`-gated via `Authorization: Bearer ${CRON_SECRET}` or `?secret=${CRON_SECRET}`.

### 10. First deploy

```bash
# From project root — deploy Astro
pnpm install
pnpm run deploy

# Then deploy CMS
cd cms
pnpm install
pnpm run deploy
```

### 11. Create first admin user

Visit `https://<client>-cms.<account>.workers.dev/admin` — it'll prompt to create the first user. After login, upload a profile picture and run the AI Settings seed (step 8).

### 12. Auto-deploy on git push

Push to `main` triggers the `.github/workflows/deploy.yml` workflow. Repo secrets required:

1. `CLOUDFLARE_API_TOKEN` — created at https://dash.cloudflare.com/profile/api-tokens with the "Edit Cloudflare Workers" template plus `Account · D1 · Edit` added
2. `CLOUDFLARE_ACCOUNT_ID` — the 32-char hex from your Cloudflare dashboard URL

## Notes

- Claude Opus 4.6 or Sonnet 4.5 works well for content generation (set in admin → AI Settings → Model).
- Perplexity Sonar base tier is ~$5/million tokens — affordable even for sites refreshing dozens of pages/mo.
- Resend free tier = 3,000 emails/month, enough for typical contact + newsletter use.
- Cloudflare Workers free tier = 100,000 requests/day, plenty for small businesses.
