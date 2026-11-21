import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publicRead } from '../access'
import { notifyBot } from '../hooks/notify-bot'

export const Games: CollectionConfig = {
  slug: 'games',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['key', 'title', 'category', 'published', 'featured'],
  },
  timestamps: true,
  access: {
    read: publicRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  hooks: {
    afterChange: [notifyBot],
  },
  fields: [
    { name: 'key', type: 'text', required: true, unique: true, index: true },
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'description', type: 'textarea' },
    { name: 'category', type: 'text' },
    { name: 'emoji', type: 'text' },
    { name: 'discordRoleId', type: 'text' },
    { name: 'cover', type: 'text', label: 'URL de la couverture' },
    { name: 'search', type: 'text', label: 'Termes de recherche' },
    {
      name: 'links',
      type: 'group',
      label: 'Liens utiles',
      fields: [
        { name: 'fortnite', type: 'text' },
        { name: 'riot', type: 'text' },
        { name: 'steam', type: 'text' },
        { name: 'twitch', type: 'text' },
        { name: 'other', type: 'text' },
      ],
    },
    { name: 'published', type: 'checkbox', defaultValue: true },
    { name: 'featured', type: 'checkbox', defaultValue: false },
    { name: 'order', type: 'number', defaultValue: 0 },
  ],
}
