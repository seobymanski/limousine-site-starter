/**
 * Override @astrojs/sitemap's auto-generated /sitemap-index.xml so it lists
 * BOTH the static URL set (sitemap-0.xml) and the dynamic CMS sitemap
 * (sitemap-cms.xml). The integration's default only knew about the static
 * one, which meant any tool probing the conventional /sitemap-index.xml URL
 * would miss every CMS-managed page.
 *
 * robots.txt still points at /sitemap.xml — both URLs serve the same
 * authoritative index.
 *
 * PER-CLIENT TODO: change the SITE constant below to the client's
 * canonical domain.
 */
export const prerender = false;

import type { APIRoute } from 'astro';

const SITE = 'https://CLIENT-DOMAIN.com'; // TODO per-client

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
