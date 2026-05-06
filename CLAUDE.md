# Claude — repo conventions for `limousine-site-starter`

This file is read by Claude on every session. It exists to make AI agents
productive in this repo without having to re-discover every convention by
reading code. Humans should read **README.md** instead.

This is a **template** — clone it, customize per client, deploy. The site is
two Cloudflare Workers: an Astro SSR frontend and a Payload CMS backend
with D1 + R2.

---

## Brand defaults

These are the *template* defaults. Each client overrides via `siteConfig` and
their own logo. Don't change the architecture; only the values in
`src/data/site-config.ts` and `public/brand/logo.svg`.

| Token | Value |
|---|---|
| Background | `var(--color-ivory)` (`#fafaf6`) |
| Foreground / cards | `bg-black` |
| Accent (gold) | `var(--color-accent-500)` (`#c9a96e`) |
| Display font | Cormorant (serif) |
| Body | Sans default |

Many clients in this niche lean black + ivory + warm gold. If a client wants
a different palette, change `src/styles/global.css` color tokens — every
component reads from the variables.

---

## Hero variants (`src/components/Hero.astro`)

- `homepage` — 5/12 text + 7/12 video on the right with **custom mute / play
  overlay** (no native HTML5 controls). Autoplay-muted-loop with
  `preload="auto"` and `playsinline`. `mix-blend` is *not* needed here.
  `min-h-[62vh]` default.
- `dark` — full-bleed image background with a bottom-up dark gradient for
  legibility. Used on city, airport, and contact heroes.
- `page` — light ivory bg, narrow, used on services and about.

Don't drop back to the old "split with bronze frame" or "frosted glass
panels" patterns; we tried both and ended on the current homepage layout.

---

## Cards

`AirportCard` and `LocationCard` are **always solid black** with ivory text
and a gold hairline grow on hover. Don't reintroduce the ivory / white card
variant — the dark cards are the brand mark.

---

## FBO grid math (`src/components/FBOList.astro`)

Pick the lg-breakpoint column count to fill the grid evenly so empty cells
don't render as bare gray. The mapping:

| Operator count | lg cols | Rows |
|---|---|---|
| 1 | 1 | 1 |
| 2 | 2 | 1 |
| 3 | 3 | 1 |
| **4** | **2** | **2 (perfect 2x2)** |
| 5 | 3 (texture pad on the empty cell) | 2 |
| 6 | 3 | 2 |
| 7 | 3 (texture pad on the empty cell) | 3 |
| 8 | 4 | 2 |
| 9 | 3 | 3 |

Primes (5, 7) fall back to a 3-col grid with a `cta-wave.svg` texture-pad
spanning the empty cell(s) via dynamic `grid-column: span N`. The function
`pickLgCols` lives in `FBOList.astro` — extend if a client has more than 9
FBOs at a single airport.

---

## Vehicle photos on `/fleet/`

Source images come on white backgrounds. Don't try to remove the backgrounds
in Photoshop — use **`mix-blend-multiply`** on the `<img>` so the white
blends into the ivory page. The CSS is the entire trick:

```html
<img class="object-contain mix-blend-multiply" />
```

`object-contain` (not `object-cover`) so the full vehicle is visible without
cropping captions baked into the image.

---

## CMS schema additions

Location and airport pages aren't long-form prose — they're structured pages
with named sections (FBO operators, drive times, FAQ, etc). The schema in
`cms/src/collections/blogPostSectionFields.ts` defines two conditional groups:

- `locationSections` — shown when `category === 'location-page'`
- `airportSections` — shown when `category === 'airport-page'`

Each group has typed fields (richText, text, array). The Astro side renders
each field with a dedicated component (`FBOList`, `DriveTimesTable`,
`AirportQuickFactsPanel`, `TopServicesBlock`, `FAQ`). **Don't dump the body
into one prose block** — the whole point of the structured schema is that
each section gets its own design.

---

## AI generation flow

`/api/generate` composes:

1. Base `systemPrompt` from `AISettings.ts` `DEFAULT_SYSTEM_PROMPT()`
2. Per-postType `additionalInstructions` appended (location/airport presets
   include the JSON shape contract)
3. Optional Perplexity research block (when `useLiveResearch: true` on the
   preset)
4. Internal links block from current published posts

For location-page / airport-page categories, the route returns BOTH the
universal fields (title, slug, excerpt, bodyMarkdown, etc.) AND a structured
`locationSections` / `airportSections` payload. The `GenerateAIButton`
writes those typed fields via Payload's `useField` hook.

When changing the JSON shape:
1. Update the preset's `additionalInstructions` in `AISettings.ts`
2. Update the parser in `cms/src/app/api/generate/route.ts`
3. Update the typed fields in `blogPostSectionFields.ts`
4. Update the renderer in `LocationPageBody.astro` / `AirportPageBody.astro`
5. Run `seed-ai-settings` to push the new preset to the live CMS

---

## Image generation (Gemini Nano Banana)

`/api/generate-image` uses Google's **`gemini-2.5-flash-image`** model
(NOT `-preview` — that name was deprecated when it went GA). Override via
`GEMINI_MODEL` Worker secret if Google renames it again.

Two slots:

- `slot=hero` → sets `featuredImage` and `bannerImage` on the post via raw
  D1 UPDATE
- `slot=gallery` → INSERTs a row into `blog_posts_gallery_images` with the
  next `_order` index

**Don't use `payload.update()`** in this route — it triggers an upsert-style
INSERT that fails on D1 with a swallowed SQLite error. Use the `D1` binding
directly.

