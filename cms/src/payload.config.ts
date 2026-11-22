import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Commands } from './collections/Commands'
import { CommandUsages } from './collections/CommandUsages'
import { DiscordRoles } from './collections/DiscordRoles'
import { Events } from './collections/Events'
import { Games } from './collections/Games'
import { Media } from './collections/Media'
import { News } from './collections/News'
import { Profiles } from './collections/Profiles'
import { StreamAlerts } from './collections/StreamAlerts'
import { Users } from './collections/Users'
import { WebhookEvents } from './collections/WebhookEvents'
import { botEndpoints } from './endpoints/bot-summary'
import { BotSettings } from './globals/BotSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/**
 * `PAYLOAD_URL` est l'URL interne service-à-service (le bot appelle `http://cms:3001`).
 * Le navigateur utilise une autre origine (`http://localhost:31001` en local, le
 * domaine public en prod). Payload ajoute automatiquement `serverURL` à `csrf`,
 * mais ignore le cookie de session si l'origine de la requête n'y figure pas :
 * tous les POST de l'admin échouent alors en 401/403 (spinner infini).
 */
const publicURL = process.env.PAYLOAD_PUBLIC_URL || 'http://localhost:31001'

export default buildConfig({
  admin: {
    user: Users.slug,
    dashboard: {
      defaultLayout: [
        { widgetSlug: 'bot-overview', width: 'full' },
        { widgetSlug: 'bot-actions', width: 'full' },
      ],
      widgets: [
        {
          slug: 'bot-overview',
          Component: '@/components/admin/BotOverviewWidget',
          label: 'Statistiques du bot',
          minWidth: 'medium',
        },
        {
          slug: 'bot-actions',
          Component: '@/components/admin/BotActionsWidget',
          label: 'Actions rapides',
          minWidth: 'medium',
        },
      ],
    },
    components: {
      views: {
        stats: {
          Component: '@/components/admin/BotStatsView#BotStatsView',
          path: '/stats',
          exact: true,
        },
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    Users,
    Games,
    Commands,
    CommandUsages,
    DiscordRoles,
    Events,
    News,
    StreamAlerts,
    WebhookEvents,
    Profiles,
    Media,
  ],
  globals: [BotSettings],
  editor: lexicalEditor(),
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || 'mongodb://127.0.0.1:31017/iamfabriceg_bot',
  }),
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-me',
  serverURL: process.env.PAYLOAD_URL || 'http://localhost:31001',
  csrf: [publicURL, 'http://localhost:31001', 'http://127.0.0.1:31001'],
  cors: [publicURL],
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  endpoints: [...botEndpoints],
  plugins: [],
  sharp,
})
