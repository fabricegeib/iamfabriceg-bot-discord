import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access'

export const CommandUsages: CollectionConfig = {
  slug: 'commandUsages',
  admin: {
    useAsTitle: 'command',
    defaultColumns: ['command', 'userId', 'usedAt', 'success'],
  },
  timestamps: true,
  access: {
    read: isAdmin,
    create: isAdminOrEditor,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'command',
      type: 'relationship',
      relationTo: 'commands',
      required: true,
    },
    { name: 'userId', type: 'text', required: true, index: true },
    { name: 'guildId', type: 'text', index: true },
    { name: 'channelId', type: 'text' },
    { name: 'usedAt', type: 'date', defaultValue: () => new Date().toISOString(), index: true },
    { name: 'success', type: 'checkbox', defaultValue: true },
    {
      name: 'source',
      type: 'select',
      defaultValue: 'chatInput',
      options: [
        { label: 'Chat input', value: 'chatInput' },
        { label: 'Button', value: 'button' },
        { label: 'Select menu', value: 'selectMenu' },
        { label: 'Autocomplete', value: 'autocomplete' },
      ],
    },
  ],
  indexes: [{ fields: ['userId', 'usedAt'] }],
}
