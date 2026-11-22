const { getEnv } = require("../config/env");
const { subscribeToChannel } = require("../services/twitch-eventsub");
const { createLogger, setLevel } = require("../services/logger");

const log = createLogger("twitch-sub");

async function main() {
  const env = getEnv();
  setLevel(env.LOG_LEVEL);

  if (!env.PUBLIC_URL) throw new Error("PUBLIC_URL est requis pour recevoir les callbacks EventSub.");

  const channel = process.argv[2] || "iamfabriceg";
  const callback = `${env.PUBLIC_URL.replace(/\/+$/, "")}/webhooks/twitch`;
  const subscriptions = await subscribeToChannel(channel, callback);

  for (const subscription of subscriptions) {
    log.info(`Abonnement ${subscription?.status || "créé"} : ${subscription?.type || "?"}`);
  }
}

main().catch((error) => {
  log.error("Impossible de créer les abonnements Twitch", error);
  process.exit(1);
});