---

## Migrations — important

The Payload schema-snapshot system is broken in this repo. `payload migrate:create`
generates 600+ line files trying to recreate tables that already exist
because intermediate hand-authored migrations never updated the snapshot.

**Always hand-write migrations.** Pattern:

1. Create `cms/src/migrations/<YYYYMMDD>_<HHMMSS>_<description>.ts`
2. Use `import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'`
3. Write minimal `up()` (just the changes) and `down()` (the inverse)
4. Add to `cms/src/migrations/index.ts` (both the import line AND the
   migrations array)
5. Use `IF NOT EXISTS` / `IF EXISTS` where reasonable so re-runs are safer

If a column or table already exists in production but isn't in the migration
history, write a no-op-friendly migration with `IF NOT EXISTS` rather than
rewriting the snapshot.

Before adding a column with a `REFERENCES` clause to `payload_locked_documents_rels`,
make sure the referenced table actually exists. SQLite accepts the syntax
silently but every subsequent query against the table fails with
"no such table" once foreign keys are enforced.

---

## CI preflight (`.github/workflows/deploy.yml`)

Catches the failure mode that cost a full afternoon once: deploys against a
tree where `wrangler.jsonc` still has placeholder values. The `preflight`
job greps for known starter strings and fails fast with file-line
annotations. Don't disable it; extend the `checks` array if you add new
placeholder patterns.

---

## Worker secrets (per client)

The deployed CMS Worker reads these secrets. Set them with
`cd cms && npx wrangler secret put <NAME>`.

| Secret | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude — drafts post body |
| `PERPLEXITY_API_KEY` | Live web research for grounded location/airport pages |
| `GEMINI_API_KEY` | Image generation (~$0.04/image) |
| `RESEND_API_KEY` | Optional — newsletter dispatch |
| `PAYLOAD_SECRET` | Payload session/JWT signing key |

`CLOUDFLARE_API_TOKEN` is a *GitHub Actions* secret (different ledger). Set
with `gh secret set CLOUDFLARE_API_TOKEN --repo <owner>/<repo>`.

---

## Per-section component cheatsheet

Each renders one named field group from `airportSections` / `locationSections`.

| Component | Inputs | Where |
|---|---|---|
| `Hero.astro` (variant=dark) | post title, excerpt, banner image | top of every detail page |
| `TopServicesBlock` | `topServices: array<{heading, body}>` | mid-page |
| `FBOList` | `fboOperators: array<{name, url, terminal, body}>` | airport pages — **most important block** |
| `AirportQuickFactsPanel` | `airportQuickFacts` group | airport pages |
| `DriveTimesTable` | `driveTimes: array<{destination, range, url}>` | airport pages |
| `FAQ` | `faqs: array<{question, answer}>` | both location & airport pages |
| `CTA` (variant=dark) | heading + description + bg | closing every page |

When asked to add a new section type, create the component, register it in
the appropriate body, then extend the schema + AI prompt + generate route.

---

## Seed scripts (`scripts/`)

- `seed-cms.ts` — generates content (calls `/api/generate` per item, posts
  result to `/api/blog-posts`). Idempotent (skip-if-slug-exists). Uses
  email/password from `CMS_EMAIL` / `CMS_PASSWORD` env vars.
- `seed-images.ts` — generates 1 hero + 2 gallery images per post via
  `/api/generate-image`. Same auth pattern. ~$0.04 per image.

Both scripts must include a `User-Agent` header on every fetch — Cloudflare
returns 1010 if Node's default UA hits a Worker.

---

## Things that aren't broken; don't fix them

- The `cta-wave.svg` and `asphalt.svg` textures in `public/textures/`. They
  do real visual work — don't replace with API-generated images.
- The frosted-glass header on transparent pages (`bg-[var(--color-ivory)]/85
  backdrop-blur-md`). The pattern handles light + dark backgrounds without
  needing a JS scroll-toggle.
- The `mix-blend-screen` rule on the logo for transparent headers — works
  for light backgrounds because the logo is black/white.
- The `fbo-grid-cols-N` scoped CSS in `FBOList.astro`. Tailwind can't
  generate dynamic column counts from a runtime variable; the scoped style
  block handles the fixed set of N values cleanly.

---

## When the user asks for "a new section"

1. Check existing `src/components/` for a similar pattern; reuse before
   creating.
2. Default section structure:

   ```html
   <section class="bg-[var(--color-ivory)] py-24 lg:py-32">
     <div class="mx-auto max-w-[1400px] px-6 lg:px-12">
       <div class="mb-14 lg:mb-20 max-w-3xl">
         <p class="eyebrow mb-5">EYEBROW</p>
         <h2 class="section-heading font-display text-4xl tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl">
           Heading.
         </h2>
       </div>
       <!-- content -->
     </div>
   </section>
   ```
3. Alternate sections between `bg-[var(--color-ivory)]` and `bg-white` to
   create rhythm.
4. Use the gold accent only as a **hairline** (border-l, border-b) or a
   single underline below an H2 — never as a fill.

---

## Don't

- Don't add JS-driven "scroll-aware" navbars or splash modals. The brand is
  understated.
- Don't introduce CSS shadows, drop-shadows, or glass-morphism beyond the
  one frosted header.
- Don't generate images via Gemini for "decorative texture" use cases —
  build SVG patterns in `public/textures/` instead.
- Don't run the seed scripts inside the Worker; they exceed the 5-minute
  CPU limit. Local Node only.
- Don't trust `payload migrate:create`. Hand-write migrations.
