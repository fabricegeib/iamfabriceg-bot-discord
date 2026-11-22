import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access'

export const StreamAlerts: CollectionConfig = {
  slug: 'streamAlerts',
  admin: {
    useAsTitle: 'twitchLogin',
    defaultColumns: ['twitchLogin', 'enabled', 'lastStatus', 'lastCheckedAt'],
  },
  timestamps: true,
  access: {
    // Alertes Twitch internes : admin/éditeur uniquement.
    read: isAdminOrEditor,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'twitchLogin', type: 'text', required: true, index: true },
    { name: 'twitchUserId', type: 'text' },
    { name: 'discordChannelId', type: 'text' },
    { name: 'message', type: 'textarea' },
    { name: 'enabled', type: 'checkbox', defaultValue: true },
    {
      name: 'lastStatus',
      type: 'select',
      defaultValue: 'unknown',
      options: [
        { label: 'Live', value: 'live' },
        { label: 'Offline', value: 'offline' },
        { label: 'Unknown', value: 'unknown' },
      ],
    },
    { name: 'lastCheckedAt', type: 'date' },
  ],
}
