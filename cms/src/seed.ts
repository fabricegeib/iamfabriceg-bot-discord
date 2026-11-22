import 'dotenv/config'

import { randomBytes } from 'node:crypto'

import { getPayload } from 'payload'

import config from './payload.config'
import commandCatalog from './data/command-catalog.json'

const BOT_EMAIL = 'bot@iamfabriceg.local'
const BOT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin1234!'
const DISCORD_INVITE =
  process.env.DISCORD_INVITE_URL ||
  'https://discord.com/oauth2/authorize?client_id=580073418968530973&permissions=1099780410374&scope=bot%20applications.commands'

type SeedDoc = Record<string, any>

const SEED_GAMES = [
  {
    key: 'fortnite',
    slug: 'fortnite',
    title: 'Fortnite',
    description: 'Battle royale, saisons, shops et tournois.',
    category: 'Battle royale',
    emoji: '🎯',
    discordRoleId: '',
    search: 'fortnite epic games battle royale',
    featured: true,
    order: 1,
  },
  {
    key: 'gta-v',
    slug: 'gta-v',
    title: 'Grand Theft Auto V',
    description: 'GTA Online, missions, business et roleplay.',
    category: 'Action / Aventure',
    emoji: '🚗',
    discordRoleId: '',
    search: 'gta grand theft auto v online rockstar',
    featured: true,
    order: 2,
  },
  {
    key: 'rocket-league',
    slug: 'rocket-league',
    title: 'Rocket League',
    description: 'Football automobile en 1v1, 2v2 et 3v3.',
    category: 'Sport',
    emoji: '⚽',
    discordRoleId: '',
    search: 'rocket league psyonix football car',
    featured: false,
    order: 3,
  },
  {
    key: 'aniimo',
    slug: 'aniimo',
    title: 'Aniimo',
    description: 'ARPG open-world F2P : capture et fusion de créatures.',
    category: 'RPG',
    emoji: '🐾',
    discordRoleId: '',
    search: 'aniimo pawprint studio arpg',
    featured: true,
    order: 4,
  },
  {
    key: 'goals',
    slug: 'goals',
    title: 'GOALS',
    description: 'Football F2P crossplay, matchs 1v1 et 5v5.',
    category: 'Sport',
    emoji: '🥅',
    discordRoleId: '',
    search: 'goals goals ab football f2p',
    featured: true,
    order: 5,
  },
]

// Une seule source de vérité : le catalogue généré depuis les
// SlashCommandBuilder réels du bot (`pnpm cms:catalog`).
const SEED_COMMANDS: SeedDoc[] = commandCatalog.commands.map((command) => ({
  name: command.name,
  description: command.description,
  descriptionEn: command.descriptionEn,
  category: command.category,
  aliases: command.aliases,
  usage: command.usage,
  examples: command.examples.map((example) => ({ example })),
  cooldown: command.cooldown,
  permissions: command.permissions,
  enabled: command.enabled,
  adminOnly: command.adminOnly,
  options: command.options,
}))

async function upsertUser(payload: any) {
  const found = await payload.find({
    collection: 'users',
    limit: 1,
    where: { email: { equals: BOT_EMAIL } },
    overrideAccess: true,
  })

  const data = {
    email: BOT_EMAIL,
    password: BOT_PASSWORD,
    role: 'admin',
    displayName: 'Bot',
  }

  if (found.docs.length > 0) {
    const user = await payload.update({
      collection: 'users',
      id: found.docs[0]!.id,
      data,
      overrideAccess: true,
      context: { skipBotWebhook: true },
    })
    return user.id
  }

  const user = await payload.create({
    collection: 'users',
    data,
    overrideAccess: true,
    context: { skipBotWebhook: true },
  })
  return user.id
}

async function generateAPIKey(payload: any, userId: string | number) {
  // En Payload v3, il n'existe PAS de collection `api-keys` : la clé est un
  // champ `apiKey` de la collection d'authentification (via auth.useAPIKey).
  const apiKey = randomBytes(32).toString('hex')

  await payload.update({
    collection: 'users',
    id: userId,
    data: { enableAPIKey: true, apiKey },
    overrideAccess: true,
    context: { skipBotWebhook: true },
  })

  console.log('PAYLOAD_API_KEY=' + apiKey)
  return apiKey
}

async function seedGames(payload: any) {
  const ids: Record<string, string | number> = {}

  for (const game of SEED_GAMES) {
    const found = await payload.find({
      collection: 'games',
      limit: 1,
      where: { key: { equals: game.key } },
      overrideAccess: true,
    })

    if (found.docs.length > 0) {
      const updated = await payload.update({
        collection: 'games',
        id: found.docs[0]!.id,
        data: { ...game, published: true },
        overrideAccess: true,
        context: { skipBotWebhook: true },
      })
      ids[game.key] = updated.id
    } else {
      const created = await payload.create({
        collection: 'games',
        data: { ...game, published: true },
        overrideAccess: true,
        context: { skipBotWebhook: true },
      })
      ids[game.key] = created.id
    }
  }

  return ids
}

async function seedCommands(
  payload: any,
  gameIds: Record<string, string | number>,
) {
  for (const command of SEED_COMMANDS) {
    const found = await payload.find({
      collection: 'commands',
      limit: 1,
      where: { name: { equals: command.name } },
      overrideAccess: true,
    })

    const data: SeedDoc = {
      ...command,
      game: command.name === 'fortnite' ? (gameIds.fortnite ?? null) : null,
    }

    if (found.docs.length > 0) {
      await payload.update({
        collection: 'commands',
        id: found.docs[0]!.id,
        data,
        overrideAccess: true,
        context: { skipBotWebhook: true },
      })
    } else {
      await payload.create({
        collection: 'commands',
        data,
        overrideAccess: true,
        context: { skipBotWebhook: true },
      })
    }
  }
}

async function seedSettings(payload: any) {
  await payload.updateGlobal({
    slug: 'botSettings',
    data: {
      botName: 'iamfabriceg Bot',
      description: 'Bot Discord multijeux avec catalogue Payload CMS.',
      version: '1.1.0',
      publicUrl: process.env.PAYLOAD_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:3001',
      discordInvite: DISCORD_INVITE,
      maintenanceMode: false,
      loyalty: {
        enabled: true,
        pointsPerUsage: 1,
        successBonus: 1,
        streakBonus: 2,
        levelThresholds: [0, 10, 30, 60, 100, 200],
      },
      socialLinks: [
        { label: 'GitHub', url: 'https://github.com/fabricegeib/iamfabriceg-bot-discord' },
        { label: 'Twitch', url: 'https://www.twitch.tv/iamfabriceg' },
      ],
      features: {
        games: true,
        pokemon: true,
        fortnite: true,
        riot: true,
        steam: true,
        deals: true,
        twitch: true,
        moderation: true,
      },
    },
    overrideAccess: true,
  })
}

async function main() {
  const payload = await getPayload({ config })

  const userId = await upsertUser(payload)
  await generateAPIKey(payload, userId)
  const gameIds = await seedGames(payload)
  await seedCommands(payload, gameIds)
  await seedSettings(payload)

  console.log('Seed Payload terminé.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed Payload échoué:', error)
    process.exit(1)
  })
