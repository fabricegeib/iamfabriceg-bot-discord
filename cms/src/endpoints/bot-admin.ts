import { createHmac } from 'node:crypto'

import type { Endpoint } from 'payload'

type Doc = Record<string, any>

const ALLOWED_ACTIONS = ['deploy-commands', 'sync-commands'] as const
type AdminAction = (typeof ALLOWED_ACTIONS)[number]

/**
 * POST /api/bot/admin/action — relaie une action vers le bot Discord.
 * Réservé aux utilisateurs connectés de l'admin ; la requête vers le bot est
 * signée avec WEBHOOK_SECRET (jamais exposé au navigateur).
 */
export const botAdminActionEndpoint: Endpoint = {
  path: '/bot/admin/action',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ ok: false, error: 'Non autorisé' }, { status: 401 })
    }

    let data: Doc
    try {
      data = ((await req.json?.()) ?? {}) as Doc
    } catch {
      return Response.json({ ok: false, error: 'Corps JSON invalide' }, { status: 400 })
    }

    const action = String(data?.action ?? '')
    if (!ALLOWED_ACTIONS.includes(action as AdminAction)) {
      return Response.json({ ok: false, error: `Action inconnue : ${action}` }, { status: 400 })
    }

    const secret = process.env.WEBHOOK_SECRET
    const botUrl = process.env.BOT_WEBHOOK_URL
    if (!secret || !botUrl) {
      return Response.json(
        { ok: false, error: 'WEBHOOK_SECRET ou BOT_WEBHOOK_URL manquant' },
        { status: 503 },
      )
    }

    const body = JSON.stringify({ action, requestedBy: req.user.id })
    const signature = createHmac('sha256', secret).update(body).digest('hex')

    try {
      const response = await fetch(
        `${String(botUrl).replace(/\/+$/, '')}/admin/actions/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': signature,
          },
          body,
          signal: AbortSignal.timeout(30_000),
        },
      )
      const text = await response.text()
      let result: unknown
      try {
        result = text ? JSON.parse(text) : null
      } catch {
        result = text
      }

      return Response.json(
        { ok: response.ok, action, status: response.status, result },
        { status: response.ok ? 200 : 502 },
      )
    } catch (error) {
      return Response.json(
        { ok: false, error: error instanceof Error ? error.message : 'Échec de l’appel bot' },
        { status: 502 },
      )
    }
  },
}
