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

const log = createLogger("button");

module.exports = async (interaction) => {
  const [action, value] = interaction.customId.split(":");

  try {
    if (action === "role" && value) {
      await toggleRole(interaction, value);
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
      return;
    }

    log.debug(`Bouton non géré : ${interaction.customId}`);
  } catch (error) {
    if (isExpiredInteraction(error) || isAlreadyAcknowledged(error)) {
      log.debug(`Bouton expiré : ${interaction.customId}`);
      return;
    }
    log.error(`Erreur sur le bouton ${interaction.customId}`, error);
    await respondError(interaction, friendlyMessage(error), { cause: error });
  }
};
