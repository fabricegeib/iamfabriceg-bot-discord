'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { searchItems, sourceLabels, type PaletteItem } from '@/utilities/searchItems'
import { useDebounce } from '@/utilities/useDebounce'

/** Palette de recherche façon `loop` : Ctrl/⌘+K ou « / », puis navigation clavier. */
export function SearchPalette({ items }: { items: PaletteItem[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const openedAtRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const debounced = useDebounce(query)

  const results = useMemo(() => searchItems(items, debounced, { limit: 8 }), [items, debounced])

  const closePalette = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActive(0)
  }, [])

  const openPalette = useCallback(() => {
    openedAtRef.current = Date.now()
    setOpen(true)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable

      if (((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !typing)) {
        event.preventDefault()
        openPalette()
        return
      }
      if (event.key === 'Escape') closePalette()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closePalette, openPalette])

  // showModal() promotes the dialog to the browser's top layer: no z-index or
  // stacking context on iOS can hide it. Focus runs in the same tap gesture so
  // the virtual keyboard opens on WebKit.
  useLayoutEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    inputRef.current?.focus({ preventScroll: true })
  }, [open])

  // iOS keeps fixed elements on the layout viewport when the keyboard shrinks
  // the visual viewport: size the dialog to the visible area instead.
  useEffect(() => {
    if (!open) return
    const viewport = window.visualViewport
    if (!viewport) return

    const sync = () => {
      const dialog = dialogRef.current
      if (!dialog) return
      dialog.style.setProperty('--vv-top', `${viewport.offsetTop}px`)
      dialog.style.setProperty('--vv-height', `${viewport.height}px`)
    }

    sync()
    viewport.addEventListener('resize', sync)
    viewport.addEventListener('scroll', sync)
    return () => {
      viewport.removeEventListener('resize', sync)
      viewport.removeEventListener('scroll', sync)
    }
  }, [open])

  const go = (item: PaletteItem) => {
    closePalette()
    router.push(item.url)
  }

  return (
    <>
      <button
        className="search-trigger"
        type="button"
        onClick={openPalette}
        onTouchStart={openPalette}
        aria-label="Rechercher"
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

      {open
        ? createPortal(
            <dialog
              ref={dialogRef}
              className="palette"
              aria-label="Recherche dans le site"
              onCancel={(event) => {
                event.preventDefault()
                closePalette()
              }}
              onClick={(event) => {
                // Ignore the synthetic click that follows the tap which opened the modal.
                if (event.target === dialogRef.current && Date.now() - openedAtRef.current > 350) {
                  closePalette()
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setActive((value) => Math.min(value + 1, results.length - 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setActive((value) => Math.max(value - 1, 0))
                } else if (event.key === 'Enter' && results[active]) {
                  event.preventDefault()
                  go(results[active]!)
                }
              }}
            >
              <div className="palette-input">
                <input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setActive(0)
                  }}
                  placeholder="Rechercher une commande, un jeu, une page…"
                  aria-label="Votre recherche"
                />
                <kbd>Échap</kbd>
              </div>
              <ul className="palette-results">
                {results.length ? (
                  results.map((item, index) => (
                    <li key={`${item.source}-${item.label}-${index}`}>
                      <button
                        type="button"
                        className={index === active ? 'palette-result active' : 'palette-result'}
                        onMouseEnter={() => setActive(index)}
                        onClick={() => go(item)}
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
                  <li className="palette-empty">Aucun résultat pour « {debounced} ».</li>
                )}
              </ul>
              <div className="palette-footer">
                <span>
                  <kbd>↑</kbd> <kbd>↓</kbd> naviguer · <kbd>↵</kbd> ouvrir
                </span>
                <a href={`/search?q=${encodeURIComponent(debounced)}`} onClick={closePalette}>
                  Tous les résultats →
                </a>
              </div>
            </dialog>,
            document.body,
          )
        : null}
    </>
  )
}
