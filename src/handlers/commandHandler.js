const { createLogger } = require("../services/logger");
const { shared: cooldowns } = require("./cooldown");
const { friendlyMessage, respondError } = require("./error");

const log = createLogger("command");

module.exports = async (interaction) => {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    log.warn(`Commande inconnue : ${interaction.commandName}`);
    await respondError(interaction, "Cette commande n'existe plus. Relancez `npm run deploy`.");
    return;
  }

  const remaining = cooldowns.check(interaction.user.id, interaction.commandName, command.cooldown);
  if (remaining > 0) {
    await respondError(interaction, `⏳ Patientez encore ${(remaining / 1000).toFixed(1)}s avant de réutiliser cette commande.`);
    return;
  }

  try {
    await command.execute(interaction);
    log.info(`${interaction.user.tag} a utilisé /${interaction.commandName}`);
  } catch (error) {
    log.error(`Erreur sur /${interaction.commandName}`, error);
    await respondError(interaction, friendlyMessage(error));
  }
};
