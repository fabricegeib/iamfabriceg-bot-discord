import type { GlobalConfig } from 'payload'

import { isAdminOrEditor, publicRead } from '../access'

export const BotSettings: GlobalConfig = {
  slug: 'botSettings',
  label: 'Réglages du bot',
  access: {
    read: publicRead,
    update: isAdminOrEditor,
  },
  fields: [
    { name: 'botName', type: 'text', required: true, defaultValue: 'iamfabriceg Bot' },
    { name: 'description', type: 'textarea' },
    { name: 'version', type: 'text', defaultValue: '1.0.0' },
    { name: 'publicUrl', type: 'text' },
    { name: 'discordInvite', type: 'text' },
    { name: 'twitchChannel', type: 'text' },
    { name: 'announcementChannelId', type: 'text' },
    { name: 'maintenanceMode', type: 'checkbox', defaultValue: false },
    {
      name: 'features',
      type: 'group',
      label: 'Fonctionnalités actives',
      fields: [
        { name: 'games', type: 'checkbox', defaultValue: true },
        { name: 'pokemon', type: 'checkbox', defaultValue: true },
        { name: 'fortnite', type: 'checkbox', defaultValue: true },
        { name: 'riot', type: 'checkbox', defaultValue: true },
        { name: 'steam', type: 'checkbox', defaultValue: true },
        { name: 'deals', type: 'checkbox', defaultValue: true },
        { name: 'twitch', type: 'checkbox', defaultValue: true },
        { name: 'moderation', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      name: 'socialLinks',
      type: 'array',
      label: 'Liens sociaux',
      defaultValue: [],
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    // `updatedAt` est ajouté automatiquement par Payload pour les globals.
  ],
}
