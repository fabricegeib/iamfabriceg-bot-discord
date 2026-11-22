'use client'

import { useEffect, useState } from 'react'

type Filter = 'all' | 'games' | 'commands' | 'news' | 'api'

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Tout' },
  { value: 'games', label: 'Jeux' },
  { value: 'commands', label: 'Commandes' },
  { value: 'news', label: 'Actualités' },
  { value: 'api', label: 'API' },
]

/** Filtres des sections : chaque bouton affiche/masque les blocs `data-kind` correspondants. */
export function SiteToolbar() {
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    for (const section of document.querySelectorAll<HTMLElement>('[data-kind]')) {
      section.hidden = filter !== 'all' && section.dataset.kind !== filter
    }
  }, [filter])

  return (
    <div className="toolbar">
      <div className="filter-chips" role="group" aria-label="Filtrer le contenu">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={filter === option.value ? 'filter-chip active' : 'filter-chip'}
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
