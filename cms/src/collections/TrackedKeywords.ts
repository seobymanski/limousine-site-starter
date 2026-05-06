import type { CollectionConfig } from 'payload'
import { DEFAULT_LOCATION } from '@/lib/analytics-config'

/**
 * Editor-managed list of keywords to monitor across Google Search Console
 * and DataForSEO ranking checks. Adding a keyword here makes it appear in the
 * Search Console drilldown and starts being tracked weekly for ranking
 * position on the next DataForSEO cron run.
 */
export const TrackedKeywords: CollectionConfig = {
  slug: 'tracked-keywords',
  labels: {
    singular: 'Tracked Keyword',
    plural: 'Tracked Keywords',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'keyword',
    defaultColumns: ['keyword', 'location', 'active'],
    group: 'Analytics',
    description: 'Keywords you want to monitor in Search Console and weekly keyword rankings. Add one per row. Inactive keywords stay in history but are skipped on next cron run.',
  },
  fields: [
    {
      name: 'keyword',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'location',
      type: 'text',
      defaultValue: DEFAULT_LOCATION,
      admin: {
        description: 'City + region for geo-targeted ranking checks (DataForSEO uses this). Format: "City, State, Country" for local; "Country" for national.',
      },
    },
    {
      name: 'searchEngine',
      type: 'select',
      defaultValue: 'google',
      options: [
        { label: 'Google', value: 'google' },
      ],
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
      admin: { description: 'Optional context for why this keyword matters.' },
    },
  ],
}
