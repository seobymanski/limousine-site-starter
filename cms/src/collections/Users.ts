import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    group: 'Settings',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      label: 'Display Name',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Profile Picture',
    },
  ],
}
