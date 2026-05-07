# Migration Runbook

Per-client migration guide for moving any existing site (Duda, Squarespace,
WordPress, Wix, custom code) onto this template.

This is a **runbook**, not a tutorial. Follow it top to bottom for every
migration. Update the **Gotchas** section at the end whenever you hit
something not covered — every fix you document is hours saved on the next
client.

---

## Before you touch anything

A migration without a proper inventory is an outage waiting to happen. Run
this discovery phase **before** spinning up any new infrastructure.

### 1. Crawl the existing site

**Screaming Frog SEO Spider is the default tool.** Use it for every
migration unless the site is genuinely small (≤ 200 URLs) **and** has no
meaningful SEO history to preserve. Free version covers up to 500 URLs;
paid license needed for larger sites.

**Use Screaming Frog (required) when any of:**

- The site has > 200 URLs
- The site has measurable organic rankings or traffic you don't want to
  lose
- The platform's sitemap is unreliable (Duda, Wix — both auto-generate
  but routinely skip pages or include stale entries)
- The site has a blog with multiple authors, paginated archives, or
  category/tag pages
- Migration involves redirects from non-trivial inbound links (Google
  Ads landing pages, printed collateral, partner backlinks)

**Sitemap-only fallback is acceptable when all of:**

- ≤ 200 URLs
- No SEO history worth preserving
- Modern platform with a known-good sitemap (Astro / Next.js / WordPress
  + Yoast — these tend to produce accurate sitemaps)

#### What to export from Screaming Frog

- **Internal:All URLs** → CSV. This is your old-URL → new-URL mapping
  source of truth.
- **Internal:All Images** → CSV. Inventory of every image on the live
  site so nothing gets dropped.
- **Page Titles + Meta Descriptions** → CSV. Preserves the SEO state you
  paid to optimize.
- **Inlinks for every page** → CSV. Tells you which pages will need
  redirects (any URL that gets non-trivial inbound link counts).
- **Response Codes** → check for 4xx / 5xx pages. Don't migrate broken
  pages forward.
- **Hreflang / canonical tags** → record. The new site needs to honor
  whatever canonical strategy was in place.
- **Redirect chains** → SF identifies multi-hop chains. Collapse them in
  the new site (one 301, never a chain).
- **Sitemap.xml** → save a copy.

Save all CSVs in a `migrations/<client-slug>/` folder (gitignored — they
can be large and contain client-sensitive paths).

#### Sitemap fallback (when SF is genuinely not justified)

For tiny static sites that don't meet the SF threshold above, ask Claude
to do a sitemap-driven URL inventory:

```
1. curl https://<old-site>/sitemap.xml
2. parse all <loc> entries
3. for each URL, fetch + record HTTP status, title, meta description, h1
4. output a CSV in the shape Screaming Frog's "Internal:All" produces
```

**Limitations of this fallback that you must accept:**

- **Orphan pages are invisible.** Pages not listed in the sitemap (often
  the case for older posts, hidden landing pages, abandoned content)
  won't be in the inventory. They'll 404 after migration with no
  redirect.
- **Redirect chains aren't traced.** Only the final URL of any
  pre-existing redirect is recorded. Existing redirect logic can be
  silently lost.
- **Asset inventory has to be built separately.** The fallback only
  enumerates pages, not images / PDFs / CSS background images.
- **Inlink count per page is not computed.** You won't know which pages
  carry the most inbound link equity, so you can't prioritize redirects.
- **Broken internal links go undetected.** SF crawls every link; the
  fallback only fetches what's in the sitemap.

If any of those limitations sound like they'd matter for the client at
hand, **use Screaming Frog instead.** The fallback exists for cases
where the site is genuinely a known small inventory (a 12-page brochure
site, for example) and the trade-offs above don't apply.

### 2. Asset inventory

Run a **separate** asset crawl to find every image, PDF, and downloadable
file. Outputs to grab:

