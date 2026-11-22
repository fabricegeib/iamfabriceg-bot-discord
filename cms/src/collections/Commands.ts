import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publicRead } from '../access'
import { notifyBot } from '../hooks/notify-bot'

export const Commands: CollectionConfig = {
  slug: 'commands',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'name',
    defaultColumns: ['name', 'category', 'usageCount', 'successCount', 'lastUsedAt', 'enabled'],
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
    { name: 'name', type: 'text', required: true, unique: true, index: true },
    { name: 'description', type: 'textarea' },
    { name: 'descriptionEn', type: 'textarea', label: 'Description (anglais)' },
    { name: 'category', type: 'text' },
    { name: 'aliases', type: 'text', hasMany: true, defaultValue: [] },
    { name: 'usage', type: 'text' },
    {
      name: 'examples',
      type: 'array',
      fields: [{ name: 'example', type: 'text', required: true }],
    },
    { name: 'cooldown', type: 'number', defaultValue: 0, min: 0 },
    { name: 'permissions', type: 'text', hasMany: true, defaultValue: [] },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
    {
      name: 'game',
      type: 'relationship',
      relationTo: 'games',
    },
    { name: 'adminOnly', type: 'checkbox', defaultValue: false },
    { name: 'options', type: 'json', label: 'Options Discord (JSON)' },
    // --- Compteurs alimentés par /api/bot/usage ----------------------------
    { name: 'usageCount', type: 'number', defaultValue: 0, min: 0 },
    { name: 'successCount', type: 'number', defaultValue: 0, min: 0 },
    { name: 'failureCount', type: 'number', defaultValue: 0, min: 0 },
    { name: 'pointsAwarded', type: 'number', defaultValue: 0, min: 0 },
    { name: 'lastUsedAt', type: 'date' },
  ],
}
