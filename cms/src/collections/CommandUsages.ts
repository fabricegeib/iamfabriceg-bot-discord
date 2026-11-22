import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminOrEditor } from '../access'

export const CommandUsages: CollectionConfig = {
  slug: 'commandUsages',
  admin: {
    components: { Description: '@/components/admin/CollectionDescription' },
    useAsTitle: 'commandName',
    defaultColumns: ['commandName', 'userId', 'outcome', 'pointsAwarded', 'usedAt'],
  },
  timestamps: true,
  access: {
    read: isAdmin,
    create: isAdminOrEditor,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    // `commandName` reste renseigné même pour une commande supprimée du catalogue.
    { name: 'commandName', type: 'text', required: true, index: true },
    {
      name: 'command',
      type: 'relationship',
      relationTo: 'commands',
    },
    { name: 'subcommand', type: 'text' },
    { name: 'userId', type: 'text', required: true, index: true },
    { name: 'guildId', type: 'text', index: true },
    { name: 'channelId', type: 'text' },
    { name: 'usedAt', type: 'date', defaultValue: () => new Date().toISOString(), index: true },
    {
      name: 'outcome',
      type: 'select',
      defaultValue: 'success',
      options: [
        { label: 'Succès', value: 'success' },
        { label: 'Erreur', value: 'error' },
        { label: 'Cooldown', value: 'cooldown' },
        { label: 'Refusé', value: 'denied' },
      ],
    },
    // Ancien champ conservé pour compatibilité des données existantes.
    { name: 'success', type: 'checkbox', defaultValue: true },
    { name: 'errorType', type: 'text' },
    { name: 'durationMs', type: 'number', min: 0 },
    { name: 'pointsAwarded', type: 'number', defaultValue: 0, min: 0 },
    { name: 'options', type: 'json', defaultValue: {} },
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
  indexes: [
    { fields: ['userId', 'usedAt'] },
    { fields: ['commandName', 'usedAt'] },
    { fields: ['usedAt'] },
  ],
}
