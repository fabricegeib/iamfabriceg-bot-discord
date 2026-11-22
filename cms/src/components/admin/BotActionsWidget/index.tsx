import Link from 'next/link'
import type { WidgetServerProps } from 'payload'

import { Actions } from './Actions'

/** Boutons d'actions bot accessibles depuis le dashboard. */
export default function BotActionsWidget(_props: WidgetServerProps) {
  return (
    <div className="bot-widget">
      <div className="bot-widget__head">
        <div>
          <p className="bot-widget__eyebrow">Maintenance</p>
          <h3>Actions rapides</h3>
        </div>
        <span className="bot-widget__version">Bot ↔ CMS</span>
      </div>
      <p className="bot-widget__hint" style={{ marginTop: 0 }}>
        Les actions sont signées côté serveur avec <code>WEBHOOK_SECRET</code> et réservées aux administrateurs.
      </p>
      <Actions />
      <p className="bot-widget__hint">
        Détails et dépannage : <Link href="/admin/stats">statistiques</Link> ·{' '}
        <Link href="/admin/collections/webhookEvents">événements webhook</Link>
      </p>
    </div>
  )
}
