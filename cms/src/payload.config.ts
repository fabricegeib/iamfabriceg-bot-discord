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

export default buildConfig({
  admin: {
    user: Users.slug,
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
    url: process.env.DATABASE_URI || 'mongodb://127.0.0.1:27017/iamfabriceg',
  }),
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-me',
  serverURL: process.env.PAYLOAD_URL || 'http://localhost:3001',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  endpoints: [...botEndpoints],
  plugins: [],
  sharp,
})
