import type { Endpoint } from 'payload'

type Doc = Record<string, any>

const PROFILE_FIELDS = [
  'username',
  'discriminator',
  'avatarUrl',
  'guilds',
  'roles',
  'reputation',
  'notes',
  'lastSeenAt',
  'banned',
] as const

/**
 * GET /api/bot/summary — données publiques nécessaires au bot, en une seule requête.
 */
export const botSummaryEndpoint: Endpoint = {
  path: '/bot/summary',
  method: 'get',
  handler: async (req) => {
    const payload = req.payload

    const [games, commands, settings, gamesCount, commandsCount, newsCount, eventsCount, profilesCount] =
      await Promise.all([
        payload.find({
          collection: 'games',
          depth: 0,
          limit: 250,
          sort: 'order',
          where: { published: { equals: true } },
        }),
        payload.find({
          collection: 'commands',
          depth: 0,
          limit: 500,
          sort: 'name',
          where: { enabled: { equals: true } },
        }),
        payload.findGlobal({ slug: 'botSettings', depth: 0 }),
        payload.count({ collection: 'games' }),
        payload.count({ collection: 'commands' }),
        payload.count({ collection: 'news' }),
        payload.count({ collection: 'events' }),
        payload.count({ collection: 'profiles' }),
      ])

    const settingsDoc = (settings ?? {}) as Doc
    const features = (settingsDoc.features ?? {}) as Doc

    return Response.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      games: games.docs.map((game: Doc) => ({
        key: game.key,
        title: game.title,
        category: game.category,
        emoji: game.emoji,
        discordRoleId: game.discordRoleId,
      })),
      commands: commands.docs.map((command: Doc) => ({
        name: command.name,
        description: command.description,
        category: command.category,
        usage: command.usage,
        enabled: command.enabled,
      })),
      settings: {
        botName: settingsDoc.botName,
        description: settingsDoc.description,
        version: settingsDoc.version,
        discordInvite: settingsDoc.discordInvite,
        twitchChannel: settingsDoc.twitchChannel,
        maintenanceMode: settingsDoc.maintenanceMode,
        features: {
          games: features.games,
          pokemon: features.pokemon,
          fortnite: features.fortnite,
          riot: features.riot,
          steam: features.steam,
          deals: features.deals,
          twitch: features.twitch,
          moderation: features.moderation,
        },
      },
      stats: {
        games: gamesCount.totalDocs,
        commands: commandsCount.totalDocs,
        news: newsCount.totalDocs,
        events: eventsCount.totalDocs,
        profiles: profilesCount.totalDocs,
      },
    })
  },
}

/**
 * POST /api/bot/profile — upsert d'un profil Discord (authentification API-Key requise).
 * Le bot envoie `{ discordId, username, ... }` avec l'en-tête
 * `Authorization: users API-Key <clé>`.
 */
export const botProfileEndpoint: Endpoint = {
  path: '/bot/profile',
  method: 'post',
  handler: async (req) => {
    if (!req.user) {
      return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    let data: Doc
    try {
      data = ((await req.json?.()) ?? {}) as Doc
    } catch {
      return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const discordId = String(data?.discordId ?? '').trim()
    if (!discordId) {
      return Response.json({ ok: false, error: 'discordId is required' }, { status: 400 })
    }

    const updateData: Doc = {}
    for (const field of PROFILE_FIELDS) {
      if (typeof data[field] !== 'undefined') {
        updateData[field] = data[field]
      }
    }
    updateData.lastSeenAt = data.lastSeenAt ?? new Date().toISOString()

    const existing = await req.payload.find({
      collection: 'profiles',
      limit: 1,
      where: { discordId: { equals: discordId } },
      depth: 0,
    })

    if (existing.docs.length > 0) {
      const updated = await req.payload.update({
        collection: 'profiles',
        id: existing.docs[0]!.id,
        data: updateData,
        context: { skipBotWebhook: true },
      })

      return Response.json({ ok: true, created: false, id: updated.id })
    }

    const created = await req.payload.create({
      collection: 'profiles',
      data: { discordId, ...updateData },
      context: { skipBotWebhook: true },
    })

    return Response.json({ ok: true, created: true, id: created.id })
  },
}

/**
 * GET /api/bot/healthz — healthcheck simple (sans authentification).
 */
export const botHealthzEndpoint: Endpoint = {
  path: '/bot/healthz',
  method: 'get',
  handler: async (req) => {
    let database = 'ok'
    try {
      await req.payload.find({ collection: 'games', limit: 1, depth: 0 })
    } catch (error) {
      database = 'unavailable'
      console.warn('[payload] healthz: base de données indisponible', error)
    }

    return Response.json({
      ok: database === 'ok',
      service: 'payload-cms',
      database,
      timestamp: new Date().toISOString(),
    })
  },
}

export const botEndpoints: Endpoint[] = [
  botSummaryEndpoint,
  botProfileEndpoint,
  botHealthzEndpoint,
]
