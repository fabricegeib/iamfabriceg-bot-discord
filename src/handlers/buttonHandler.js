const { EmbedBuilder, MessageFlags } = require("discord.js");
const { byKey } = require("../config/games");
const { toggleRole } = require("../utils/roleHandler");
const {
  friendlyMessage,
  respondError,
  isExpiredInteraction,
  isAlreadyAcknowledged,
} = require("./error");
const { createLogger } = require("../services/logger");
const { trackUsage } = require("../services/analytics");

const log = createLogger("button");

const COMMAND_BY_ACTION = { role: "roles", game: "games" };

module.exports = async (interaction) => {
  const [action, value] = interaction.customId.split(":");
  const track = (outcome, extra = {}) =>
    trackUsage({
      commandName: COMMAND_BY_ACTION[action] || action || "button",
      userId: interaction.user?.id,
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId || undefined,
      source: "button",
      outcome,
      options: { customId: interaction.customId },
      ...extra,
    });

  try {
    if (action === "role" && value) {
      await toggleRole(interaction, value);
      track("success");
      return;
    }

    if (action === "game" && value) {
      const game = byKey.get(value);
      if (!game) {
        await respondError(interaction, "Jeu introuvable dans le catalogue.");
        return;
      }
      const embed = new EmbedBuilder()
        .setColor(game.color)
        .setTitle(`${game.emoji} ${game.name}`)
        .setDescription(`${game.category}${game.added ? ` · ajouté en ${game.added}` : ""}`)
        .addFields({ name: "Commandes liées", value: "/games info · /pokemon · /fortnite · /riot · /steam" });
      if (game.links?.site) embed.setURL(game.links.site);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      track("success");
      return;
    }

    log.debug(`Bouton non géré : ${interaction.customId}`);
  } catch (error) {
    const expired = isExpiredInteraction(error) || isAlreadyAcknowledged(error);
    track("error", { errorType: expired ? "expired" : "error" });
    if (expired) {
      log.debug(`Bouton expiré : ${interaction.customId}`);
      return;
    }
    log.error(`Erreur sur le bouton ${interaction.customId}`, error);
    await respondError(interaction, friendlyMessage(error), { cause: error });
  }
};
