/**
 * Payload CMS fetch helpers for the Astro site.
 *
 * The CMS lives at a separate Cloudflare Worker and exposes REST endpoints
 * under /api/{collection}. Blog pages call these at SSR time.
 *
 * Fallback URL MUST be the production CMS URL (never localhost) — on Cloudflare
 * Workers, import.meta.env may not contain runtime vars, and the fallback is
 * our safety net. Prefer Astro.locals.runtime.env when available.
 */

import type { AirportSections, BlogPost, LocationSections } from '../data/blog';

// Safety-net fallback when env vars are unavailable at SSR time.
const FALLBACK_PAYLOAD_URL = 'https://CLIENT-cms.workers.dev';

/**
 * Resolve the Payload CMS base URL.
 *
 * Priority:
 * 1. Cloudflare Workers runtime env (via `cloudflare:workers` import) — works in production SSR
 * 2. Vite/Astro build-time env (import.meta.env) — works in dev and static prerender
 * 3. Hardcoded production fallback — safety net
 *
 * Astro v6 removed `Astro.locals.runtime.env`; the new pattern is to import
 * env directly from `cloudflare:workers`. That import only exists on CF
 * Workers, so we try/catch the dynamic import.
 */
export function getPayloadUrl(): string {
  // Cloudflare Workers runtime
  try {
    // @ts-ignore - module only exists on Cloudflare Workers runtime
    const cfEnv = globalThis.process?.env?.PAYLOAD_CMS_URL;
    if (cfEnv) return cfEnv.replace(/\/$/, '');
  } catch {
    // ignore
  }
  // Build-time (Vite)
  const buildtimeUrl = (import.meta as any).env?.PAYLOAD_CMS_URL;
  if (buildtimeUrl) return buildtimeUrl.replace(/\/$/, '');
  return FALLBACK_PAYLOAD_URL;
}

async function fetchFromPayload<T = any>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const url = new URL(`${getPayloadUrl()}/api/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Payload fetch failed: ${res.status} ${res.statusText} (${url})`);
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------ */
/* Lexical → HTML converter                                            */
/* ------------------------------------------------------------------ */

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 1 << 1;
const FORMAT_STRIKE = 1 << 2;
const FORMAT_UNDERLINE = 1 << 3;
const FORMAT_CODE = 1 << 4;
const FORMAT_SUBSCRIPT = 1 << 5;
const FORMAT_SUPERSCRIPT = 1 << 6;

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(str: string): string {
  return escapeHtml(str);
}

function renderTextNode(node: any): string {
  let html = escapeHtml(node.text ?? '');
  const format = node.format ?? 0;
  if (format & FORMAT_BOLD) html = `<strong>${html}</strong>`;
  if (format & FORMAT_ITALIC) html = `<em>${html}</em>`;
  if (format & FORMAT_UNDERLINE) html = `<u>${html}</u>`;
  if (format & FORMAT_STRIKE) html = `<s>${html}</s>`;
  if (format & FORMAT_CODE) html = `<code>${html}</code>`;
  if (format & FORMAT_SUBSCRIPT) html = `<sub>${html}</sub>`;
  if (format & FORMAT_SUPERSCRIPT) html = `<sup>${html}</sup>`;
  return html;
}

function renderChildren(children: any[] | undefined, cmsUrl: string): string {
  if (!Array.isArray(children)) return '';
  return children.map((c) => renderNode(c, cmsUrl)).join('');
}

function renderNode(node: any, cmsUrl: string): string {
  if (!node || typeof node !== 'object') return '';

  switch (node.type) {
    case 'text':
      return renderTextNode(node);
    case 'linebreak':
      return '<br />';
    case 'paragraph':
      return `<p>${renderChildren(node.children, cmsUrl)}</p>`;
    case 'heading': {
      const tag = (node.tag || 'h2').toLowerCase();
      return `<${tag}>${renderChildren(node.children, cmsUrl)}</${tag}>`;
    }
    case 'quote':
      return `<blockquote>${renderChildren(node.children, cmsUrl)}</blockquote>`;
    case 'list': {
      const tag = node.listType === 'number' ? 'ol' : 'ul';
      return `<${tag}>${renderChildren(node.children, cmsUrl)}</${tag}>`;
    }
    case 'listitem':
      return `<li>${renderChildren(node.children, cmsUrl)}</li>`;
    case 'link': {
      const fields = node.fields || {};
      const url = fields.url || '#';
      const newTab = fields.newTab;
      const rel = newTab ? ' rel="noopener noreferrer"' : '';
      const target = newTab ? ' target="_blank"' : '';
      return `<a href="${escapeAttr(url)}"${target}${rel}>${renderChildren(node.children, cmsUrl)}</a>`;
    }
    case 'autolink': {
      const fields = node.fields || {};
      const url = fields.url || '#';
      return `<a href="${escapeAttr(url)}">${renderChildren(node.children, cmsUrl)}</a>`;
    }
    case 'horizontalrule':
      return '<hr />';
    case 'upload': {
      const val = node.value || {};
      const url = val.url ? (val.url.startsWith('http') ? val.url : `${cmsUrl}${val.url}`) : '';
      const alt = val.alt || '';
      return url ? `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" loading="lazy" />` : '';
    }
    case 'table':
      return `<table>${renderChildren(node.children, cmsUrl)}</table>`;
    case 'tablerow':
      return `<tr>${renderChildren(node.children, cmsUrl)}</tr>`;
    case 'tablecell': {
      const tag = node.headerState ? 'th' : 'td';
      return `<${tag}>${renderChildren(node.children, cmsUrl)}</${tag}>`;
    }
    case 'root':
      return renderChildren(node.children, cmsUrl);
    default:
      // Unknown node type: try to render children gracefully
      return renderChildren(node.children, cmsUrl);
  }
}

