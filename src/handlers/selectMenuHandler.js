const { createLogger } = require("../services/logger");
const { trackUsage } = require("../services/analytics");
const { pokeapi, rawg, fortnite } = require("../services/providers");
const { stwHeroEmbed } = require("../commands/games/fortnite");
const { byKey } = require("../config/games");
const {
  friendlyMessage,
  respondError,
  isExpiredInteraction,
  isAlreadyAcknowledged,
} = require("./error");

const log = createLogger("select");

/** Construit un embed de fiche Pokémon (également utilisé par /pokemon). */
function pokemonEmbed(pokemon, EmbedBuilder) {
  const embed = new EmbedBuilder()
    .setColor(0xdc2626)
    .setTitle(`${pokemon.displayName} · #${String(pokemon.id).padStart(3, "0")}`)
    .setDescription(pokemon.description || pokemon.genus || "")
    .addFields(
      { name: "Types", value: pokemon.types.join(" / ") || "—", inline: true },
      { name: "Taille", value: `${pokemon.height} m`, inline: true },
      { name: "Poids", value: `${pokemon.weight} kg`, inline: true },
      {
        name: "Statistiques",
        value: pokemon.stats.map((stat) => `${stat.name} : ${stat.value}`).join("\n").slice(0, 1024),
      }
    );
  if (pokemon.artwork) embed.setImage(pokemon.artwork);
  if (pokemon.speciesUrl) embed.setURL(pokemon.speciesUrl);
  return embed;
}

module.exports = async (interaction) => {
  const [action, value] = interaction.customId.split(":");
  const commandName =
    action === "pokemon" || interaction.customId === "starter"
      ? "pokemon"
      : action === "game"
        ? "games"
        : action === "stw"
          ? "fortnite"
          : action || "selectMenu";
  const track = (outcome, extra = {}) =>
    trackUsage({
      commandName,
      userId: interaction.user?.id,
      guildId: interaction.guildId || undefined,
      channelId: interaction.channelId || undefined,
      source: "selectMenu",
      outcome,
      options: { customId: interaction.customId, values: interaction.values || [] },
      ...extra,
    });

  try {
    if (action === "pokemon" || interaction.customId === "starter") {
      await interaction.deferUpdate();
      const query = (interaction.values?.[0] || value || "").replace(/^pokemon:/, "");
      const pokemon = await pokeapi.getPokemon(query);
      const { EmbedBuilder } = require("discord.js");
      await interaction.editReply({ embeds: [pokemonEmbed(pokemon, EmbedBuilder)] });
      log.info(`${interaction.user.tag} a consulté ${pokemon.name}`);
      track("success");
      return;
    }

    if (action === "game") {
      await interaction.deferUpdate();
      const game = byKey.get(interaction.values?.[0] || value);
      if (!game) throw new Error("Jeu introuvable.");
      const detail = await rawg.getForCatalogGame(game);
      const { EmbedBuilder } = require("discord.js");
      const embed = new EmbedBuilder()
        .setColor(game.color)
        .setTitle(detail.name)
        .setDescription(detail.description || game.category)
        .addFields(
          { name: "Genres", value: detail.genres.join(", ") || "—", inline: true },
          { name: "Note RAWG", value: detail.rating ? `${detail.rating}/5` : "—", inline: true },
          { name: "Plateformes", value: detail.platforms.join(", ").slice(0, 1024) || "—" }
        )
        .setFooter({ text: rawg.ATTRIBUTION });
      if (detail.image) embed.setImage(detail.image);
      if (detail.website) embed.setURL(detail.website);
      await interaction.editReply({ embeds: [embed] });
      track("success");
      return;
    }

    if (action === "stw") {
      await interaction.deferUpdate();
      const hero = await fortnite.getStwHero(interaction.values?.[0] || value);
      await interaction.editReply({ embeds: [stwHeroEmbed(hero)] });
      log.info(`${interaction.user.tag} a consulté le héros STW ${hero.displayName}`);
      track("success");
      return;
    }

    log.debug(`Menu non géré : ${interaction.customId}`);
  } catch (error) {
    const expired = isExpiredInteraction(error) || isAlreadyAcknowledged(error);
    track("error", { errorType: expired ? "expired" : "error" });
    if (expired) {
      log.debug(`Menu expiré : ${interaction.customId}`);
      return;
    }
    log.error("Erreur sur un menu de sélection", error);
    await respondError(interaction, friendlyMessage(error), { cause: error });
  }
};

module.exports.pokemonEmbed = pokemonEmbed;
