import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access'

export const Profiles: CollectionConfig = {
  slug: 'profiles',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'username',
    defaultColumns: ['discordId', 'username', 'points', 'level', 'totalUsages', 'banned'],
  },
  timestamps: true,
  access: {
    read: isAdmin,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdmin,
  },
  fields: [
    { name: 'discordId', type: 'text', required: true, unique: true, index: true },
    { name: 'username', type: 'text' },
    { name: 'discriminator', type: 'text' },
    { name: 'avatarUrl', type: 'text' },
    { name: 'guilds', type: 'json', defaultValue: [] },
    { name: 'roles', type: 'text', hasMany: true, defaultValue: [] },
    { name: 'reputation', type: 'number', defaultValue: 0 },
    { name: 'notes', type: 'textarea' },
    { name: 'lastSeenAt', type: 'date' },
    { name: 'banned', type: 'checkbox', defaultValue: false },
    // --- Fidélité / statistiques -------------------------------------------
    { name: 'points', type: 'number', defaultValue: 0, min: 0, index: true },
    { name: 'xp', type: 'number', defaultValue: 0, min: 0 },
    { name: 'level', type: 'number', defaultValue: 1, min: 1, index: true },
    { name: 'totalUsages', type: 'number', defaultValue: 0, min: 0 },
    { name: 'successUsages', type: 'number', defaultValue: 0, min: 0 },
    { name: 'errorUsages', type: 'number', defaultValue: 0, min: 0 },
    { name: 'dailyUsages', type: 'number', defaultValue: 0, min: 0 },
    { name: 'weeklyUsages', type: 'number', defaultValue: 0, min: 0 },
    { name: 'streak', type: 'number', defaultValue: 0, min: 0 },
    { name: 'bestStreak', type: 'number', defaultValue: 0, min: 0 },
    { name: 'lastUsageAt', type: 'date' },
    { name: 'lastUsageDate', type: 'text' },
    { name: 'favoriteCommand', type: 'text' },
    { name: 'commandCounts', type: 'json', defaultValue: {} },
    { name: 'badges', type: 'text', hasMany: true, defaultValue: [] },
  ],
}
