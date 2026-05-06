import type { CollectionConfig } from 'payload'

/**
 * Daily snapshot of Google Analytics 4 metrics. One row per day per property.
 * Written by the nightly cron at /api/analytics/cron/google-daily.
 *
 * Top pages and top sources are stored as JSON because they're only ever read
 * as a list (never queried by individual entry).
 */
export const AnalyticsGa4Snapshots: CollectionConfig = {
  slug: 'analytics-ga4-snapshots',
  labels: {
    singular: 'GA4 Snapshot',
    plural: 'GA4 Snapshots',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'snapshotDate',
    defaultColumns: ['snapshotDate', 'sessions', 'users', 'pageviews'],
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
    { name: 'sessions', type: 'number', defaultValue: 0 },
    { name: 'users', type: 'number', defaultValue: 0, admin: { description: 'Active users for the day.' } },
    { name: 'newUsers', type: 'number', defaultValue: 0 },
    { name: 'pageviews', type: 'number', defaultValue: 0 },
    { name: 'bounceRate', type: 'number', admin: { description: 'Decimal 0-1.' } },
    { name: 'avgSessionDuration', type: 'number', admin: { description: 'Seconds.' } },
    { name: 'conversions', type: 'number', defaultValue: 0 },
    {
      name: 'topPages',
      type: 'json',
      admin: { description: 'Top 10 pages by pageviews. Array of { path, pageviews }.' },
    },
    {
      name: 'topSources',
      type: 'json',
      admin: { description: 'Top 10 traffic sources by sessions. Array of { source, sessions }.' },
    },
  ],
}
