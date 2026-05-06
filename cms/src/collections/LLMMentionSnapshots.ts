import type { CollectionConfig } from 'payload'

/**
 * Weekly snapshot of LLM responses to each tracked prompt. One row per
 * prompt × platform × week. Captures whether the brand/domain appears,
 * which competitors got mentioned instead, and the relevant response
 * snippet for context.
 *
 * Written by /api/analytics/cron/llm-mentions-weekly. The full response is
 * archived for retrospective analysis (e.g. "show me how the answer
 * changed over time").
 */
export const LLMMentionSnapshots: CollectionConfig = {
  slug: 'llm-mention-snapshots',
  labels: {
    singular: 'LLM Mention Snapshot',
    plural: 'LLM Mention Snapshots',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'prompt',
    defaultColumns: ['snapshotDate', 'platform', 'prompt', 'mentioned'],
    group: 'Analytics',
    description: 'Auto-populated weekly. Read by /admin/analytics/overview. Manual edits not recommended.',
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
    {
      name: 'prompt',
      type: 'text',
      required: true,
      index: true,
      admin: { description: 'The prompt text at snapshot time (denormalized).' },
    },
    {
      name: 'platform',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Claude', value: 'claude' },
        { label: 'ChatGPT', value: 'chatgpt' },
        { label: 'Perplexity', value: 'perplexity' },
      ],
    },
    {
      name: 'mentioned',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'True if any sample mentioned the brand.' },
    },
    {
      name: 'samplesTotal',
      type: 'number',
      defaultValue: 1,
      admin: { description: 'Number of independent prompt runs against this platform for this row.' },
    },
    {
      name: 'samplesMentioned',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'How many of the samples cited the brand.' },
    },
    {
      name: 'domainCited',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'True if the response specifically cited your domain as a URL/source.' },
    },
    {
      name: 'competitorMentions',
      type: 'json',
      admin: { description: 'Array of { domain, mentioned: bool } for each tracked competitor.' },
    },
    {
      name: 'responseSnippet',
      type: 'textarea',
      admin: { description: 'Excerpt of the response near the relevant mention, or first 400 chars if no mention.' },
    },
    {
      name: 'responseFull',
      type: 'textarea',
      admin: { description: 'Full LLM response for retrospective analysis (prose only — citation URLs are stored in citedUrls).' },
    },
    {
      name: 'citedUrls',
      type: 'json',
      admin: { description: 'Array of source URLs the model cited (Perplexity returns these explicitly; Claude/ChatGPT typically empty).' },
    },
    {
      name: 'errorMessage',
      type: 'text',
      admin: { description: 'Set if the LLM call failed for this row.' },
    },
  ],
}
