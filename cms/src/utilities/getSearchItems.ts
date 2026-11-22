import { getPayload } from 'payload'
import config from 'payload-config'

import { apiDocs } from './apiDocs'
import type { PaletteItem } from './searchItems'

type Doc = Record<string, any>

const INDEX_TTL_MS = 2 * 60 * 1000
let cache: { at: number; items: PaletteItem[] } | null = null

const STATIC_ITEMS: PaletteItem[] = [
  { label: 'Jeux', group: 'Navigation', source: 'page', url: '/#games', keywords: ['games', 'catalogue'] },
  { label: 'Commandes', group: 'Navigation', source: 'page', url: '/#commands', keywords: ['slash', 'help'] },
  { label: 'Actualités', group: 'Navigation', source: 'page', url: '/#news', keywords: ['news'] },
  { label: 'API Payload', group: 'Navigation', source: 'page', url: '/#api', keywords: ['rest', 'documentation'] },
  { label: 'Administration', group: 'Navigation', source: 'page', url: '/admin', keywords: ['cms', 'dashboard'] },
  ...apiDocs.map((doc) => ({
    label: doc.label,
    description: doc.description.replace(/`/g, ''),
    group: doc.group,
    source: 'api' as const,
    url: `/#api`,
    keywords: [doc.method, doc.path, doc.public ? 'public' : 'authentifié'],
  })),
]

/** Index de recherche construit côté serveur à partir des collections Payload. */
export async function getSearchItems(): Promise<PaletteItem[]> {
  if (cache && Date.now() - cache.at < INDEX_TTL_MS) return cache.items

  const payload = await getPayload({ config })
  const [games, commands, news] = await Promise.all([
    payload.find({ collection: 'games', depth: 0, limit: 200, sort: 'order', where: { published: { equals: true } } }),
    payload.find({ collection: 'commands', depth: 0, limit: 300, sort: 'name', where: { enabled: { equals: true } } }),
    payload.find({ collection: 'news', depth: 0, limit: 30, sort: '-publishedAt', where: { published: { equals: true } } }),
  ])

  const items: PaletteItem[] = [
    ...STATIC_ITEMS,
    ...(games.docs as Doc[]).map((game) => ({
      label: String(game.title || game.key || 'Jeu'),
      description: typeof game.description === 'string' ? game.description : undefined,
      group: String(game.category || 'Jeux'),
      source: 'game' as const,
      url: '/#games',
      keywords: [String(game.key || ''), String(game.emoji || ''), 'jeu', 'game'],
    })),
    ...(commands.docs as Doc[]).map((command) => ({
      label: `/${String(command.name || '').replace(/^\//, '')}`,
      description: String(command.descriptionEn || command.description || ''),
      group: String(command.category || 'Commandes'),
      source: 'command' as const,
      url: '/#commands',
      keywords: [
        String(command.description || ''),
        String(command.usage || ''),
        ...(Array.isArray(command.aliases) ? command.aliases.map(String) : []),
        ...(Array.isArray(command.examples)
          ? command.examples.map((entry: unknown) =>
              typeof entry === 'string' ? entry : String((entry as Doc)?.example || ''),
            )
          : []),
      ],
    })),
    ...(news.docs as Doc[]).map((item) => ({
      label: String(item.title || 'Actualité'),
      description: typeof item.excerpt === 'string' ? item.excerpt : undefined,
      group: 'Actualités',
      source: 'news' as const,
      url: '/#news',
      keywords: ['news', 'article'],
    })),
  ]

  cache = { at: Date.now(), items }
  return items
}
