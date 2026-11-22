import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { getBotStatus } from '@/utilities/getBotStatus'

type Doc = Record<string, any>

/** Vue admin complète : toutes les statistiques enregistrées par le bot. */
export async function BotStatsView({
  initPageResult,
  params,
  searchParams,
  user,
}: AdminViewServerProps) {
  const { req } = initPageResult

  if (!req.user) {
    return <div className="bot-stats-view"><p>Vous devez être connecté pour consulter les statistiques.</p></div>
  }

  const payload = req.payload
  const [usages, profiles, commands, settings, status] = await Promise.all([
    payload.find({ collection: 'commandUsages', depth: 0, limit: 1000, sort: '-usedAt' }),
    payload.find({ collection: 'profiles', depth: 0, limit: 20, sort: '-points' }),
    payload.find({ collection: 'commands', depth: 0, limit: 200, sort: '-usageCount' }),
    payload.findGlobal({ slug: 'botSettings', depth: 0 }),
    getBotStatus(),
  ])

  const settingsDoc = (settings ?? {}) as Doc
  const docs = usages.docs as Doc[]
  const successes = docs.filter((doc) => doc.outcome === 'success' || doc.success).length
  const points = docs.reduce((sum, doc) => sum + (Number(doc.pointsAwarded) || 0), 0)
  const byCommand = new Map<string, { usages: number; successes: number; points: number }>()
  const byDay = new Map<string, { usages: number; points: number }>()

  for (const doc of docs) {
    const name = String(doc.commandName || 'inconnue')
    const day = String(doc.usedAt || '').slice(0, 10)
    const command = byCommand.get(name) || { usages: 0, successes: 0, points: 0 }
    command.usages += 1
    command.successes += doc.outcome === 'success' || doc.success ? 1 : 0
    command.points += Number(doc.pointsAwarded) || 0
    byCommand.set(name, command)

    const daily = byDay.get(day) || { usages: 0, points: 0 }
    daily.usages += 1
    daily.points += Number(doc.pointsAwarded) || 0
    byDay.set(day, daily)
  }

  const topCommands = [...byCommand.entries()]
    .sort((a, b) => b[1].usages - a[1].usages)
    .slice(0, 20)
  const days = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-30)
  const peak = Math.max(1, ...days.map(([, stat]) => stat.usages))
  const maxCommand = Math.max(1, ...topCommands.map(([, stat]) => stat.usages))
  const loyalty = (settingsDoc.loyalty ?? {}) as Doc
  const thresholds = Array.isArray(loyalty.levelThresholds)
    ? loyalty.levelThresholds.map(Number).filter(Number.isFinite)
    : []

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={initPageResult.permissions}
      searchParams={searchParams}
      user={user}
      visibleEntities={initPageResult.visibleEntities}
    >
      <div className="bot-stats-view">
        <p className="bot-widget__eyebrow">iamfabriceg Bot · v{String(settingsDoc.version || '1.1.0')}</p>
        <h1>Statistiques</h1>
        <p>
          Toutes les interactions enregistrées par le bot sont visibles ici et dans les collections{' '}
          <code>commandUsages</code>, <code>profiles</code> et <code>commands</code>. Les actions du tableau de bord
          relaient vers le bot via un endpoint signé.
        </p>

        <div className="bot-stats-view__grid">
          <div className="bot-widget__stat"><strong>{usages.totalDocs}</strong><span>Interactions</span><small>Journal complet</small></div>
          <div className="bot-widget__stat"><strong>{successes}</strong><span>Réussites</span><small>{usages.totalDocs ? Math.round((successes / usages.totalDocs) * 100) : 0}% des interactions</small></div>
          <div className="bot-widget__stat"><strong>{profiles.totalDocs}</strong><span>Profils</span><small>Membres connus</small></div>
          <div className="bot-widget__stat"><strong>{points}</strong><span>Points distribués</span><small>Fidélité cumulée</small></div>
        </div>

        <div className="bot-stats-view__grid" style={{ marginTop: '1rem' }}>
          <div className="bot-stats-view__panel">
            <h3>Activité · 30 derniers jours</h3>
            {days.length ? (
              <>
                <div className="bot-stats-view__bars">
                  {days.map(([day, stat]) => (
                    <span
                      key={day}
                      className="bot-stats-view__bar"
                      style={{ height: `${Math.max(3, (stat.usages / peak) * 100)}%` }}
                      title={`${day} · ${stat.usages} interaction(s) · ${stat.points} point(s)`}
                    />
                  ))}
                </div>
                <div className="bot-stats-view__bar-label"><span>{days[0]?.[0]}</span><span>{days.at(-1)?.[0]}</span></div>
              </>
            ) : (
              <p>Aucune donnée.</p>
            )}
          </div>
          <div className="bot-stats-view__panel">
            <h3>Commandes les plus utilisées</h3>
            {topCommands.length ? (
              <div className="bot-stats-view__progress">
                <ul>
                  {topCommands.slice(0, 8).map(([name, stat]) => (
                    <li key={name}>
                      <code>/{name}</code>
                      <span className="bot-stats-view__track"><span style={{ width: `${(stat.usages / maxCommand) * 100}%` }} /></span>
                      <strong>{stat.usages}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Aucune interaction enregistrée.</p>
            )}
          </div>
          <div className="bot-stats-view__panel">
            <h3>État du bot</h3>
            <p>
              <span className={status.online ? 'bot-stats-view__tag' : 'bot-widget__status'}>
                {status.online ? 'En ligne' : 'Hors ligne'}
              </span>{' '}
              {status.latencyMs !== undefined ? `Healthcheck en ${status.latencyMs} ms.` : ''}
            </p>
            <p>Paliers de fidélité : {thresholds.length ? thresholds.map((value) => `${value} pts`).join(' · ') : 'non configurés'}</p>
          </div>
        </div>

        <h2>Historique des interactions</h2>
        <table className="bot-stats-table">
          <thead><tr><th>Commande</th><th>Usages</th><th>Réussites</th><th>Points</th></tr></thead>
          <tbody>
            {topCommands.length ? topCommands.map(([name, stat]) => (
              <tr key={name}><td>/{name}</td><td>{stat.usages}</td><td>{stat.successes}</td><td>{stat.points}</td></tr>
            )) : <tr><td colSpan={4}>Aucune interaction enregistrée.</td></tr>}
          </tbody>
        </table>

        <h2>Classement des membres</h2>
        <table className="bot-stats-table">
          <thead><tr><th>Membre</th><th>Points</th><th>Niveau</th><th>Usages</th><th>Série</th></tr></thead>
          <tbody>
            {(profiles.docs as Doc[]).map((doc) => (
              <tr key={String(doc.id)}>
                <td>{String(doc.username || doc.discordId)}</td>
                <td>{Number(doc.points) || 0}</td>
                <td>{Number(doc.level) || 1}</td>
                <td>{Number(doc.totalUsages) || 0}</td>
                <td>{Number(doc.streak) || 0}</td>
              </tr>
            ))}
            {profiles.docs.length === 0 ? <tr><td colSpan={5}>Aucun profil enregistré.</td></tr> : null}
          </tbody>
        </table>

        <h2>Activité par jour</h2>
        <table className="bot-stats-table">
          <thead><tr><th>Date</th><th>Usages</th><th>Points</th></tr></thead>
          <tbody>
            {days.length ? days.map(([day, stat]) => (
              <tr key={day}><td>{day}</td><td>{stat.usages}</td><td>{stat.points}</td></tr>
            )) : <tr><td colSpan={3}>Aucune donnée.</td></tr>}
          </tbody>
        </table>

        <h2>Compteurs par commande (catalogue)</h2>
        <table className="bot-stats-table">
          <thead><tr><th>Commande</th><th>Usages</th><th>Réussites</th><th>Échecs</th><th>Dernier usage</th></tr></thead>
          <tbody>
            {(commands.docs as Doc[]).map((doc) => (
              <tr key={String(doc.id)}>
                <td>/{String(doc.name)}</td>
                <td>{Number(doc.usageCount) || 0}</td>
                <td>{Number(doc.successCount) || 0}</td>
                <td>{Number(doc.failureCount) || 0}</td>
                <td>{doc.lastUsedAt ? String(doc.lastUsedAt).slice(0, 16).replace('T', ' ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DefaultTemplate>
  )
}