export function lexicalToHtml(lexical: any, cmsUrl: string): string {
  if (!lexical) return '';
  const root = lexical.root ?? lexical;
  return renderNode(root, cmsUrl);
}

/* ------------------------------------------------------------------ */
/* Transformers                                                        */
/* ------------------------------------------------------------------ */

function toIsoDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

function resolveMedia(
  ref: any,
  cmsUrl: string,
): { url: string; alt?: string } | undefined {
  if (!ref || typeof ref !== 'object' || !ref.url) return undefined;
  const url = ref.url.startsWith('http') ? ref.url : `${cmsUrl}${ref.url}`;
  return { url, alt: ref.alt };
}

/**
 * Convert a Payload group/array of section fields into the Astro-side shape.
 * RichText fields (Lexical JSON in Payload) become HTML strings here so the
 * Astro components can drop them straight into `set:html={...}`.
 */
function transformLocationSections(raw: any, cmsUrl: string): LocationSections | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  return {
    opening: lexicalToHtml(raw.opening, cmsUrl) || undefined,
    benefitsHeading: typeof raw.benefitsHeading === 'string' ? raw.benefitsHeading : undefined,
    benefitsBody: lexicalToHtml(raw.benefitsBody, cmsUrl) || undefined,
    about: lexicalToHtml(raw.about, cmsUrl) || undefined,
    ctaHeading: typeof raw.ctaHeading === 'string' ? raw.ctaHeading : undefined,
    whatWeOffer: lexicalToHtml(raw.whatWeOffer, cmsUrl) || undefined,
    topServices: Array.isArray(raw.topServices)
      ? raw.topServices
          .filter((s: any) => s?.heading)
          .map((s: any) => ({
            heading: String(s.heading),
            body: lexicalToHtml(s.body, cmsUrl) || '',
          }))
      : undefined,
    whyChooseUs: lexicalToHtml(raw.whyChooseUs, cmsUrl) || undefined,
    pricing: lexicalToHtml(raw.pricing, cmsUrl) || undefined,
    events: lexicalToHtml(raw.events, cmsUrl) || undefined,
    neighborhoods: lexicalToHtml(raw.neighborhoods, cmsUrl) || undefined,
    venues: lexicalToHtml(raw.venues, cmsUrl) || undefined,
    closingCtaHeading:
      typeof raw.closingCtaHeading === 'string' ? raw.closingCtaHeading : undefined,
    faqs: Array.isArray(raw.faqs)
      ? raw.faqs
          .filter((f: any) => f?.question && f?.answer)
          .map((f: any) => ({ question: String(f.question), answer: String(f.answer) }))
      : undefined,
  };
}

