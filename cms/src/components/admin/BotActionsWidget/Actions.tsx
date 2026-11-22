'use client'

import { useCallback, useState } from 'react'

type Action = 'deploy-commands' | 'sync-commands'

const LABELS: Record<Action, { label: string; description: string }> = {
  'deploy-commands': {
    label: 'Déployer les commandes',
    description: 'Met à jour les commandes slash sur le serveur de test Discord.',
  },
  'sync-commands': {
    label: 'Synchroniser le catalogue',
    description: 'Réimporte les métadonnées des commandes dans Payload.',
  },
}

export function Actions() {
  const [busy, setBusy] = useState<Action | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const run = useCallback(async (action: Action) => {
    if (busy) return
    setBusy(action)
    setMessage(null)
    try {
      const response = await fetch('/api/bot/admin/action', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.ok) {
        throw new Error(String(data?.error || data?.result?.error || `HTTP ${response.status}`))
      }
      // Le bot renvoie { ok, action, result: { deployed } | { created, updated, total } }.
      const detail = data?.result?.result ?? data?.result
      const suffix =
        typeof detail?.deployed === 'number'
          ? ` ${detail.deployed} commande(s) déployée(s).`
          : typeof detail?.updated === 'number'
            ? ` ${detail.updated} mise(s) à jour sur ${detail.total ?? '?'}.`
            : ''
      setMessage({ ok: true, text: `${LABELS[action].label} : terminé.${suffix}` })
    } catch (error) {
      setMessage({ ok: false, text: error instanceof Error ? error.message : 'Échec de l’action' })
    } finally {
      setBusy(null)
    }
  }, [busy])

  return (
    <div className="bot-widget__actions">
      {(Object.keys(LABELS) as Action[]).map((action) => (
        <div className="bot-widget__action" key={action}>
          <div>
            <strong>{LABELS[action].label}</strong>
            <p>{LABELS[action].description}</p>
          </div>
          <button
            className="bot-widget__button"
            disabled={busy !== null}
            onClick={() => run(action)}
            type="button"
          >
            {busy === action ? '…' : 'Exécuter'}
          </button>
        </div>
      ))}
      {message ? (
        <p aria-live="polite" className={message.ok ? 'bot-widget__msg' : 'bot-widget__msg bot-widget__msg--error'}>
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
