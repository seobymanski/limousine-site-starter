import type { CollectionConfig } from 'payload'

/**
 * Public subscribers to the Mid Tex Mod newsletter. Captured from the
 * NewsletterSignup form on the public site, then automatically emailed each
 * new newsletter when one is published in BlogPosts.
 *
 * Public create (the signup form) — admin-only read/update/delete.
 *
 * V1 is single opt-in: subscribers are `confirmed: true` immediately so the
 * next published newsletter goes to them. The `confirmed` field is kept so
 * we can layer double opt-in later without a second migration.
 */
export const NewsletterSubscribers: CollectionConfig = {
  slug: 'newsletter-subscribers',
  labels: {
    singular: 'Newsletter Subscriber',
    plural: 'Newsletter Subscribers',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'unsubscribed', 'source', 'createdAt'],
    group: 'Community',
    description:
      'Emails captured from the public newsletter signup form. Each new newsletter published in Website Content (category Newsletter) is automatically emailed to everyone here who has not unsubscribed.',
  },
  fields: [
    {
      name: 'autoSave',
      type: 'ui',
      admin: {
        components: {
          Field: '@/components/AutoSaveField#default',
        },
      },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
    },
    {
      name: 'source',
      type: 'text',
      admin: {
        description:
          'Where on the site this person signed up (e.g. "footer", "homepage-hero"). Optional, set by the form.',
      },
    },
    {
      name: 'confirmed',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description:
          'True once the subscriber has verified their email. V1 ships single opt-in (defaults to true on create) — flip to false to require confirmation in future.',
      },
    },
    {
      name: 'unsubscribed',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description:
          'True if the subscriber clicked the unsubscribe link in any newsletter. Broadcast logic skips anyone where this is true.',
      },
    },
    {
      name: 'unsubscribedAt',
      type: 'date',
      admin: {
        description: 'Timestamp the subscriber unsubscribed.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'unsubscribeToken',
      type: 'text',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        description:
          'One-click unsubscribe token used in newsletter footers. Auto-generated on create — do not edit.',
      },
    },
  ],
}
