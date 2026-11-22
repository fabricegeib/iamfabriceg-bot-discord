import type { Metadata } from 'next'
import Link from 'next/link'

import { searchItems, searchSources, sourceLabels, type PaletteSource } from '@/utilities/searchItems'
import { getSearchItems } from '@/utilities/getSearchItems'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Recherche — iamfabriceg Bot',
  description: 'Rechercher une commande, un jeu ou une page du site iamfabriceg Bot.',
}

type Params = { q?: string; type?: string }

const isSource = (value: string | undefined): value is PaletteSource =>
  Boolean(value && (searchSources as string[]).includes(value))

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams
  const query = typeof params.q === 'string' ? params.q.slice(0, 120) : ''
  const source = isSource(params.type) ? params.type : undefined
  const items = await getSearchItems()
  const results = searchItems(items, query, { limit: 80, source })
  const bySource = new Map<PaletteSource, typeof results>()

  for (const item of results) {
    const bucket = bySource.get(item.source) || []
    bucket.push(item)
    bySource.set(item.source, bucket)
  }

  const filterHref = (value?: PaletteSource) => {
    const search = new URLSearchParams()
    if (query) search.set('q', query)
    if (value) search.set('type', value)
    const suffix = search.toString()
    return suffix ? `/search?${suffix}` : '/search'
  }

  return (
    <main className="site search-site">
      <a className="skip-link" href="#results">Aller aux résultats</a>
      <header className="navbar">
        <div className="navbar-brand-row">
          <Link className="navbar-brand" href="/">iamfabriceg<span className="brand-accent">.xyz</span> <span className="brand-sub">/ bot</span></Link>
        </div>
        <nav aria-label="Navigation principale">
          <ul className="navbar-nav">
            <li><Link className="nav-link" href="/">Accueil</Link></li>
            <li><Link className="nav-link" href="/#games">Jeux</Link></li>
            <li><Link className="nav-link" href="/#commands">Commandes</Link></li>
            <li><Link className="nav-link" href="/#api">API</Link></li>
          </ul>
        </nav>
      </header>

      <div className="container">
        <section className="jumbotron search-hero" aria-labelledby="search-title">
          <p className="eyebrow">Recherche</p>
          <h1 id="search-title">Trouver une commande, un jeu, une page</h1>
          <form className="search-form large" action="/search" method="get">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Ex. : /fortnite, pokemon, API…"
              aria-label="Votre recherche"
              autoFocus
            />
            {source ? <input type="hidden" name="type" value={source} /> : null}
            <button type="submit">Rechercher</button>
          </form>
          <div className="filter-chips" role="group" aria-label="Filtrer les résultats">
            <Link className={!source ? 'filter-chip active' : 'filter-chip'} href={filterHref()}>Tout</Link>
            {searchSources.map((value) => (
              <Link
                key={value}
                className={source === value ? 'filter-chip active' : 'filter-chip'}
                href={filterHref(value)}
              >
                {sourceLabels[value]}s
              </Link>
            ))}
          </div>
        </section>

        <section id="results" aria-labelledby="results-title">
          <div className="section-heading">
            <h2 id="results-title">Résultats</h2>
            <span className="count">{results.length}</span>
          </div>
          {results.length ? (
            [...bySource.entries()].map(([group, itemsForGroup]) => (
              <div className="result-group" key={group}>
                <h3>{sourceLabels[group]}s</h3>
                <ul className="result-list">
                  {itemsForGroup.map((item, index) => (
                    <li key={`${item.source}-${item.url}-${index}`}>
                      <Link href={item.url}>
                        <span className="palette-kind">{sourceLabels[item.source]}</span>
                        <span className="palette-text">
                          <strong>{item.label}</strong>
                          {item.description ? <small>{item.description}</small> : null}
                        </span>
                        <span className="palette-group">{item.group}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          ) : (
            <p className="empty">
              {query ? `Aucun résultat pour « ${query} ».` : 'Saisissez un terme pour lancer la recherche.'}
            </p>
          )}
        </section>

        <footer>
          <p>Recherche indexée depuis Payload CMS · <Link href="/">Retour à l’accueil</Link></p>
        </footer>
      </div>
    </main>
  )
}
