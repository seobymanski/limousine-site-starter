import type { CollectionConfig } from 'payload'

/**
 * Submissions from the public /contact form. Mirrors the email Resend sends
 * to info@midtexmod.org, so admins can browse, filter, and mark as handled
 * without digging through inbox history.
 *
 * Public create (the contact form) — admin-only read/update/delete.
 */
export const ContactSubmissions: CollectionConfig = {
  slug: 'contact-submissions',
  labels: {
    singular: 'Contact Submission',
    plural: 'Contact Submissions',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'name', 'subject', 'handled', 'createdAt'],
    group: 'Community',
    description: 'Messages sent through the public contact form.',
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
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'phone', type: 'text' },
    {
      name: 'subject',
      type: 'text',
      defaultValue: 'General Inquiry',
    },
    { name: 'message', type: 'textarea', required: true },
    {
      name: 'handled',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mark when you\'ve replied to or otherwise actioned this message.',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      admin: {
        description: 'Private notes for the team — not sent to the contact.',
      },
    },
  ],
}
