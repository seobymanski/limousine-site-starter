import type { CollectionConfig } from 'payload'

/**
 * Weekly snapshot of where your site ranks for each tracked keyword.
 * One row per keyword per week per location. Written by the weekly DataForSEO
 * cron at /api/analytics/cron/dataforseo-weekly.
 *
 * Position is null when your site doesn't appear in the top 100. URL is the
 * specific page that ranked. Search volume is denormalized for charting
 * convenience.
 */
export const AnalyticsKeywordRankings: CollectionConfig = {
  slug: 'analytics-keyword-rankings',
  labels: {
    singular: 'Keyword Ranking Snapshot',
    plural: 'Keyword Ranking Snapshots',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'keyword',
    defaultColumns: ['snapshotDate', 'keyword', 'position', 'url'],
    group: 'Analytics',
    description: 'Auto-populated weekly by the DataForSEO cron. Read by /admin/analytics/overview. Manual edits not recommended.',
    hidden: true,
  },
  fields: [
    {
      name: 'snapshotDate',
      type: 'date',
      required: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' } },
    },
    { name: 'keyword', type: 'text', required: true, index: true },
    { name: 'location', type: 'text' },
    {
      name: 'position',
      type: 'number',
      admin: { description: 'Google position (1-100). Null if not in top 100.' },
    },
    {
      name: 'url',
      type: 'text',
      admin: { description: 'The page on your site that ranked.' },
    },
    {
      name: 'searchVolume',
      type: 'number',
      admin: { description: 'Average monthly search volume for the keyword.' },
    },
  ],
}
