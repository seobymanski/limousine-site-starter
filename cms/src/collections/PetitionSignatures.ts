import type { CollectionConfig } from 'payload'

/**
 * Signatures collected from the public demolition-alert petition pages.
 * Public create (the signup form) — admin-only read/update/delete.
 */
export const PetitionSignatures: CollectionConfig = {
  slug: 'petition-signatures',
  labels: {
    singular: 'Petition Signature',
    plural: 'Petition Signatures',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'firstName', 'lastName', 'postSlug', 'createdAt'],
    group: 'Community',
  },
  fields: [
    {
      name: 'postSlug',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'Slug of the demolition alert post this signature applies to.',
      },
    },
    {
      name: 'firstName',
      type: 'text',
      required: true,
    },
    {
      name: 'lastName',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      index: true,
    },
    {
      name: 'city',
      type: 'text',
    },
    {
      name: 'comment',
      type: 'textarea',
      admin: {
        description: 'Optional public comment (only shown if displayPublic is true).',
      },
    },
    {
      name: 'displayPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'If checked, the signer name (first name + last initial) and comment may appear on the public page.',
      },
    },
  ],
}
