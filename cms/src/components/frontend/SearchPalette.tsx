'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { searchItems, sourceLabels, type PaletteItem } from '@/utilities/searchItems'

/**
 * Palette de recherche (Ctrl/⌘+K ou « / »), calquée sur l'implémentation de
 * `loop` qui fonctionne sur iOS : portail vers `body`, fermeture au pointerdown
 * hors de la boîte, raccourcis en phase capture et focus en useEffect simple.
 */
export function SearchPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  // Pas de portail pendant le SSR : `document` n'existe pas côté serveur.
  const canUsePortal = typeof document !== 'undefined'

  const openPalette = useCallback(() => setOpen(true), [])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }, [])

  useEffect(() => {
    // Phase capture + preventDefault : certains navigateurs consomment le
    // raccourci avant que la page ne le reçoive.
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault()
        if (open) closePalette()
        else openPalette()
        return
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault()
        closePalette()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [closePalette, open, openPalette])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const results = useMemo(
    () => searchItems(items, query, { limit: query.trim() ? 12 : 8 }),
    [items, query],
  )

  const go = (url: string) => {
    closePalette()
    router.push(url)
  }

  return (
    <>
      <button
        aria-label="Rechercher (Ctrl+K)"
        className="search-trigger"
        onClick={openPalette}
        type="button"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
          <path
            d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <span>Rechercher…</span>
        <kbd>/</kbd>
      </button>

      {canUsePortal && open
        ? createPortal(
            <div
              className="palette-backdrop"
              onPointerDown={(event) => {
                // Le fond couvre tout le viewport : toute pression hors de la
                // boîte ferme la palette.
                if (!dialogRef.current?.contains(event.target as Node)) closePalette()
              }}
              role="presentation"
            >
              <div
                aria-label="Recherche dans le site"
                aria-modal="true"
                className="palette"
                ref={dialogRef}
                role="dialog"
              >
                <div className="palette-input">
                  <input
                    aria-activedescendant={
                      results.length > 0 ? `palette-result-${active}` : undefined
                    }
                    aria-autocomplete="list"
                    aria-controls="palette-results"
                    aria-expanded="true"
                    aria-label="Votre recherche"
                    autoComplete="off"
                    id="command-palette-input"
                    name="command-palette"
                    onChange={(event) => {
                      setQuery(event.target.value)
                      setActive(0)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setActive((value) => (results.length ? (value + 1) % results.length : 0))
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setActive((value) =>
                          results.length ? (value - 1 + results.length) % results.length : 0,
                        )
                      } else if (event.key === 'Home') {
                        event.preventDefault()
                        setActive(0)
                      } else if (event.key === 'End') {
                        event.preventDefault()
                        setActive(Math.max(results.length - 1, 0))
                      } else if (event.key === 'Enter' && results[active]) {
                        event.preventDefault()
                        go(results[active]!.url)
                      }
                    }}
                    placeholder="Rechercher une commande, un jeu, une page…"
                    ref={inputRef}
                    role="combobox"
                    type="text"
                    value={query}
                  />
                  <kbd>Échap</kbd>
                </div>
                <ul className="palette-results" id="palette-results" role="listbox">
                  {results.length ? (
                    results.map((item, index) => (
                      <li key={`${item.source}-${item.label}-${index}`}>
                        <button
                          aria-selected={index === active}
                          className={index === active ? 'palette-result active' : 'palette-result'}
                          id={`palette-result-${index}`}
                          onClick={() => go(item.url)}
                          onPointerEnter={() => setActive(index)}
                          role="option"
                          type="button"
                        >
                          <span className="palette-kind">{sourceLabels[item.source]}</span>
                          <span className="palette-text">
                            <strong>{item.label}</strong>
                            {item.description ? <small>{item.description}</small> : null}
                          </span>
                          <span className="palette-group">{item.group}</span>
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="palette-empty">Aucun résultat pour « {query} ».</li>
                  )}
                </ul>
                <div className="palette-footer">
                  <span>
                    <kbd>↑</kbd> <kbd>↓</kbd> naviguer · <kbd>↵</kbd> ouvrir
                  </span>
                  <a href={`/search?q=${encodeURIComponent(query)}`} onClick={closePalette}>
                    Tous les résultats →
                  </a>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
