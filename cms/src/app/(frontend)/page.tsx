import type { ReactNode } from 'react'
import Link from 'next/link'
import { getPayload } from 'payload'
import config from 'payload-config'

import { ApiDocs } from '@/components/frontend/ApiDocs'
import { SearchPalette } from '@/components/frontend/SearchPalette'
import { SiteToolbar } from '@/components/frontend/SiteToolbar'
import { getBotStatus } from '@/utilities/getBotStatus'
import { getSearchItems } from '@/utilities/getSearchItems'

export const dynamic = 'force-dynamic'

type Doc = Record<string, any>

type CommandOption = {
  name?: string
  description?: string
  descriptionEn?: string
  type?: string
  required?: boolean
  choices?: Array<{ name?: string; nameFr?: string; value?: string }>
  minValue?: number | null
  maxValue?: number | null
  options?: CommandOption[]
}

const CATEGORY_LABELS: Record<string, string> = {
  cms: 'CMS & profil',
  games: 'Jeux',
  info: 'Information',
  moderation: 'Modération',
}

function text(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function asOptions(value: unknown): CommandOption[] {
  return Array.isArray(value) ? (value as CommandOption[]) : []
}

function asExamples(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => (typeof entry === 'string' ? entry : entry?.example))
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

function formatDate(value: unknown): string {
  if (!value) return '—'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR')
}

function formatOption(option: CommandOption, depth = 0): ReactNode {
  const label = option.name || 'option'
  const constraints = [
    option.required ? 'obligatoire' : 'optionnel',
    option.minValue !== null && option.minValue !== undefined ? `min ${option.minValue}` : '',
    option.maxValue !== null && option.maxValue !== undefined ? `max ${option.maxValue}` : '',
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <li key={`${depth}-${label}`} className={depth > 0 ? 'option nested' : 'option'}>
      <div className="option-head">
        <code>{label}</code>
        <span className="option-type">{option.type || 'paramètre'}</span>
        <span className="option-constraint">{constraints}</span>
      </div>
      <p>{text(option.description, text(option.descriptionEn, '—'))}</p>
      {option.choices && option.choices.length > 0 ? (
        <div className="choices">
          {option.choices.map((choice) => (
            <span key={String(choice.value)} className="choice">
              {text(choice.nameFr, text(choice.name, String(choice.value)))} <code>{String(choice.value)}</code>
            </span>
          ))}
        </div>
      ) : null}
      {asOptions(option.options).length > 0 ? (
        <ul className="option-list">{asOptions(option.options).map((child) => formatOption(child, depth + 1))}</ul>
      ) : null}
    </li>
  )
}

/**
 * Page publique en lecture seule : aucune écriture, aucune clé API exposée.
 * Les données viennent de la Local API de Payload et l'état du bot d'un
 * healthcheck appelé côté serveur.
 */
export default async function HomePage() {
  const payload = await getPayload({ config })

  const [gamesResult, commandsResult, newsResult, settings, status, searchIndex] = await Promise.all([
    payload.find({
      collection: 'games',
      depth: 0,
      limit: 100,
      sort: 'order',
      where: { published: { equals: true } },
    }),
    payload.find({
      collection: 'commands',
      depth: 0,
      limit: 200,
      sort: 'name',
      where: { enabled: { equals: true } },
    }),
    payload.find({
      collection: 'news',
      depth: 0,
      limit: 5,
      sort: '-publishedAt',
      where: { published: { equals: true } },
    }),
    payload.findGlobal({ slug: 'botSettings', depth: 0 }),
    getBotStatus(),
    getSearchItems(),
  ])

  const settingsDoc = (settings ?? {}) as Doc
  const games = gamesResult.docs as Doc[]
  const commands = commandsResult.docs as Doc[]
  const news = newsResult.docs as Doc[]
  const socialLinks = Array.isArray(settingsDoc.socialLinks) ? settingsDoc.socialLinks : []
  const lastUpdate = (news[0]?.publishedAt ?? settingsDoc.updatedAt) as string | undefined
  const version = text(settingsDoc.version, '1.1.0')
  const invite = text(settingsDoc.discordInvite, '')

  const grouped = new Map<string, Doc[]>()
  for (const command of commands) {
    const category = text(command.category, 'divers')
    if (!grouped.has(category)) grouped.set(category, [])
    grouped.get(category)!.push(command)
  }
  const categories = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr'))

  return (
    <main className="site">
      <a className="skip-link" href="#content">Aller au contenu</a>

      <header className="navbar">
        <div className="navbar-brand-row">
          <Link className="navbar-brand" href="/">
            iamfabriceg<span className="brand-accent">.xyz</span> <span className="brand-sub">/ bot</span>
          </Link>
          <span className="version-badge">v{version}</span>
        </div>
        <nav aria-label="Navigation principale">
          <ul className="navbar-nav">
            <li><Link className="nav-link" href="#games">Jeux</Link></li>
            <li><Link className="nav-link" href="#commands">Commandes</Link></li>
            <li><Link className="nav-link" href="#news">Actualités</Link></li>
            <li><Link className="nav-link" href="#api">API</Link></li>
          </ul>
        </nav>
        <div className="navbar-actions">
          <SearchPalette items={searchIndex} />
          <Link className="admin-link" href="/admin">Administration →</Link>
        </div>
      </header>

      <div className="container" id="content">
        <section className="jumbotron hero" aria-labelledby="hero-title">
          <div className="hero-content">
            <div className="hero-meta">
              <p className="eyebrow">Discord Bot · CMS</p>
              <span className={status.online ? 'status online' : 'status offline'}>
                <span className="status-dot" aria-hidden="true" />
                Bot {status.online ? 'en ligne' : 'hors ligne'}
                {status.latencyMs !== undefined ? ` · ${status.latencyMs} ms` : ''}
              </span>
            </div>
            <h1 id="hero-title">{text(settingsDoc.botName, 'iamfabriceg Bot')}</h1>
            <p className="lead">
              {text(
                settingsDoc.description,
                'Catalogue des jeux, commandes et actualités du bot Discord.',
              )}
            </p>
            {settingsDoc.maintenanceMode ? (
              <p className="badge badge-warn">🔧 Maintenance en cours</p>
            ) : null}
            <div className="hero-links">
              {invite ? (
                <a className="button primary" href={invite} rel="noreferrer">
                  Ajouter le bot à mon serveur
                </a>
              ) : null}
              <Link className="button" href="/api/bot/summary">API JSON</Link>
              <Link className="button" href="/search">Recherche avancée</Link>
              {socialLinks.map((link: Doc, index: number) => (
                <a key={`${link.label}-${index}`} className="button" href={String(link.url)} rel="noreferrer">
                  {text(link.label, 'Lien')}
                </a>
              ))}
            </div>
          </div>
          <div className="hero-stats" aria-label="Chiffres clés">
            <div><strong>{commands.length}</strong><span>commandes</span></div>
            <div><strong>{games.length}</strong><span>jeux</span></div>
            <div><strong>{news.length}</strong><span>actualités</span></div>
          </div>
        </section>

        <SiteToolbar />

        <section id="games" data-kind="games" aria-labelledby="games-title">
          <div className="section-heading">
            <h2 id="games-title">Jeux</h2>
            <span className="count">{games.length}</span>
            <a className="section-anchor" href="#games" aria-label="Lien vers Jeux">#</a>
          </div>
          <ul className="cards">
            {games.map((game) => (
              <li className="card" key={String(game.id)}>
                <div className="card-top">
                  <span className="emoji" aria-hidden="true">{text(game.emoji, '🎮')}</span>
                  <span className="category">{text(game.category, 'Jeu')}</span>
                </div>
                <h3>{text(game.title, text(game.key, 'Jeu'))}</h3>
                {game.description ? <p>{String(game.description)}</p> : null}
                <code>{String(game.key)}</code>
              </li>
            ))}
          </ul>
          {games.length === 0 ? <p className="empty">Aucun jeu publié pour le moment.</p> : null}
        </section>

        <section id="commands" data-kind="commands" aria-labelledby="commands-title">
          <div className="section-heading">
            <h2 id="commands-title">Commandes</h2>
            <span className="count">{commands.length}</span>
            <a className="section-anchor" href="#commands" aria-label="Lien vers Commandes">#</a>
          </div>
          <p className="section-intro">
            Toutes les commandes slash disponibles, avec leurs paramètres et exemples. Utilisez{' '}
            <code>/help</code> dans Discord pour la même aide en direct.
          </p>
          {categories.map(([category, items]) => (
            <div className="command-group" key={category}>
              <h3 className="command-group-title">
                {CATEGORY_LABELS[category] || category} <span className="count">{items.length}</span>
              </h3>
              <ul className="command-list">
                {items.map((command) => {
                  const options = asOptions(command.options)
                  const examples = asExamples(command.examples)
                  const permissions = Array.isArray(command.permissions)
                    ? (command.permissions as string[])
                    : []
                  return (
                    <li className="command-card" key={String(command.id)}>
                      <div className="command-top">
                        <code className="command-name">/{String(command.name).replace(/^\//, '')}</code>
                        {command.adminOnly || permissions.includes('Administrator') ? (
                          <span className="badge badge-admin">Administrateurs</span>
                        ) : null}
                        {Number(command.cooldown) > 0 ? (
                          <span className="badge">Cooldown {Number(command.cooldown) / 1000}s</span>
                        ) : null}
                      </div>
                      <p className="command-description">
                        {text(command.description, text(command.descriptionEn, '—'))}
                      </p>
                      {command.usage ? (
                        <p className="usage">Utilisation : <code>{String(command.usage)}</code></p>
                      ) : null}
                      {options.length > 0 ? (
                        <div className="command-block">
                          <h4>Paramètres</h4>
                          <ul className="option-list">{options.map((option) => formatOption(option))}</ul>
                        </div>
                      ) : null}
                      {examples.length > 0 ? (
                        <div className="command-block">
                          <h4>Exemples</h4>
                          <ul className="examples">
                            {examples.map((example) => (
                              <li key={example}><code>{example}</code></li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
          {commands.length === 0 ? <p className="empty">Aucune commande active.</p> : null}
        </section>

        <section id="news" aria-labelledby="news-title">
          <div className="section-heading">
            <h2 id="news-title">Actualités</h2>
            <span className="count">{news.length}</span>
            <a className="section-anchor" href="#news" aria-label="Lien vers Actualités">#</a>
          </div>
          <ul className="news">
            {news.map((item) => (
              <li key={String(item.id)}>
                <h3>{String(item.title)}</h3>
                {item.excerpt ? <p>{String(item.excerpt)}</p> : null}
                <time>{formatDate(item.publishedAt)}</time>
              </li>
            ))}
          </ul>
          {news.length === 0 ? <p className="empty">Aucune actualité publiée.</p> : null}
        </section>

        <ApiDocs />

        <footer>
          <p>Dernière mise à jour : {formatDate(lastUpdate)}</p>
          <p>
            Version {version} · <Link href="/admin">Administration</Link> ·{' '}
            <a href="https://iamfabriceg.xyz" rel="noreferrer">iamfabriceg.xyz</a>
          </p>
        </footer>
      </div>
    </main>
  )
}
