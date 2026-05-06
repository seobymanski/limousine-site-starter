import type { CollectionConfig } from 'payload'

/**
 * Editor-managed list of competitor domains for DataForSEO weekly analysis.
 * Adding a domain here makes it appear in the next weekly competitor snapshot
 * (estimated traffic, ranked keyword count, content gap vs your site).
 */
export const TrackedCompetitors: CollectionConfig = {
  slug: 'tracked-competitors',
  labels: {
    singular: 'Tracked Competitor',
    plural: 'Tracked Competitors',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'domain',
    defaultColumns: ['domain', 'label', 'active'],
    group: 'Analytics',
    description: 'Competitor domains to compare against your site weekly. Add up to ~5 to keep DataForSEO costs in check. Bare domain only (no https://, no www).',
  },
  fields: [
    {
      name: 'domain',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'Bare domain only — e.g. "competitor.com" (no protocol, no path).' },
    },
    {
      name: 'label',
      type: 'text',
      admin: { description: 'Friendly name for the dashboard, e.g. "Competitor Inc.".' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Uncheck to stop tracking without losing history.' },
    },
    {
      name: 'notes',
      type: 'textarea',
      admin: { description: 'Optional context for why this competitor matters.' },
    },
  ],
}