- All `<img src>` and CSS `background-image` URLs (including those served
  from a CDN like Squarespace's static.squarespace-cdn.com or Duda's
  irp.cdn-website.com).
- All `<a href>` links pointing to PDFs, brochures, fleet photos, and
  any other downloadable media.
- The original logo file at the highest available resolution.

Download every asset to `migrations/<client-slug>/assets/` so you can
upload them to R2 in one batch later.

### 3. Content audit

Open every URL in Screaming Frog's "All URLs" report and categorize each:

| Category | Where it goes in the new template |
|---|---|
| Homepage | `src/pages/index.astro` (already exists; customize content) |
| About / company story | `src/data/content/about.md` |
| Contact | `src/data/content/contact.md` + `src/pages/contact.astro` |
| Fleet overview | `src/pages/fleet.astro` (already exists) + `siteConfig.fleet` |
| Service page (per service line) | `src/pages/services/<slug>.astro` + `src/data/content/services-<slug>.md` |
| Location / city page | CMS, `category: 'location-page'` |
| Airport / FBO page | CMS, `category: 'airport-page'` |
| Blog post | CMS, `category: 'blog'` |
| News / announcement | CMS, `category: 'news'` |
| Privacy / Terms | `src/pages/privacy.astro`, `src/pages/terms.astro` |
| Booking / reservation flow | Embed external (Limo Anywhere iframe, etc.) — see Gotchas |

Anything that doesn't fit a row above is either:

1. A page you should sunset (set up a 301 redirect to the closest match), or
2. A new page type that warrants its own component — flag it and ask before
   improvising one off-spec.

### 4. Integrations audit

List every third-party widget on the site:

- Booking iframe (Limo Anywhere, Book Now, etc.)
- Payment processor (Stripe, Square)
- Chat widget (Intercom, Drift, Tawk)
- Forms (Typeform, Jotform, native)
- Tracking pixels (GA4, GTM, Meta Pixel, LinkedIn)
- Schema markup beyond LocalBusiness (FAQ, Service, Person)

Each integration becomes a checklist item for the new build. Don't try to
rebuild a third-party booking flow natively — embed the existing one.

### 5. Domain & DNS audit

Before touching anything in Cloudflare:

