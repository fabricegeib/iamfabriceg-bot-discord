const path = require("node:path");
const { Client, Collection, EmbedBuilder, GatewayIntentBits } = require("discord.js");
const { getEnv } = require("./config/env");
const { loadCommands, loadEvents } = require("./utils/loaders");
const { createLogger, setLevel } = require("./services/logger");
const { createWebhookServer } = require("./services/webhook-server");
const { handleNotification } = require("./services/twitch-eventsub");

const log = createLogger("bot");

async function main() {
  let env;
  try {
    env = getEnv();
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
  setLevel(env.LOG_LEVEL);

  // GuildMessages est nécessaire pour /prune ; MessageContent (privilégié) n'est pas utilisé.
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });
  client.commands = new Collection();

  client.commands = loadCommands(path.join(__dirname, "commands"));
  loadEvents(path.join(__dirname, "events"), client);

  const announceChannelId = env.ANNOUNCEMENT_CHANNEL_ID || env.LOG_CHANNEL_ID;

  async function onWebhookEvent(type, payload) {
    if (type.startsWith("twitch.")) {
      await handleNotification(type, payload, client);
      return;
    }

    if (!announceChannelId || !payload?.doc) return;
    const channel = await client.channels.fetch(announceChannelId).catch(() => null);
    if (!channel?.isTextBased()) return;

    const doc = payload.doc;
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`📢 ${doc.title || doc.name || "Contenu publié"}`)
      .setDescription(doc.description || doc.excerpt || "Nouveau contenu publié sur le site.")
      .setTimestamp();
    if (env.PAYLOAD_URL && doc.slug) embed.setURL(`${env.PAYLOAD_URL}/${doc.slug}`);
    await channel.send({ embeds: [embed] });
  }

  const webhook = createWebhookServer({
    port: env.PORT,
    secret: env.WEBHOOK_SECRET,
    twitchSecret: env.TWITCH_CLIENT_SECRET,
    onEvent: onWebhookEvent,
  });

  process.on("unhandledRejection", (error) => log.error("Promesse rejetée non gérée", error));
  process.on("uncaughtException", (error) => log.error("Exception non gérée", error));

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info(`Arrêt demandé (${signal})`);
    await webhook.stop();
    client.destroy();
    process.exit(0);
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  await webhook.start();
  await client.login(env.DISCORD_TOKEN);
}

main().catch((error) => {
  log.error("Démarrage impossible", error);
  process.exit(1);
});
