export type PaletteSource = 'page' | 'game' | 'command' | 'news' | 'api'

export type PaletteItem = {
  label: string
  description?: string
  group: string
  source: PaletteSource
  url: string
  /** Termes supplémentaires (alias, noms EN…) pris en compte par la recherche. */
  keywords?: string[]
}

export const searchSources: PaletteSource[] = ['page', 'game', 'command', 'news', 'api']

export const sourceLabels: Record<PaletteSource, string> = {
  page: 'Page',
  game: 'Jeu',
  command: 'Commande',
  news: 'Actualité',
  api: 'API',
}

/** Retire les diacritiques : « ancre » trouve « Ancré ». Identique côté serveur et client. */
export const normalizeSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export type SearchOptions = {
  limit?: number
  source?: PaletteSource
}

/**
 * Classement déterministe partagé entre la palette de recherche et /search.
 * Chaque mot de la requête doit apparaître dans au moins un champ. Une
 * correspondance en début de libellé est mieux notée qu'un mot-clé, lui-même
 * mieux noté qu'une description. L'ordre d'insertion sert de départage.
 */
export const searchItems = (
  items: PaletteItem[],
  query: string,
  { limit = 20, source }: SearchOptions = {},
): PaletteItem[] => {
  const pool = source ? items.filter((item) => item.source === source) : items
  const tokens = normalizeSearch(query.trim()).split(/\s+/).filter(Boolean)

  if (!tokens.length) return pool.slice(0, limit)

  return pool
    .map((item, index) => {
      const label = normalizeSearch(item.label)
      const keywords = normalizeSearch((item.keywords ?? []).join(' '))
      const description = normalizeSearch(item.description ?? '')
      const group = normalizeSearch(item.group)

      let score = 0
      for (const token of tokens) {
        if (label.startsWith(token)) score += 6
        else if (label.includes(token)) score += 4
        else if (keywords.includes(token)) score += 3
        else if (group.includes(token)) score += 2
        else if (description.includes(token)) score += 1
        else return { item, index, score: -1 }
      }
      return { item, index, score }
    })
    .filter((result) => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ item }) => item)
}
