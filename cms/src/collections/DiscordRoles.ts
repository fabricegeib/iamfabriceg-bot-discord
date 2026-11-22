import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publicRead } from '../access'

export const DiscordRoles: CollectionConfig = {
  slug: 'discordRoles',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['roleId', 'name', 'game', 'managed'],
  },
  timestamps: true,
  access: {
    read: publicRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'roleId', type: 'text', required: true, unique: true, index: true },
    { name: 'name', type: 'text', required: true },
    {
      name: 'game',
      type: 'relationship',
      relationTo: 'games',
    },
    { name: 'color', type: 'text' },
    { name: 'managed', type: 'checkbox', defaultValue: false },
    { name: 'description', type: 'textarea' },
  ],
}
