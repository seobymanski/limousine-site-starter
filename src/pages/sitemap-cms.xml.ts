/**
 * Dynamic sitemap for content stored in the Payload CMS.
 *
 * Returns every published BlogPost as <SITE>/<categoryPath>/<slug>. The
 * categoryPaths map mirrors the one in cms/src/components/PublishButton.tsx
 * so the public URLs that Payload's "View Live Post" link to are exactly
 * the URLs we expose to crawlers.
 *
 * Cache: 5 min at the edge so freshly published content surfaces quickly
 * without hammering the CMS Worker.
 *
 * PER-CLIENT TODO:
 *  1. Set the SITE constant below.
 *  2. Update CATEGORY_PATHS to match the categories defined in
 *     cms/src/collections/BlogPosts.ts and the categoryPaths map in
 *     cms/src/components/PublishButton.tsx.
 *  3. If the project has Authors / Vendors / other collections with public
 *     pages, fetch and append those URLs the same way (see manskihaus or
 *     midtexmod for examples).
 */
export const prerender = false;

import type { APIRoute } from 'astro';
import { fetchBlogPosts } from '../lib/payload';

const SITE = 'https://CLIENT-DOMAIN.com'; // TODO per-client

// Keep in sync with cms/src/components/PublishButton.tsx categoryPaths
const CATEGORY_PATHS: Record<string, string> = {
  // 'blog': '/blog',
  // 'news': '/news',
  // ... add per-client
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  let posts: any[] = [];
  try {
    posts = await fetchBlogPosts();
  } catch (err) {
    console.error('[sitemap-cms] CMS fetch failed', err);
  }

  const postUrls = posts
    .filter((p) => p.slug && p.status === 'published' && CATEGORY_PATHS[p.category])
    .map((p) => ({
      loc: `${SITE}${CATEGORY_PATHS[p.category]}/${p.slug}`,
      lastmod: p.publishedDate || undefined,
    }));

  // TODO per-client: append authors, vendors, members, or other public
  // CMS-managed collections here. Pattern:
  //   const authors = await fetchAllAuthors();
  //   const authorUrls = authors.map((a) => ({ loc: `${SITE}/authors/${a.slug}` }));

  const urls = [...postUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
