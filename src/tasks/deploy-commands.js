const path = require("node:path");
const { REST, Routes } = require("discord.js");
const { getEnv } = require("../config/env");
const { loadCommands } = require("../utils/loaders");
const { createLogger, setLevel } = require("../services/logger");

const log = createLogger("deploy");

/** Déploie les commandes sur le serveur de test (ou globalement). */
async function run({ global: globalCommands = false } = {}) {
  const env = getEnv();
  setLevel(env.LOG_LEVEL);

  const commands = [...loadCommands(path.join(__dirname, "..", "commands")).values()].map((command) =>
    command.data.toJSON()
  );

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const route = globalCommands
    ? Routes.applicationCommands(env.CLIENT_ID)
    : Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID);

  log.info(`Déploiement de ${commands.length} commande(s) ${globalCommands ? "globale(s)" : "sur le serveur de test"}...`);
  const deployed = await rest.put(route, { body: commands });
  log.info(`✅ ${deployed.length} commande(s) déployée(s).`);
  return { deployed: deployed.length };
}

if (require.main === module) {
  run({ global: process.argv.includes("--global") }).catch((error) => {
    log.error("Échec du déploiement", error);
    process.exitCode = 1;
  });
}

module.exports = { run };
