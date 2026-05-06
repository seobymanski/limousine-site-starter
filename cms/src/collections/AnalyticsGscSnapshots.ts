import type { CollectionConfig } from 'payload'

/**
 * Daily snapshot of Google Search Console metrics. One row per day per site.
 * Written by the nightly cron at /api/analytics/cron/google-daily.
 *
 * Top queries and top pages are stored as JSON because they're only ever
 * read as a list, not queried by individual entry.
 */
export const AnalyticsGscSnapshots: CollectionConfig = {
  slug: 'analytics-gsc-snapshots',
  labels: {
    singular: 'Search Console Snapshot',
    plural: 'Search Console Snapshots',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'snapshotDate',
    defaultColumns: ['snapshotDate', 'impressions', 'clicks', 'ctr', 'avgPosition'],
    group: 'Analytics',
    description: 'Auto-populated daily by the analytics cron. Read by /admin/analytics/overview. Manual edits not recommended.',
    hidden: true,
  },
  fields: [
    {
      name: 'snapshotDate',
      type: 'date',
      required: true,
      unique: true,
      index: true,
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'yyyy-MM-dd' } },
    },
    { name: 'impressions', type: 'number', defaultValue: 0 },
    { name: 'clicks', type: 'number', defaultValue: 0 },
    { name: 'ctr', type: 'number', admin: { description: 'Decimal 0-1.' } },
    { name: 'avgPosition', type: 'number', admin: { description: 'Average ranking position across queries.' } },
    {
      name: 'topQueries',
      type: 'json',
      admin: { description: 'Top 25 queries. Array of { query, impressions, clicks, ctr, position }.' },
    },
    {
      name: 'topPages',
      type: 'json',
      admin: { description: 'Top 25 pages. Array of { page, impressions, clicks, ctr, position }.' },
    },
  ],
}