- Where are the **DNS records** managed today? (Registrar, Cloudflare,
  the old host's nameservers, etc.) Note the current nameservers.
- Is **email** routed through the same domain? If so, document every MX,
  SPF, DKIM, DMARC record so the cutover doesn't break inbound mail.
- Are there any **subdomain redirects** (www → root, or vice versa)?
- Is **HSTS** preloaded? If so, the cutover requires HTTPS from minute
  zero or browsers will hard-fail.
- Take a **screenshot** of every existing DNS record. Save it to
  `migrations/<client-slug>/dns-before.png`.

---

## Phase 1 — repo setup

```bash
gh repo create my-org/<client>-site \
  --template seobymanski/limousine-site-starter \
  --private --clone
cd <client>-site
pnpm install
```

### Update placeholders

Open these files and replace template values with the client's specifics:

| File | What to set |
|---|---|
| `wrangler.jsonc` | `name` → `<client>-site`, `PAYLOAD_CMS_URL` → final CMS URL (you'll know after the first deploy) |
| `cms/wrangler.jsonc` | `name`, `database_id`, `database_name`, `service`, `bucket_name` |
| `astro.config.mjs` | `site` → client's production canonical URL |

The CI preflight job in `.github/workflows/deploy.yml` refuses to deploy
if any starter placeholder remains. If the deploy fails preflight, read
the annotation — it points at the file:line.

### Create Cloudflare resources

```bash
cd cms
npx wrangler login                                # one-time browser auth
npx wrangler d1 create <client>-cms               # copy the returned database_id into cms/wrangler.jsonc
npx wrangler r2 bucket create <client>-media     # bucket for the CMS Media collection
cd ..
```

### Set GitHub Actions secrets

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo <owner>/<repo>
gh secret set CLOUDFLARE_ACCOUNT_ID --repo <owner>/<repo>
```

### Set Worker secrets (per-client API keys)

```bash
cd cms
npx wrangler secret put PAYLOAD_SECRET           # 32+ char random string
npx wrangler secret put ANTHROPIC_API_KEY        # sk-ant-...
npx wrangler secret put PERPLEXITY_API_KEY       # pplx-...
npx wrangler secret put GEMINI_API_KEY           # AIza...
npx wrangler secret put RESEND_API_KEY           # optional, for newsletter
```

### First deploy

```bash
git push origin main
# CI deploys both Workers. Confirm at:
# https://<client>-site.<your-subdomain>.workers.dev
# https://<client>-cms.<your-subdomain>.workers.dev
```

After the first deploy:

1. Visit `<client>-cms>/admin` and create the first admin user (Payload
   prompts inline).
2. Save credentials to a password manager (you'll need them for the seed
   scripts).

---

## Phase 2 — brand transfer

### `src/data/site-config.ts`

Replace every value with the client's data:

- `name`, `fullName`, `shortName`, `tagline`, `description`
- `founded`, `founder`
- `url`, `phone`, `phoneRaw`, `phoneHref`, `email`, `emailHref`
- `address` (HQ used in schema markup)
- `offices` (each operating base)
- `partnerships` (CAA, NLA, ABLA, or whatever the client has)
- `social` (every platform they actually maintain — empty string for unused)
- `services` (each service line, with `slug` matching `/services/<slug>`)
- `fleet` (each vehicle category)
- `cities` (each location they actively serve, with slug matching
  `/private-jet-transfer/<slug>`)

### Brand assets

Replace these files with the client's:

| File | Spec |
|---|---|
| `public/brand/logo.svg` | Wordmark logo. SVG preferred. Black wordmark on transparent works best across light + dark surfaces. |
| `public/og-default.svg` | Social-share fallback (1200×630 px effective area). |
| `public/favicon.ico` | 32×32 / 16×16 favicon. |

### Fleet photos

Drop the client's actual fleet photos into `public/fleet/` matching the
filenames referenced in `src/pages/fleet.astro`. White-background photos
work fine; the page applies `mix-blend-multiply` so the white knocks out
against the ivory page background.

### Color palette (only if the client wants something other than the
template default)

Edit `src/styles/global.css`:

- `--color-ivory` — primary page background
- `--color-accent-500` — gold/brand accent
- `--color-primary-500` — body / button base

The whole component library reads from these variables. One edit cascades.

---

## Phase 3 — content transfer

### Static page content

For each static page, paste the client's existing copy into the matching
markdown file in `src/data/content/`:

- `home.md` — homepage hero + section frontmatter
- `about.md` — about page body
- `contact.md` — contact page intro
- `fleet.md` — fleet page intro + category descriptions
- `services.md` — services overview page
- `services-<slug>.md` — one per service line
- `privacy.md`, `terms.md` — legal pages

The frontmatter (title, description, h1, heroSubhead, ogImage) maps to
SEO meta on the rendered page. **Don't lose the meta — copy it from the
old site's source HTML / Screaming Frog export.**

### CMS content

Open the deployed `<client>-cms>/admin` and create entries by category:

#### Location pages (`category: 'location-page'`)

For every city in `siteConfig.cities`, create a corresponding CMS post. Two
ways:

1. **Manual** — `/admin → Website Content → Create New`. Set category to
   "Location Page (City)", set slug to match `siteConfig.cities[].slug`,
   click "Generate with AI" on the AI Generator field, paste a brief.
2. **Bulk** — `pnpm seed-cms --type=locations` from your local machine.
   Reads cities from `siteConfig`, calls `/api/generate` per city, creates
   the post. Idempotent (skip-if-slug-exists).

#### Airport pages (`category: 'airport-page'`)

Same flow as location pages, driven by `src/data/airports.ts`. Bulk seed:
`pnpm seed-cms --type=airports`.

#### Blog posts

Each existing blog post needs:

1. Title + slug (preserve the slug to keep the URL the same — see
   redirects section)
2. Excerpt + body (paste from old site, convert HTML → markdown if
   needed; AI generator can rewrite if the old copy is thin)
3. Featured image (upload via the Media collection — see image transfer
   below)
4. Published date (set to the original publish date, not today)
5. Author / byline

#### News, announcements, custom types

Same pattern as blog. Use the corresponding category.

### Image transfer to R2

**All images go into the CMS Media collection**, which writes to the
client's R2 bucket. Don't reference images from the old host's CDN — every
asset must move to R2 so the new site has zero dependency on the old
infrastructure.

Process:

1. Bulk upload the asset folder you collected during discovery to
   `/admin → Media`. Drag-and-drop multiple files at once.
2. For each post, attach the media item via the `featuredImage` /
   `bannerImage` / `galleryImages` fields. Use the media id, not a URL.
3. For inline images inside post body markdown, upload, then paste the
   served URL (`https://<client>-cms.workers.dev/api/media/file/<filename>`)
   into the body's image syntax.

**Why this matters:** if the old host kills the CDN URLs after migration
(Duda does this 90 days post-cancellation), every image that wasn't moved
becomes a broken image. Moving everything to R2 once permanently cuts the
old host out of the picture.

### Generate hero + gallery images for new posts

For posts that don't have client-supplied photography, run the image
seed:

```bash
export CMS_EMAIL='your-admin@example.com'
export CMS_PASSWORD='your-admin-password'
pnpm seed-images          # 1 hero + 2 gallery per post, ~$0.04 each
```

This uses Gemini Nano Banana via the `/api/generate-image` route.

---

## Phase 4 — site-level QA

Before any DNS cutover, run this checklist against the
`.workers.dev` preview URL.

| Check | How |
|---|---|
| Every page renders 200 | `for url in $(cat old-urls.csv); do curl -s -o /dev/null -w "%{http_code}  $url\n" $url; done` against the preview URL |
| Every CMS post is published, not draft | `/admin → Website Content`, filter by `status = published` |
| Every internal link resolves | Re-run Screaming Frog against the preview URL, look for 404s |
| Sitemap generated correctly | Visit `/sitemap-index.xml`, click through |
| robots.txt served | `/robots.txt` |
| Schema markup valid | Paste 3-4 representative URLs into [Google's Rich Results test](https://search.google.com/test/rich-results) |
| Meta titles + descriptions populated | `/admin` per post + Screaming Frog crawl of preview |
| Forms work | Submit the contact form; verify the email lands |
| Booking iframe works | If embedded, click through the actual booking flow end-to-end |
| Mobile responsive | DevTools → toggle device → check homepage, fleet, location detail, contact |
| Page weight under 2 MB | Lighthouse / WebPageTest the homepage |

Fix everything before moving to redirects.

---

## Phase 5 — redirects

This is where most migrations cause Google rankings to crater. Don't skip it.

### Build the URL mapping

From your Screaming Frog "Internal:All URLs" CSV:

1. Add a column "new URL" next to "old URL".
2. Fill in the new URL for every entry — use the matching page on the
   preview site. URLs that don't have a 1:1 equivalent on the new site
   should map to the closest semantic match (e.g. an old `/limo-rates`
   page maps to the new `/services/luxury-ground-transportation`).
3. Where the new URL is identical (homepage, services, fleet), no
   redirect needed — leave the column blank.

Save as `migrations/<client-slug>/url-map.csv`.

### Build the `_redirects` file

Cloudflare Workers static assets respect a `_redirects` file in the
`public/` directory. Format:

```
# old-path  new-path  status
/limo-rates  /services/luxury-ground-transportation  301
/airport-transfers  /services/private-fbo-transfers  301
/locations/manhattan  /private-jet-transfer/new-york-city  301
```

Generate this file from your URL map. One line per redirected URL.

Commit `public/_redirects` with the rest of the migration.

### Verify redirects

Push the redirects to the preview, then for every old URL:

```bash
for old in $(awk '{print $1}' public/_redirects); do
  echo -n "$old → "
  curl -s -o /dev/null -w "%{http_code}  %{redirect_url}" "https://<preview>$old"
  echo
done
```

Every line should be `301` and the `redirect_url` should match what's in
your URL map. Anything else means the redirect is wrong.

---

## Phase 6 — DNS cutover

The riskiest 30 minutes of the migration. Read this section twice before
executing.

### Pre-cutover (do these the day before)

1. **Add the custom domain to the new Cloudflare Worker:**
   - In the Cloudflare dashboard → Workers → `<client>-site` → Settings
     → Domains & Routes → Add Custom Domain → enter `<client-domain>.com`
     and `www.<client-domain>.com`.
   - Cloudflare provisions an SSL cert. Wait until both show "Active".
2. **Lower TTL on the existing DNS records to 300 seconds (5 min)**.
   This is how you make rollback fast. Do this 24+ hours before the
   cutover so the lower TTL has time to propagate.
3. **Confirm the DNS records you'll be changing:**
   - Root A record (or CNAME flattening) → currently points at old host
     IP / CNAME
   - `www` CNAME → currently points at old host
   - **Don't touch any MX / SPF / DKIM / DMARC records** — keep email
     where it is.
4. **Take a fresh screenshot of all current DNS records.**
   `migrations/<client-slug>/dns-before-cutover.png`

### Cutover

1. Pick a low-traffic window (Sunday morning, late evening) so any
   misstep affects fewer visitors.
2. Switch the DNS records:
   - Root domain → CNAME (or flattened A) to `<client>-site.<your-subdomain>.workers.dev`
     OR Cloudflare's "Use as proxy" toggle to route through the Worker
   - `www` → same
3. Watch propagation: `dig +short <client-domain>.com` from a couple of
   different networks. Should show the Cloudflare IP within 5–10 min.
4. Verify HTTPS works. If you see SSL errors, the custom domain didn't
   finish provisioning — wait, don't roll back yet.

### Smoke test

Within 30 minutes of cutover:

- Homepage loads at the real domain
- Contact form submits successfully (test email arrives)
- One representative URL of each type loads (services, fleet, location, airport)
- Every redirect from `_redirects` returns 301 to the right place
- Schema markup still valid on a couple representative pages

### First 24h

- Submit the new sitemap to Google Search Console: `Property → Sitemaps
  → Add → /sitemap-index.xml`.
- Switch the GSC property to the **new** URL pattern if needed.
- Watch GA4 / server logs for 4xx spikes — they reveal redirects you missed.

### Rollback (if something goes badly wrong)

You lowered TTL to 5 minutes the day before for exactly this reason. To
roll back: revert the DNS records to their pre-cutover values. Within
~5 minutes propagation, the old site is live again.

---

## Phase 7 — post-launch

After 7 days at the new host:

- Confirm Google Search Console shows the new sitemap as Submitted +
  pages indexing.
- Check rankings for ~10 representative keywords. Some movement is
  normal during migrations; sustained drops mean redirect or content
  problems.
- Update **external links you control**: Google Business Profile,
  Yelp, social bios, printed collateral, email signatures.
- After 30 days, cancel the old hosting. Don't cancel earlier — you may
  need to pull a forgotten asset.

---

## Per-platform notes

Source platforms differ in what they expose and where the gotchas live.
Add notes here as you learn each one.

### Duda

- **Asset URLs** are on `irp.cdn-website.com` and `lirp.cdn-website.com`.
  Both stay live for ~90 days after cancellation, then 404. Move every
  asset to R2 well before that window.
- **Custom widgets** (Limo Anywhere booking, Calendly, custom embeds)
  often live inside Duda's "HTML" widget. Inspect each one and decide
  whether to re-embed or replace.
- **Sitemap** is at `/sitemap.xml`. Use it as the seed for Screaming
  Frog if the site is small.
- **Page metadata** is set per-page in the Duda admin under SEO. Export
  via Screaming Frog rather than scraping the rendered HTML.
- **Forms** typically POST to Duda's hosted form handler. The new site
  needs its own form handler (we have `/api/contact` wired to Resend).
- **Trailing slash strategy** — Duda redirects to trailing-slash. The
  new template does too, so this is normally fine.

### Squarespace

- **Asset URLs** are on `static.squarespace-cdn.com` (long path with
  cache-bust hash). Stay live indefinitely after a Squarespace
  subscription is cancelled, but moving them to R2 still avoids the
  cross-host dependency.
- **Page metadata** lives in Squarespace's per-page settings. Pull via
  Screaming Frog.
- **Custom code blocks** sometimes contain crucial scripts (booking,
  pixels). Inspect every "code block" element.

### WordPress

- Use the WordPress REST API (`/wp-json/wp/v2/posts`) to bulk-export
  posts as JSON. Parse into the CMS content format.
- Featured images come from the WP media library (`/wp-content/uploads/`).
  Download all + upload to R2.
- Plugins like Yoast SEO store metadata in post meta — pull that, don't
  re-derive from the rendered page.

### Wix

- The hardest source platform to migrate from cleanly because Wix
  doesn't expose clean exports. Plan extra time. Screaming Frog + manual
  copy/paste is usually the path.

### Custom code

- Best case for content transfer — the source repo gives you everything
  structured. Brand assets, content files, schema all available.
- Worst case for redirects — custom URL structures often don't have a
  clean 1:1 mapping to this template. Spend more time on the URL map.

---

## Gotchas

Add new entries here whenever a migration hits something you wouldn't have
known to expect. **Every entry saves the next migration time.** Format:

> ### Short title
>
> What happened, what fixed it, where to look next time.

### Cloudflare D1 has a soft create-rate limit

If you spin up several `wrangler d1 create` calls in a single hour, you
may get a `Too Many Requests` error. Space them out across days when
migrating multiple clients in parallel, or open a support ticket to bump
the limit.

### Worker custom-domain SSL takes 1–10 minutes

After adding a custom domain in the Cloudflare dashboard, the SSL cert
provisions asynchronously. Don't initiate DNS cutover until both the
root and `www` domains show "Active" in the Domains panel.

### `<img>` tags inside markdown body content need absolute URLs

If a CMS post body has `<img src="/some-path">` referring to the old
host, the path is relative to the **new** host after migration and 404s.
Either rewrite to absolute R2 URLs during the import, or move the
referenced image to R2 and update the path.

### Booking iframes need explicit allow-list on cross-origin headers

If the client uses a Limo Anywhere or similar booking iframe, the new
site's CSP / `X-Frame-Options` must allow the iframe origin. Check the
deployed Worker's response headers and add an exception if needed.

### Anthropic API rate-limits at 50 req/min on the default tier

`pnpm seed-cms` can hit this when generating 30+ posts in a row. The
script already paces calls one-at-a-time which is well under 50/min,
but if you parallelize anything, throttle.

---

## Per-migration audit log

For each client migration, keep a short post-mortem in
`migrations/<client-slug>/POST-MORTEM.md`:

```md
# <client> migration post-mortem

- Source: Duda
- Pages migrated: 47
- Redirects added: 31
- Time: cutover Sunday 2026-MM-DD 10:00 ET, smoke test green by 10:23 ET
- Gotchas hit: 3 — see Gotchas below
- Rankings 7 days post: ±2 positions on tracked keywords (no losses)
- Outstanding TODOs: ...
```

Cross-link any new gotchas you uncovered to the **Gotchas** section in this
file. The runbook stays current that way.
