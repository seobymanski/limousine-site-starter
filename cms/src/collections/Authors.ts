import type { CollectionConfig } from 'payload'

/**
 * Authors collection — content contributors. Each author has a public profile
 * page at /author/<slug> that lists their bio, social links, and posts.
 *
 * Per-client: rename labels (e.g. "Author" → "Member", "Contributor", "Staff")
 * and the URL pattern in AuthorPublishButton + your Astro page route to match
 * the client's site information architecture.
 */
export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: {
    singular: 'Author',
    plural: 'Authors',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role', 'company'],
    group: 'Content',
    description: 'Contributors and authors. Each gets a public profile page at /author/<slug>.',
  },
  access: {
    read: () => true,
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
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        position: 'sidebar',
        description: 'URL slug, e.g. "jane-doe". Used at /author/<slug>.',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        position: 'sidebar',
        isSortable: false,
        components: {
          Field: '@/components/AuthorPublishButton#default',
        },
      },
    },
    {
      name: 'role',
      type: 'text',
      admin: {
        description: 'e.g. "Editor", "Staff Writer", "Volunteer Contributor"',
      },
    },
    {
      name: 'company',
      type: 'text',
      admin: { description: 'Optional affiliation, e.g. company or firm.' },
    },
    {
      name: 'tagline',
      type: 'text',
      admin: {
        description:
          'Short label shown above the name (e.g. "STAFF WRITER", "CONTRIBUTOR", "GUEST AUTHOR").',
      },
    },
    {
      name: 'photo',
      label: 'Profile Picture',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Headshot used on the author profile page (square crop works best).' },
    },
    {
      name: 'about',
      label: 'Bio',
      type: 'richText',
      admin: { description: 'Author biography. Shown in the "About" section of the profile page.' },
    },
    {
      name: 'advocacy',
      label: 'Advocacy & Causes',
      type: 'richText',
      admin: {
        description:
          'What this author is most passionate about. Optional — useful for nonprofits or cause-driven sites.',
      },
    },
    {
      name: 'expertise',
      type: 'array',
      labels: { singular: 'Expertise Tag', plural: 'Expertise' },
      admin: {
        description:
          'Tags shown on the profile (e.g. "Editorial", "Research", "Photography").',
      },
      fields: [{ name: 'tag', type: 'text', required: true }],
    },
    {
      name: 'social',
      type: 'group',
      label: 'Social Medias',
      fields: [
        {
          name: 'email',
          type: 'text',
          admin: { description: 'Used for the "Email Author" button on the profile page.' },
        },
        {
          name: 'twitter',
          type: 'text',
          admin: { description: 'Twitter/X handle without the @.' },
        },
        {
          name: 'instagram',
          type: 'text',
          admin: { description: 'Instagram handle without the @.' },
        },
        {
          name: 'linkedin',
          type: 'text',
          admin: { description: 'Full LinkedIn profile URL.' },
        },
        {
          name: 'website',
          type: 'text',
          admin: { description: 'Personal or company website URL.' },
        },
      ],
    },
  ],
}
