import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import robotsTxt from 'astro-robots-txt';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
  // TODO (per-client): set to the client's production domain
  site: 'https://example.com',
  integrations: [
    react(),
    sitemap(),
    robotsTxt({
      policy: [{ userAgent: '*', allow: '/', disallow: ['/api/'] }],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
