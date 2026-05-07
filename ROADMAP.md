# Template roadmap

Backlog of template-level improvements. None of these block per-client
work — the template is production-ready as-is. These are evolution items
that pay back across every client running on the template.

Order is rough priority, not strict.

---

## High-value next moves

### 1. Split `BlogPosts` into separate collections per content type

**Why** — currently every type of content (location pages, airport pages,
blog posts, news) lives in a single `BlogPosts` collection and is
discriminated by a `category` select field. Conditional groups
(`locationSections` / `airportSections`) appear or hide based on the
category. This works but it's getting unwieldy:

- The admin list view mixes 50+ different content types, making it hard
  for editors to find one specific page
- Per-collection access control isn't possible (every editor sees
  everything)
- The schema file is one large mixed schema; splitting would let each
  collection have its own focused fields and validation

**What** — split into:

| New collection | Replaces | Slug pattern |
|---|---|---|
| `LocationPages` | `BlogPosts` where `category='location-page'` | `/private-jet-transfer/<slug>/` |
| `AirportPages` | `BlogPosts` where `category='airport-page'` | `/airports/<slug>/` |
| `BlogPosts` (kept name) | `BlogPosts` where `category='blog'` | `/blog/<slug>/` |
| `News` | `BlogPosts` where `category='news'` | `/news/<slug>/` |
| `FleetVehicles` (new) | currently hardcoded in `src/pages/fleet.astro` | `/fleet/<slug>/` |
| `Services` (new) | currently hardcoded `src/data/content/services-*.md` | `/services/<slug>/` |

**Why bring Fleet + Services into the CMS?** — same reason content goes
in the CMS in the first place: editors should be able to update copy
without code changes. Fleet vehicles change quarterly. Service offerings
shift. Today both require a code edit + deploy, which is exactly the
pain point of a Duda migration in reverse.

**Cost** — this is meaningful work:

- D1 migration to create the new tables and copy data over
- New Payload collection schemas (mostly extracting from existing
  `blogPostSectionFields.ts`)
- Update `lib/payload.ts` to fetch from the right collection per type
- Update Astro page routes (`/private-jet-transfer/[slug].astro`,
  `/airports/[slug].astro`, etc.) to query the new collections
- Update `seed-cms.ts` to write to the new collections
- Update `/api/generate` to set the right collection target

Estimated effort: ~1–2 days of focused work to do it cleanly.

**Migration strategy for live sites** — after the schema split lands:

1. Deploy schema (new collections, old `BlogPosts` still intact)
2. Run a one-time `migrate-collections` script that copies rows from
   `BlogPosts` to the new tables based on category
3. Switch fetchers to read from the new collections
4. After verification, drop the old rows / mark old collection as legacy

**When** — after at least 2 client migrations are live on the template
so we have real-world feedback on what fields each content type actually
needs.

---

### 2. Migration scraper script (`scripts/migrate-from-source.ts`)

**Why** — every per-client migration spends time extracting content from
the old site into the template. Most of that extraction is mechanical
and scriptable.

**What** — a script that takes a source URL and a platform hint, and
outputs:

- `siteConfig.draft.ts` (brand name, phone, email pulled from header /
  footer / contact page)
- `src/data/content/*.md` files (one per page found in the sitemap)
- `public/brand/logo-imported.svg|png` (downloaded logo asset)
- `public/fleet/*` (downloaded vehicle photos if present)
- `migrations/<slug>/url-map.csv` (old → new URL skeleton for the
  redirects file)

Targets:

- `--source=duda` — handle Duda's specific HTML structure + asset CDN
- `--source=squarespace` — handle Squarespace's structure
- `--source=wordpress` — use WP REST API
- `--source=auto` — sniff and pick the right adapter

**Cost** — ~3–4 hours per source platform. Probably do Duda first since
that's the immediate need, then add others as they come up.

---

### 3. Per-client deploy preview environments

**Why** — currently every push deploys to production. For a migration in
progress, you want a stable preview URL the client can review before
DNS cutover.

**What** — Cloudflare Workers supports preview deployments via
`wrangler deploy --env=preview`. Add a `preview` environment to
`wrangler.jsonc` for both site and CMS, configure GH Actions to deploy
PR branches to preview.

**Cost** — 2–4 hours.

---

## Smaller wins

### 4. Per-client design tokens via build-time replacement

If a client wants colors meaningfully different from the template
default, currently the CSS variables are edited per-client in
`global.css` (small per-fork divergence from the template). A cleaner
approach: a `theme.json` per client that the build reads to inject
tokens. Lets the rest of the template stay in lockstep with upstream.

### 5. Multi-tenant CMS (one CMS Worker, many client sites)

Instead of one Worker pair per client, spin up one shared CMS that
serves all clients (separate D1 tenants), with each client's Astro site
fetching from their own tenant. Reduces infra cost and admin overhead at
the price of operational complexity. Worth considering after 5+ clients
are running.

### 6. Automated content cron

Cloudflare Cron Trigger on the CMS Worker that runs `seed-cms --type=blogs`
weekly with a fresh topic list, creating ongoing blog content
automatically. Only run after a client has explicitly opted in (and is
paying for the API spend).

### 7. SEO change set tooling

A "site-wide change" command that, given a diff, runs across every
client repo (template forks): apply the change, push, deploy. Lets the
agency push e.g. a meta-description format change to all 10 clients in
one command rather than 10 manual PRs.

---

## Tracked but not committed to

These have been mentioned but haven't earned the priority yet:

- A second template for non-aviation chauffeur businesses (event /
  wedding / executive-only) without the airport pages
- A native Limo Anywhere booking integration (vs the current iframe
  embed)
- Native Stripe / payment processor integration for deposits
- Multilingual support (the European clients especially)
- Push-to-Google-My-Business automation when CMS posts publish

---

## How to use this file

Whenever a per-client migration reveals a friction point that would be
solved by template-level work, add it here. Don't fix it inside a single
client repo — that creates per-client divergence which is exactly what
we left Duda to escape.

When you start template-level work, move the corresponding entry into a
GitHub issue / project board, link the issue back here, and remove from
this file once shipped.