function transformAirportSections(raw: any, cmsUrl: string): AirportSections | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const qf = raw.airportQuickFacts && typeof raw.airportQuickFacts === 'object' ? raw.airportQuickFacts : {};
  return {
    opening: lexicalToHtml(raw.opening, cmsUrl) || undefined,
    benefitsHeading: typeof raw.benefitsHeading === 'string' ? raw.benefitsHeading : undefined,
    benefitsBody: lexicalToHtml(raw.benefitsBody, cmsUrl) || undefined,
    about: lexicalToHtml(raw.about, cmsUrl) || undefined,
    ctaHeading: typeof raw.ctaHeading === 'string' ? raw.ctaHeading : undefined,
    whatWeOffer: lexicalToHtml(raw.whatWeOffer, cmsUrl) || undefined,
    topServices: Array.isArray(raw.topServices)
      ? raw.topServices
          .filter((s: any) => s?.heading)
          .map((s: any) => ({
            heading: String(s.heading),
            body: lexicalToHtml(s.body, cmsUrl) || '',
          }))
      : undefined,
    whyChooseUs: lexicalToHtml(raw.whyChooseUs, cmsUrl) || undefined,
    fboOperators: Array.isArray(raw.fboOperators)
      ? raw.fboOperators
          .filter((f: any) => f?.name)
          .map((f: any) => ({
            name: String(f.name),
            url: typeof f.url === 'string' && f.url ? f.url : undefined,
            terminal: typeof f.terminal === 'string' && f.terminal ? f.terminal : undefined,
            body: lexicalToHtml(f.body, cmsUrl) || undefined,
          }))
      : undefined,
    airportQuickFacts: {
      runwayCount: typeof qf.runwayCount === 'string' ? qf.runwayCount : undefined,
      longestRunway: typeof qf.longestRunway === 'string' ? qf.longestRunway : undefined,
      elevation: typeof qf.elevation === 'string' ? qf.elevation : undefined,
      hours: typeof qf.hours === 'string' ? qf.hours : undefined,
      customsAvailable: typeof qf.customsAvailable === 'boolean' ? qf.customsAvailable : undefined,
      slotPPR: typeof qf.slotPPR === 'string' ? qf.slotPPR : undefined,
      body: lexicalToHtml(qf.body, cmsUrl) || undefined,
      sourceUrl: typeof qf.sourceUrl === 'string' ? qf.sourceUrl : undefined,
    },
    driveTimes: Array.isArray(raw.driveTimes)
      ? raw.driveTimes
          .filter((d: any) => d?.destination && d?.range)
          .map((d: any) => ({
            destination: String(d.destination),
            range: String(d.range),
            url: typeof d.url === 'string' && d.url ? d.url : undefined,
            blurb: typeof d.blurb === 'string' && d.blurb ? d.blurb : undefined,
          }))
      : undefined,
    localConsiderations: lexicalToHtml(raw.localConsiderations, cmsUrl) || undefined,
    closingCtaHeading:
      typeof raw.closingCtaHeading === 'string' ? raw.closingCtaHeading : undefined,
    faqs: Array.isArray(raw.faqs)
      ? raw.faqs
          .filter((f: any) => f?.question && f?.answer)
          .map((f: any) => ({ question: String(f.question), answer: String(f.answer) }))
      : undefined,
  };
}

export function transformPayloadBlogPost(doc: any, cmsUrl: string): BlogPost {
  const featured = resolveMedia(doc.featuredImage, cmsUrl);
  const banner = resolveMedia(doc.bannerImage, cmsUrl);

  const galleryImages = Array.isArray(doc.galleryImages)
    ? doc.galleryImages
        .map((entry: any) => {
          const media = resolveMedia(entry?.image, cmsUrl);
          if (!media) return null;
          return { url: media.url, alt: media.alt, caption: entry?.caption };
        })
        .filter(Boolean) as { url: string; alt?: string; caption?: string }[]
    : [];

  const ev = doc.eventDetails;
  const eventDetails = ev
    ? {
        eventDate: ev.eventDate || undefined,
        eventTime: ev.eventTime || undefined,
        venue: ev.venue || undefined,
        city: ev.city || undefined,
        price: ev.price || undefined,
        registrationUrl: ev.registrationUrl || undefined,
        registrationLabel: ev.registrationLabel || undefined,
      }
    : undefined;

  const bs = doc.buildingShowcase;
  const buildingShowcase = bs
    ? {
        architect: bs.architect || undefined,
        yearBuilt: bs.yearBuilt || undefined,
        style: bs.style || undefined,
        address: bs.address || undefined,
        city: bs.city || undefined,
        status: bs.status || undefined,
        tagline: bs.tagline || undefined,
        projectTeam: Array.isArray(bs.projectTeam)
          ? bs.projectTeam
              .filter((p: any) => p?.role && p?.name)
              .map((p: any) => ({ role: p.role, name: p.name, link: p.link || undefined }))
          : [],
      }
    : undefined;

  return {
    title: doc.title ?? '',
    slug: doc.slug ?? '',
    excerpt: doc.excerpt ?? '',
    body: lexicalToHtml(doc.body, cmsUrl),
    category: doc.category ?? 'newsletter',
    tags: Array.isArray(doc.tags) ? doc.tags.map((t: any) => t.tag).filter(Boolean) : [],
    author: {
      name: doc.author?.name ?? 'Staff',
      role: doc.author?.role,
      image: doc.author?.image,
    },
    publishedDate: toIsoDate(doc.publishedDate),
    status: doc.status === 'published' ? 'published' : 'draft',
    featuredImage: featured?.url,
    featuredImageAlt: featured?.alt,
    bannerImage: banner?.url,
    bannerImageAlt: banner?.alt,
    galleryImages,
    eventDetails,
    buildingShowcase,
    locationSections: transformLocationSections(doc.locationSections, cmsUrl),
    airportSections: transformAirportSections(doc.airportSections, cmsUrl),
    readingTime: typeof doc.readingTime === 'number' ? doc.readingTime : 1,
    metaTitle: doc.seo?.metaTitle || doc.title || '',
    metaDescription: doc.seo?.metaDescription || doc.excerpt || '',
    relatedPosts: Array.isArray(doc.relatedPosts)
      ? doc.relatedPosts.map((r: any) => r.postSlug).filter(Boolean)
      : [],
  };
}

