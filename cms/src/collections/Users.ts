import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrSelf } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'displayName', 'createdAt'],
  },
  auth: {
    // Nécessaire pour générer une clé API pour le bot (champ `apiKey` sur le user).
    useAPIKey: true,
  },
  timestamps: true,
  access: {
    read: isAdminOrSelf,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Bot', value: 'bot' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'displayName',
      type: 'text',
      label: 'Nom affiché',
    },
  ],
}
