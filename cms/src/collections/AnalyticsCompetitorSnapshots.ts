import type { CollectionConfig } from 'payload'

/**
 * Weekly snapshot of competitor performance metrics from DataForSEO.
 * One row per competitor domain per week. Written by the weekly cron at
 * /api/analytics/cron/dataforseo-weekly.
 *
 * Top keywords and gap keywords are stored as JSON because they're only ever
 * read as ordered lists for the dashboard, never queried by individual entry.
 */
export const AnalyticsCompetitorSnapshots: CollectionConfig = {
  slug: 'analytics-competitor-snapshots',
  labels: {
    singular: 'Competitor Snapshot',
    plural: 'Competitor Snapshots',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'domain',
    defaultColumns: ['snapshotDate', 'domain', 'estimatedTraffic', 'rankedKeywordsCount'],
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
    { name: 'domain', type: 'text', required: true, index: true },
    {
      name: 'estimatedTraffic',
      type: 'number',
      admin: { description: 'DataForSEO estimated monthly organic traffic.' },
    },
    {
      name: 'rankedKeywordsCount',
      type: 'number',
      admin: { description: 'Total keywords ranked in top 100.' },
    },
    {
      name: 'overlapWithUs',
      type: 'number',
      admin: { description: 'Keywords both this competitor and your site rank for.' },
    },
    {
      name: 'topKeywords',
      type: 'json',
      admin: { description: 'Top 25 keywords by search volume. Array of { keyword, position, searchVolume, url }.' },
    },
    {
      name: 'gapKeywords',
      type: 'json',
      admin: { description: 'Top 25 keywords this competitor ranks for that you do not. Array of { keyword, theirPosition, searchVolume, theirUrl }.' },
    },
  ],
}
