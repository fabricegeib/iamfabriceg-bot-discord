/**
 * État du bot Discord pour le front public. Le CMS interroge le healthcheck du
 * bot côté serveur (jamais depuis le navigateur) et dégrade gracieusement si le
 * service n'est pas démarré : la page reste utilisable.
 */
export type BotStatus = {
  online: boolean
  service: string
  timestamp?: string
  latencyMs?: number
  endpoints?: string[]
}

const CACHE_MS = 30_000
let cached: { at: number; value: BotStatus } | null = null

export async function getBotStatus(): Promise<BotStatus> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value

  const base = (process.env.BOT_WEBHOOK_URL || 'http://127.0.0.1:31000').replace(/\/+$/, '')
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1500)

  try {
    const response = await fetch(`${base}/healthz`, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'iamfabriceg-cms/1.1' },
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as Record<string, unknown>
    const value: BotStatus = {
      online: Boolean(data.ok),
      service: typeof data.service === 'string' ? data.service : 'iamfabriceg-bot',
      timestamp: typeof data.timestamp === 'string' ? data.timestamp : undefined,
      latencyMs: Date.now() - started,
      endpoints: Array.isArray(data.endpoints) ? (data.endpoints as string[]) : undefined,
    }
    cached = { at: Date.now(), value }
    return value
  } catch {
    const value: BotStatus = { online: false, service: 'iamfabriceg-bot', latencyMs: Date.now() - started }
    cached = { at: Date.now(), value }
    return value
  } finally {
    clearTimeout(timer)
  }
}
