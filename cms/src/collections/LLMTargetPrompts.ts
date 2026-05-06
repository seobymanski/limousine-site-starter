import type { CollectionConfig } from 'payload'

/**
 * Editor-managed list of prompts to test against LLMs (Claude, ChatGPT,
 * Perplexity). Each prompt is something a real user might ask where your
 * brand *should* be mentioned in the answer. The weekly cron runs every
 * active prompt against each platform and records whether the brand/domain
 * appears.
 */
export const LLMTargetPrompts: CollectionConfig = {
  slug: 'llm-target-prompts',
  labels: {
    singular: 'LLM Target Prompt',
    plural: 'LLM Target Prompts',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'prompt',
    defaultColumns: ['prompt', 'active'],
    group: 'Analytics',
    description: 'Questions a real user might type into ChatGPT/Claude/Perplexity that should mention your brand. Tested weekly.',
  },
  fields: [
    {
      name: 'prompt',
      type: 'textarea',
      required: true,
      index: true,
      admin: { description: 'The full question or prompt to send to each LLM.' },
    },
    {
      name: 'description',
      type: 'text',
      admin: { description: 'Optional context for why this prompt matters.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Uncheck to stop testing without losing history.' },
    },
  ],
}
