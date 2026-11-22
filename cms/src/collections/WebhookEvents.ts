import type { CollectionConfig } from 'payload'

import { isAdmin } from '../access'

export const WebhookEvents: CollectionConfig = {
  slug: 'webhookEvents',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'event',
    defaultColumns: ['source', 'event', 'collectionSlug', 'processed', 'receivedAt'],
  },
  timestamps: true,
  access: {
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'source',
      type: 'select',
      required: true,
      defaultValue: 'payload',
      options: [
        { label: 'Payload', value: 'payload' },
        { label: 'Twitch', value: 'twitch' },
      ],
    },
    { name: 'event', type: 'text', required: true },
    { name: 'action', type: 'text' },
    // `collection` est un nom réservé dans les schémas Mongoose.
    { name: 'collectionSlug', type: 'text' },
    { name: 'documentId', type: 'text' },
    { name: 'payload', type: 'json' },
    { name: 'processed', type: 'checkbox', defaultValue: false },
    { name: 'receivedAt', type: 'date', defaultValue: () => new Date().toISOString(), index: true },
    { name: 'signatureValid', type: 'checkbox', defaultValue: false },
  ],
}
