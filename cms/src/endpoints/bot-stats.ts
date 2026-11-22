import type { Endpoint } from 'payload'

type Doc = Record<string, any>
type Outcome = 'success' | 'error' | 'cooldown' | 'denied'
type Source = 'chatInput' | 'button' | 'selectMenu' | 'autocomplete'

const OUTCOMES: Outcome[] = ['success', 'error', 'cooldown', 'denied']
const SOURCES: Source[] = ['chatInput', 'button', 'selectMenu', 'autocomplete']

const dayKey = (date: Date) => date.toISOString().slice(0, 10)

function levelFor(points: number, thresholds: unknown): number {
  const values = (Array.isArray(thresholds) ? thresholds : [0, 10, 30, 60, 100, 200])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b)
  let level = 1
  for (let index = 0; index < values.length; index += 1) {
    if (points >= values[index]!) level = index + 1
  }
  return level
}

function unauthorized() {
  return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

/**
 * POST /api/bot/usage — enregistre une interaction Discord et met à jour
 * les compteurs de commande, le profil et la fidélité. Clé API requise.
 */
export const botUsageEndpoint: Endpoint = {
  path: '/bot/usage',
  method: 'post',
  handler: async (req) => {
    if (!req.user) return unauthorized()

    let data: Doc
    try {
      data = ((await req.json?.()) ?? {}) as Doc
    } catch {
      return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
    }

    const commandName = String(data?.commandName ?? '').trim()
    const userId = String(data?.userId ?? '').trim()
    if (!commandName || !userId) {
      return Response.json(
        { ok: false, error: 'commandName and userId are required' },
        { status: 400 },
      )
    }

    const outcome: Outcome = OUTCOMES.includes(String(data.outcome) as Outcome)
      ? (String(data.outcome) as Outcome)
      : 'success'
    const isSuccess = outcome === 'success'
    const now = new Date()
    const today = dayKey(now)
    const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))

    const [commandResult, settings, profileResult] = await Promise.all([
      req.payload.find({
        collection: 'commands',
        depth: 0,
        limit: 1,
        where: { name: { equals: commandName } },
      }),
      req.payload.findGlobal({ slug: 'botSettings', depth: 0 }),
      req.payload.find({
        collection: 'profiles',
        depth: 0,
        limit: 1,
        where: { discordId: { equals: userId } },
      }),
    ])

    const commandDoc = (commandResult.docs[0] ?? null) as Doc | null
    const loyalty = ((settings as Doc | null)?.loyalty ?? {}) as Doc
    const basePoints = Number(loyalty.pointsPerUsage ?? 1) || 0
    const successBonus = Number(loyalty.successBonus ?? 1) || 0
    const streakBonus = Number(loyalty.streakBonus ?? 2) || 0

    const profile = (profileResult.docs[0] ?? null) as Doc | null
    let streak = Number(profile?.streak ?? 0) || 0
    if (profile?.lastUsageDate !== today) {
      streak = profile?.lastUsageDate === yesterday ? streak + 1 : 1
    }
    const points =
      basePoints +
      (isSuccess ? successBonus : 0) +
      (loyalty.enabled !== false && streak >= 2 ? streakBonus : 0)

    const previousPoints = Number(profile?.points ?? 0) || 0
    const newPoints = previousPoints + points
    const counts = { ...((profile?.commandCounts ?? {}) as Record<string, number>) }
    counts[commandName] = (counts[commandName] ?? 0) + 1
    const favorite = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? commandName

    const profileData: Doc = {
      username: profile?.username || data.username || undefined,
      points: newPoints,
      xp: (Number(profile?.xp ?? 0) || 0) + points,
      level: levelFor(newPoints, loyalty.levelThresholds),
      totalUsages: (Number(profile?.totalUsages ?? 0) || 0) + 1,
      successUsages: (Number(profile?.successUsages ?? 0) || 0) + (isSuccess ? 1 : 0),
      errorUsages: (Number(profile?.errorUsages ?? 0) || 0) + (isSuccess ? 0 : 1),
      dailyUsages: profile?.lastUsageDate === today ? (Number(profile.dailyUsages) || 0) + 1 : 1,
      weeklyUsages: 0,
      streak,
      bestStreak: Math.max(streak, Number(profile?.bestStreak ?? 0) || 0),
      lastUsageAt: now.toISOString(),
      lastUsageDate: today,
      lastSeenAt: now.toISOString(),
      favoriteCommand: favorite,
      commandCounts: counts,
    }
    // La remise à zéro hebdomadaire est calculée côté serveur (semaine ISO simple).
    const startOfWeek = new Date(now)
    startOfWeek.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7))
    profileData.weeklyUsages =
      profile?.lastUsageAt && new Date(String(profile.lastUsageAt)) >= startOfWeek
        ? (Number(profile.weeklyUsages) || 0) + 1
        : 1

    if (profile?.id) {
      await req.payload.update({
        collection: 'profiles',
        id: profile.id,
        data: profileData,
        context: { skipBotWebhook: true },
      })
    } else {
      await req.payload.create({
        collection: 'profiles',
        data: { discordId: userId, ...profileData },
        context: { skipBotWebhook: true },
      })
    }

    if (commandDoc) {
      await req.payload.update({
        collection: 'commands',
        id: commandDoc.id,
        data: {
          usageCount: (Number(commandDoc.usageCount) || 0) + 1,
          successCount: (Number(commandDoc.successCount) || 0) + (isSuccess ? 1 : 0),
          failureCount: (Number(commandDoc.failureCount) || 0) + (isSuccess ? 0 : 1),
          pointsAwarded: (Number(commandDoc.pointsAwarded) || 0) + points,
          lastUsedAt: now.toISOString(),
        },
        // Le hook afterChange de `commands` enverrait un webhook à chaque usage.
        context: { skipBotWebhook: true },
      })
    }

    await req.payload.create({
      collection: 'commandUsages',
      data: {
        commandName,
        command: commandDoc?.id ?? undefined,
        subcommand: data.subcommand ? String(data.subcommand) : undefined,
        userId,
        guildId: data.guildId ? String(data.guildId) : undefined,
        channelId: data.channelId ? String(data.channelId) : undefined,
        usedAt: now.toISOString(),
        outcome,
        success: isSuccess,
        errorType: data.errorType ? String(data.errorType) : undefined,
        durationMs: Number(data.durationMs) || 0,
        pointsAwarded: points,
        options: data.options ?? {},
        source: SOURCES.includes(String(data.source) as Source)
          ? (String(data.source) as Source)
          : 'chatInput',
      },
      context: { skipBotWebhook: true },
    })

    return Response.json({
      ok: true,
      points,
      totalPoints: newPoints,
      level: profileData.level,
      totalUsages: profileData.totalUsages,
      streak,
      favoriteCommand: favorite,
    })
  },
}

