import Link from 'next/link'
import { getPayload } from 'payload'
import config from 'payload-config'

export const dynamic = 'force-dynamic'

type Doc = Record<string, any>

function formatDate(value: unknown): string {
  if (!value) return '—'
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR')
}

/**
 * Page publique EN LECTURE SEULE : aucun formulaire, aucune écriture.
 * Les données sont lues directement via la Local API de Payload.
 */
export default async function HomePage() {
  const payload = await getPayload({ config })

  const [gamesResult, commandsResult, newsResult, settings] = await Promise.all([
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
  ])

  const settingsDoc = (settings ?? {}) as Doc
  const games = gamesResult.docs as Doc[]
  const commands = commandsResult.docs as Doc[]
  const news = newsResult.docs as Doc[]
  const lastUpdate = (news[0]?.publishedAt ?? settingsDoc.updatedAt) as string | undefined

  return (
        <main className="site">
          <header className="hero">
            <div>
              <p className="eyebrow">Discord Bot · CMS</p>
              <h1>{settingsDoc.botName || 'iamfabriceg Bot'}</h1>
              <p className="lead">
                {settingsDoc.description ||
                  'Catalogue des jeux, commandes et actualités du bot Discord.'}
              </p>
              {settingsDoc.maintenanceMode ? (
                <p className="badge badge-warn">🔧 Maintenance en cours</p>
              ) : null}
            </div>
            <Link className="admin-link" href="/admin">
              Administration →
            </Link>
          </header>

          <section aria-labelledby="games-title">
            <div className="section-heading">
              <h2 id="games-title">Jeux</h2>
              <span className="count">{games.length}</span>
            </div>
            <ul className="cards">
              {games.map((game) => (
                <li className="card" key={String(game.id)}>
                  <div className="card-top">
                    <span className="emoji" aria-hidden="true">
                      {game.emoji || '🎮'}
                    </span>
                    <span className="category">{game.category || 'Jeu'}</span>
                  </div>
                  <h3>{game.title || game.key}</h3>
                  {game.description ? <p>{game.description}</p> : null}
                  <code>{game.key}</code>
                </li>
              ))}
            </ul>
            {games.length === 0 ? <p className="empty">Aucun jeu publié pour le moment.</p> : null}
          </section>

          <section aria-labelledby="commands-title">
            <div className="section-heading">
              <h2 id="commands-title">Commandes actives</h2>
              <span className="count">{commands.length}</span>
            </div>
            <ul className="commands">
              {commands.map((command) => (
                <li key={String(command.id)}>
                  <code>/{String(command.name).replace(/^\//, '')}</code>
                  <span>{command.description || '—'}</span>
                  {command.category ? <span className="tag">{command.category}</span> : null}
                </li>
              ))}
            </ul>
            {commands.length === 0 ? <p className="empty">Aucune commande active.</p> : null}
          </section>

          <section aria-labelledby="news-title">
            <div className="section-heading">
              <h2 id="news-title">Actualités</h2>
              <span className="count">{news.length}</span>
            </div>
            <ul className="news">
              {news.map((item) => (
                <li key={String(item.id)}>
                  <h3>{item.title}</h3>
                  {item.excerpt ? <p>{item.excerpt}</p> : null}
                  <time>{formatDate(item.publishedAt)}</time>
                </li>
              ))}
            </ul>
            {news.length === 0 ? <p className="empty">Aucune actualité publiée.</p> : null}
          </section>

          <footer>
            <p>Dernière mise à jour : {formatDate(lastUpdate)}</p>
            <p>
              {settingsDoc.version ? `Version ${settingsDoc.version} · ` : ''}
              <Link href="/admin">Administration</Link>
            </p>
          </footer>
      </main>
  )
}
