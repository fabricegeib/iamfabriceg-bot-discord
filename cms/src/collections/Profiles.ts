import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access'

export const Profiles: CollectionConfig = {
  slug: 'profiles',
  admin: {
    useAsTitle: 'username',
    defaultColumns: ['discordId', 'username', 'reputation', 'banned'],
  },
  timestamps: true,
  access: {
    read: isAdmin,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'discordId', type: 'text', required: true, unique: true, index: true },
    { name: 'username', type: 'text' },
    { name: 'discriminator', type: 'text' },
    { name: 'avatarUrl', type: 'text' },
    { name: 'guilds', type: 'json', defaultValue: [] },
    { name: 'roles', type: 'text', hasMany: true, defaultValue: [] },
    { name: 'reputation', type: 'number', defaultValue: 0 },
    { name: 'notes', type: 'textarea' },
    { name: 'lastSeenAt', type: 'date' },
    { name: 'banned', type: 'checkbox', defaultValue: false },
  ],
}
