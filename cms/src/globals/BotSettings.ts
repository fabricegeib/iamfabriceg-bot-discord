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
    { name: 'version', type: 'text', defaultValue: '1.1.0' },
    { name: 'publicUrl', type: 'text' },
    { name: 'discordInvite', type: 'text' },
    { name: 'twitchChannel', type: 'text' },
    {
      name: 'announcementChannelId',
      type: 'text',
      label: 'Salon d’annonce (interne)',
      // Identifiant technique : jamais exposé au public via l'API/front.
      access: {
        read: ({ req: { user } }) => user?.role === 'admin' || user?.role === 'editor',
      },
    },
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
      name: 'loyalty',
      type: 'group',
      label: 'Points & fidélité',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'pointsPerUsage', type: 'number', defaultValue: 1, min: 0 },
        { name: 'successBonus', type: 'number', defaultValue: 1, min: 0 },
        { name: 'streakBonus', type: 'number', defaultValue: 2, min: 0 },
        {
          name: 'levelThresholds',
          type: 'json',
          label: 'Paliers (JSON, ex. [0,10,30,60])',
          defaultValue: [0, 10, 30, 60, 100, 200],
        },
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
