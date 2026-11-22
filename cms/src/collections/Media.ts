import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publicRead } from '../access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'alt',
  },
  timestamps: true,
  access: {
    read: publicRead,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  // Payload gère le stockage local (pas de storage adapter externe).
  upload: true,
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'url', type: 'text', admin: { readOnly: true } },
    { name: 'size', type: 'number', admin: { readOnly: true } },
  ],
}
