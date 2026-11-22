import Link from 'next/link'
import type { WidgetServerProps } from 'payload'

import { getBotStatus } from '@/utilities/getBotStatus'

type Doc = Record<string, any>

/** Carte de synthèse affichée sur le dashboard Payload. */
export default async function BotOverviewWidget({ req }: WidgetServerProps) {
  const { payload } = req

  const [commands, games, profiles, usages, news, settings, status, recent] = await Promise.all([
    payload.count({ collection: 'commands', req }),
    payload.count({ collection: 'games', req }),
    payload.count({ collection: 'profiles', req }),
    payload.count({ collection: 'commandUsages', req }),
    payload.count({ collection: 'news', req }),
    payload.findGlobal({ slug: 'botSettings', depth: 0, req }),
    getBotStatus(),
    payload.find({ collection: 'commandUsages', depth: 0, limit: 300, sort: '-usedAt', req }),
  ])

  const global = (settings ?? {}) as Doc
  const cards = [
    { label: 'Interactions', value: usages.totalDocs },
    { label: 'Membres', value: profiles.totalDocs },
    { label: 'Commandes', value: commands.totalDocs },
    { label: 'Jeux', value: games.totalDocs },
    { label: 'Actualités', value: news.totalDocs },
  ]

  const docs = recent.docs as Doc[]
  const byDay = new Map<string, number>()
  const byCommand = new Map<string, number>()
  for (const doc of docs) {
    const day = String(doc.usedAt || '').slice(0, 10)
    if (day) byDay.set(day, (byDay.get(day) || 0) + 1)
    const name = String(doc.commandName || '')
    if (name) byCommand.set(name, (byCommand.get(name) || 0) + 1)
  }

  const today = new Date()
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (6 - index))
    const key = date.toISOString().slice(0, 10)
    return { key, count: byDay.get(key) || 0 }
  })
  const peak = Math.max(1, ...days.map((day) => day.count))
  const top = [...byCommand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return (
    <div className="bot-widget">
      <div className="bot-widget__head">
        <div>
          <p className="bot-widget__eyebrow">iamfabriceg Bot</p>
          <h3>Vue d’ensemble</h3>
        </div>
        <div style={{ display: 'grid', gap: '0.35rem', justifyItems: 'end' }}>
          <span className="bot-widget__version">v{String(global.version || '1.1.0')}</span>
          <span className={status.online ? 'bot-widget__status online' : 'bot-widget__status'}>
            {status.online ? 'Bot connecté' : 'Bot indisponible'}
            {status.latencyMs !== undefined ? ` · ${status.latencyMs} ms` : ''}
          </span>
        </div>
      </div>
      <div className="bot-widget__grid">
        {cards.map((card) => (
          <div className="bot-widget__stat" key={card.label}>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </div>
        ))}
      </div>
      {docs.length > 0 ? (
        <>
          <p className="bot-widget__subhead">Activité · 7 derniers jours</p>
          <div className="bot-widget__spark" aria-label="Interactions des 7 derniers jours">
            {days.map((day) => (
              <span
                key={day.key}
                className="bot-widget__spark-bar"
                style={{ height: `${Math.max(4, (day.count / peak) * 100)}%` }}
                title={`${day.key} · ${day.count} interaction(s)`}
              />
            ))}
          </div>
          {top.length ? (
            <>
              <p className="bot-widget__subhead">Commandes populaires</p>
              <ul className="bot-widget__toplist">
                {top.map(([name, count]) => (
                  <li key={name}>
                    <code>/{name}</code>
                    <span>{count} usage(s)</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </>
      ) : null}
      <p className="bot-widget__hint">
        Statistiques détaillées : <Link href="/admin/stats">tableau de bord des stats</Link> ·{' '}
        <Link href="/admin/collections/commandUsages">journal des interactions</Link>
      </p>
    </div>
  )
}