/**
 * GET /api/bot/stats?userId=&command=&period=day|week|all — statistiques agrégées.
 * Clé API requise : les données de membres ne sont jamais publiques.
 */
export const botStatsEndpoint: Endpoint = {
  path: '/bot/stats',
  method: 'get',
  handler: async (req) => {
    if (!req.user) return unauthorized()

    const url = new URL(String(req.url ?? 'http://localhost/api/bot/stats'))
    const userId = url.searchParams.get('userId') || ''
    const command = url.searchParams.get('command') || ''
    const period = url.searchParams.get('period') || 'all'

    const where: Doc = {}
    if (userId) where.userId = { equals: userId }
    if (command) where.commandName = { equals: command }
    if (period === 'day' || period === 'week') {
      const since = new Date()
      since.setUTCDate(since.getUTCDate() - (period === 'day' ? 1 : 7))
      where.usedAt = { greater_than_equal: since.toISOString() }
    }

    const [usages, topProfiles, settings, totalCommands, memberProfile] = await Promise.all([
      req.payload.find({
        collection: 'commandUsages',
        depth: 0,
        limit: 2000,
        sort: '-usedAt',
        where,
      }),
      req.payload.find({
        collection: 'profiles',
        depth: 0,
        limit: 10,
        sort: '-points',
      }),
      req.payload.findGlobal({ slug: 'botSettings', depth: 0 }),
      req.payload.count({ collection: 'commandUsages' }),
      userId
        ? req.payload.find({
            collection: 'profiles',
            depth: 0,
            limit: 1,
            where: { discordId: { equals: userId } },
          })
        : Promise.resolve({ docs: [] }),
    ])

    const perCommand = new Map<string, Doc>()
    const perUser = new Map<string, Doc>()
    const perDay = new Map<string, Doc>()
    let successes = 0

    for (const usage of usages.docs as Doc[]) {
      const name = String(usage.commandName ?? 'inconnue')
      const user = String(usage.userId ?? 'inconnu')
      const day = String(usage.usedAt ?? '').slice(0, 10)
      const points = Number(usage.pointsAwarded) || 0
      if (usage.outcome === 'success' || usage.success) successes += 1

      const commandStat = perCommand.get(name) ?? { name, usages: 0, successes: 0, points: 0 }
      commandStat.usages += 1
      commandStat.successes += usage.outcome === 'success' || usage.success ? 1 : 0
      commandStat.points += points
      perCommand.set(name, commandStat)

      const userStat = perUser.get(user) ?? { userId: user, usages: 0, successes: 0, points: 0 }
      userStat.usages += 1
      userStat.successes += usage.outcome === 'success' || usage.success ? 1 : 0
      userStat.points += points
      perUser.set(user, userStat)

      const dayStat = perDay.get(day) ?? { date: day, usages: 0, points: 0 }
      dayStat.usages += 1
      dayStat.points += points
      perDay.set(day, dayStat)
    }

    return Response.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      period,
      totals: {
        filtered: usages.totalDocs,
        allTime: totalCommands.totalDocs,
        successes,
        errors: usages.docs.length - successes,
        uniqueUsers: perUser.size,
        points: [...perUser.values()].reduce((sum, entry) => sum + entry.points, 0),
      },
      perCommand: [...perCommand.values()].sort((a, b) => b.usages - a.usages).slice(0, 20),
      perUser: [...perUser.values()].sort((a, b) => b.points - a.points).slice(0, 10),
      daily: [...perDay.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))),
      leaderboard: (topProfiles.docs as Doc[]).map((doc) => ({
        userId: doc.discordId,
        username: doc.username,
        points: doc.points,
        level: doc.level,
        totalUsages: doc.totalUsages,
        streak: doc.streak,
      })),
      profile: (memberProfile.docs as Doc[])[0]
        ? (() => {
            const doc = (memberProfile.docs as Doc[])[0]!
            return {
              username: doc.username,
              points: doc.points ?? 0,
              level: doc.level ?? 1,
              xp: doc.xp ?? 0,
              totalUsages: doc.totalUsages ?? 0,
              successUsages: doc.successUsages ?? 0,
              streak: doc.streak ?? 0,
              bestStreak: doc.bestStreak ?? 0,
              favoriteCommand: doc.favoriteCommand ?? null,
              badges: Array.isArray(doc.badges) ? doc.badges : [],
            }
          })()
        : null,
      loyalty: (settings as Doc | null)?.loyalty ?? {},
    })
  },
}
