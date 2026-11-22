import { createHmac } from 'node:crypto'

import type { CollectionAfterChangeHook } from 'payload'

/**
 * Notifie le bot Discord après une modification.
 *
 * Le bot vérifie l'en-tête `x-payload-signature` :
 * HMAC-SHA256(secret, corps brut) en hexadécimal.
 * On ne sérialise DONC le corps qu'une seule fois pour le HMAC et le fetch.
 */
const PICKED_FIELDS = [
  'id',
  'key',
  'name',
  'title',
  'slug',
  'description',
  'category',
  'emoji',
  'discordRoleId',
  'published',
  'enabled',
  'status',
  'startsAt',
  'endsAt',
  'twitchLogin',
  'twitchUserId',
  'discordId',
] as const

function minimalDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const minimal: Record<string, unknown> = {}

  for (const field of PICKED_FIELDS) {
    if (typeof doc?.[field] !== 'undefined') {
      minimal[field] = doc[field]
    }
  }

  return minimal
}

export const notifyBot: CollectionAfterChangeHook = async ({
  collection,
  context,
  doc,
  operation,
}) => {
  if (context?.skipBotWebhook) {
    return
  }

  const webhookURL = process.env.BOT_WEBHOOK_URL
  if (!webhookURL) {
    return
  }

  const collectionSlug =
    typeof collection === 'string'
      ? collection
      : ((collection as { slug?: string } | undefined)?.slug ?? 'unknown')

  const event = `${collectionSlug}.${operation}`
  const rawBody = JSON.stringify({
    event,
    source: 'payload',
    collection: collectionSlug,
    operation,
    action: operation,
    id: (doc as { id?: string | number } | undefined)?.id,
    doc: minimalDoc((doc ?? {}) as Record<string, unknown>),
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const secret = process.env.WEBHOOK_SECRET
  if (secret) {
    headers['x-payload-signature'] = createHmac('sha256', secret).update(rawBody).digest('hex')
    // En-tête additionnel demandé par le bot (toléré, non nécessaire à la vérification).
    headers['x-webhook-secret'] = secret
  }

  try {
    const response = await fetch(`${webhookURL.replace(/\/$/, '')}/webhooks/payload`, {
      method: 'POST',
      headers,
      body: rawBody,
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      console.warn(`[payload] webhook ${event}: réponse HTTP ${response.status}`)
    }
  } catch (error) {
    // Le CMS ne doit jamais échouer parce que le bot est indisponible.
    console.warn(`[payload] webhook ${event} non livré:`, error)
  }
}
