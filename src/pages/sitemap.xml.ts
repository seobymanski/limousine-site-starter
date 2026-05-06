/**
 * Top-level sitemap index. Lists the auto-generated static URLs
 * (sitemap-0.xml from @astrojs/sitemap) plus the dynamic CMS sitemap
 * (sitemap-cms.xml) which adds posts, authors, and any other CMS-managed
 * content types.
 *
 * robots.txt points here. Both /sitemap.xml and /sitemap-index.xml
 * resolve to the same authoritative index.
 *
 * PER-CLIENT TODO: change the SITE constant below to the client's
 * canonical domain.
 */
export const prerender = false;

import type { APIRoute } from 'astro';

const SITE = 'https://CLIENT-DOMAIN.com'; // TODO per-client: production canonical URL, no trailing slash

export const GET: APIRoute = async () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap>
  <sitemap><loc>${SITE}/sitemap-cms.xml</loc></sitemap>
</sitemapindex>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
};
