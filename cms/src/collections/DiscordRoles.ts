import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access'

export const DiscordRoles: CollectionConfig = {
  slug: 'discordRoles',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'name',
    defaultColumns: ['roleId', 'name', 'game', 'managed'],
  },
  timestamps: true,
  access: {
    // Configuration interne des rôles Discord : admin/éditeur uniquement.
    read: isAdminOrEditor,
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
