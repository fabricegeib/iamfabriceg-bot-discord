import { lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor, publicRead } from '../access'
import { notifyBot } from '../hooks/notify-bot'

export const News: CollectionConfig = {
  slug: 'news',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', 'published'],
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
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'excerpt', type: 'textarea' },
    {
      name: 'content',
      type: 'richText',
      editor: lexicalEditor(),
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    { name: 'publishedAt', type: 'date', defaultValue: () => new Date().toISOString() },
    { name: 'published', type: 'checkbox', defaultValue: false },
    { name: 'tags', type: 'text', hasMany: true, defaultValue: [] },
  ],
}