/* ------------------------------------------------------------------ */
/* Fetchers                                                            */
/* ------------------------------------------------------------------ */

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  const data = await fetchFromPayload<{ docs: any[] }>('blog-posts', {
    'where[status][equals]': 'published',
    sort: '-publishedDate',
    limit: '100',
    depth: '2',
  });
  const cmsUrl = getPayloadUrl();
  return (data.docs || []).map((d) => transformPayloadBlogPost(d, cmsUrl));
}

/**
 * Fetch a single published blog post by slug.
 * Fail-closed: only returns posts with status === 'published'.
 */
export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const data = await fetchFromPayload<{ docs: any[] }>('blog-posts', {
    'where[and][0][slug][equals]': slug,
    'where[and][1][status][equals]': 'published',
    limit: '1',
    depth: '2',
  });
  const doc = (data.docs || [])[0];
  if (!doc) return null;
  return transformPayloadBlogPost(doc, getPayloadUrl());
}

/**
 * Fetch published posts filtered by category.
 * Category matches the Payload `category` select field.
 */
export async function fetchBlogPostsByCategory(
  category: string,
  limit: number = 50,
): Promise<BlogPost[]> {
  const data = await fetchFromPayload<{ docs: any[] }>('blog-posts', {
    'where[and][0][status][equals]': 'published',
    'where[and][1][category][equals]': category,
    sort: '-publishedDate',
    limit: String(limit),
    depth: '2',
  });
  const cmsUrl = getPayloadUrl();
  return (data.docs || []).map((d) => transformPayloadBlogPost(d, cmsUrl));
}

/**
 * Fetch a single published post by slug AND category.
 * Fail-closed: only returns posts that match both the slug and the expected
 * category, so a newsletter slug can't leak onto an events page.
 */
export async function fetchBlogPostBySlugAndCategory(
  slug: string,
  category: string,
): Promise<BlogPost | null> {
  const data = await fetchFromPayload<{ docs: any[] }>('blog-posts', {
    'where[and][0][slug][equals]': slug,
    'where[and][1][status][equals]': 'published',
    'where[and][2][category][equals]': category,
    limit: '1',
    depth: '2',
  });
  const doc = (data.docs || [])[0];
  if (!doc) return null;
  return transformPayloadBlogPost(doc, getPayloadUrl());
}

/**
 * Preview-only: fetch a post by slug AND category regardless of publish status.
 * Used by category [slug].astro pages when ?preview=1 is set so editors can
 * review drafts before publishing. Still requires the category to match so a
 * news slug can't leak onto a blog page.
 */
export async function fetchBlogPostBySlugAndCategoryAnyStatus(
  slug: string,
  category: string,
): Promise<BlogPost | null> {
  const data = await fetchFromPayload<{ docs: any[] }>('blog-posts', {
    'where[and][0][slug][equals]': slug,
    'where[and][1][category][equals]': category,
    limit: '1',
    depth: '2',
  });
  const doc = (data.docs || [])[0];
  if (!doc) return null;
  return transformPayloadBlogPost(doc, getPayloadUrl());
}

/**
 * Preview-only: fetch an author by slug regardless of publish status.
 * Mirrors fetchBlogPostBySlugAndCategoryAnyStatus for the Authors collection.
 * Returns the raw Payload document since there's no transform helper for
 * authors yet — callers should access fields off the `doc` directly.
 */
export async function fetchAuthorBySlugAnyStatus(slug: string): Promise<any | null> {
  const data = await fetchFromPayload<{ docs: any[] }>('authors', {
    'where[slug][equals]': slug,
    limit: '1',
    depth: '2',
  });
  const doc = (data.docs || [])[0];
  if (!doc) return null;
  return doc;
}

export interface PetitionSigner {
  firstName: string;
  lastInitial: string;
  city?: string;
  createdAt: string;
  comment?: string;
}

export async function fetchPetitionStats(
  postSlug: string,
): Promise<{ count: number; signers: PetitionSigner[] }> {
  const url = `${getPayloadUrl()}/api/petition-stats?postSlug=${encodeURIComponent(postSlug)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`petition-stats ${res.status}`);
  return res.json();
}
