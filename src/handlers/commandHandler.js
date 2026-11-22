const { FeatureDisabledError } = require("../services/errors");
const { createLogger } = require("../services/logger");
const { trackUsage } = require("../services/analytics");
const { shared: cooldowns } = require("./cooldown");
const {
  friendlyMessage,
  respondError,
  isExpiredInteraction,
  isAlreadyAcknowledged,
} = require("./error");

const log = createLogger("command");

function baseData(interaction) {
  return {
    commandName: interaction.commandName,
    userId: interaction.user?.id,
    guildId: interaction.guildId || undefined,
    channelId: interaction.channelId || undefined,
    source: "chatInput",
  };
}

function optionSnapshot(interaction) {
  try {
    return (interaction.options?.data || []).reduce((acc, option) => {
      if (!option?.name || option.value === undefined) return acc;
      const value = option.value;
      acc[option.name] = typeof value === "string" ? value.slice(0, 200) : value;
      return acc;
    }, {});
  } catch {
    return {};
  }
}

function errorTypeOf(error) {
  if (isExpiredInteraction(error)) return "expired";
  if (isAlreadyAcknowledged(error)) return "alreadyAcknowledged";
  if (error instanceof FeatureDisabledError) return "featureDisabled";
  return "error";
}

module.exports = async (interaction) => {
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    log.warn(`Commande inconnue : ${interaction.commandName}`);
    trackUsage({ ...baseData(interaction), outcome: "error", errorType: "unknownCommand" });
    await respondError(interaction, "Cette commande n'existe plus. Relancez `npm run deploy`.");
    return;
  }

  const remaining = cooldowns.check(interaction.user.id, interaction.commandName, command.cooldown);
  if (remaining > 0) {
    trackUsage({ ...baseData(interaction), outcome: "cooldown" });
    await respondError(interaction, `⏳ Patientez encore ${(remaining / 1000).toFixed(1)}s avant de réutiliser cette commande.`);
    return;
  }

  const startedAt = Date.now();
  try {
    await command.execute(interaction);
    log.info(`${interaction.user.tag} a utilisé /${interaction.commandName}`);
    trackUsage({
      ...baseData(interaction),
      outcome: "success",
      durationMs: Date.now() - startedAt,
      subcommand: (() => {
        try {
          return interaction.options.getSubcommand(false) || undefined;
        } catch {
          return undefined;
        }
      })(),
      options: optionSnapshot(interaction),
    });
  } catch (error) {
    // Une commande qui échoue ne doit pas consommer son cooldown : l'utilisateur peut réessayer.
    cooldowns.reset(interaction.user.id, interaction.commandName);
    if (isExpiredInteraction(error) || isAlreadyAcknowledged(error)) {
      log.debug(`Interaction expirée sur /${interaction.commandName}`);
    } else if (error instanceof FeatureDisabledError) {
      log.warn(`Commande désactivée /${interaction.commandName} : ${error.message}`);
    } else {
      log.error(`Erreur sur /${interaction.commandName}`, error);
    }
    trackUsage({
      ...baseData(interaction),
      outcome: "error",
      errorType: errorTypeOf(error),
      durationMs: Date.now() - startedAt,
      subcommand: (() => {
        try {
          return interaction.options.getSubcommand(false) || undefined;
        } catch {
          return undefined;
        }
      })(),
    });
    await respondError(interaction, friendlyMessage(error), { cause: error });
  }
};
