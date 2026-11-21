const { EmbedBuilder, SlashCommandBuilder, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");
const { games, findGame, roleIdFor } = require("../../config/games");
const { rawg } = require("../../services/providers");
const { getEnv } = require("../../config/env");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("games")
    .setDescription("Catalogue des jeux du serveur")
    .setDescriptionLocalizations({ fr: "Catalogue des jeux du serveur" })
    .addSubcommand((sub) => sub.setName("list").setDescription("Affiche tous les jeux").setDescriptionLocalizations({ fr: "Affiche tous les jeux" }))
    .addSubcommand((sub) =>
      sub
        .setName("info")
        .setDescription("Fiche détaillée d'un jeu")
        .setDescriptionLocalizations({ fr: "Fiche détaillée d'un jeu" })
        .addStringOption((option) =>
          option
            .setName("jeu")
            .setDescription("Nom du jeu")
            .setDescriptionLocalizations({ fr: "Nom du jeu" })
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) => sub.setName("roles").setDescription("Liste des rôles de jeu").setDescriptionLocalizations({ fr: "Liste des rôles de jeu" })),

  cooldown: 2000,

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused();
    const matches = games
      .filter((game) => game.name.toLowerCase().includes(String(focused).toLowerCase()))
      .slice(0, 25)
      .map((game) => ({ name: `${game.emoji} ${game.name}`, value: game.key }));
    await interaction.respond(matches);
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "list") {
      const grouped = new Map();
      for (const game of games) {
        if (!grouped.has(game.category)) grouped.set(game.category, []);
        grouped.get(game.category).push(`${game.emoji} ${game.name}`);
      }
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🎮 Catalogue des jeux")
        .setDescription(`${games.length} jeux suivis sur ce serveur`)
        .addFields([...grouped.entries()].map(([category, items]) => ({ name: category, value: items.join("\n") })))
        .setFooter({ text: "Utilisez /games info <jeu> pour plus de détails" });

      const select = new StringSelectMenuBuilder()
        .setCustomId("game:select")
        .setPlaceholder("Choisir un jeu")
        .addOptions(games.slice(0, 25).map((game) => ({ label: game.name, value: game.key, emoji: game.emoji })));

      await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] });
      return;
    }

    if (subcommand === "info") {
      await interaction.deferReply();
      const query = interaction.options.getString("jeu");
      const game = findGame(query);
      if (!game) {
        await interaction.editReply(`❌ Jeu « ${query} » introuvable dans le catalogue. Essayez \`/games list\`.`);
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(game.color)
        .setTitle(`${game.emoji} ${game.name}`)
        .setDescription(game.category + (game.added ? ` · ajouté en ${game.added}` : ""));

      const roleId = roleIdFor(game, getEnv());
      if (roleId) embed.addFields({ name: "Rôle Discord", value: `<@&${roleId}>`, inline: true });
      if (game.links?.site) embed.setURL(game.links.site);

      try {
        const detail = await rawg.getForCatalogGame(game);
        if (detail.description) embed.setDescription(detail.description);
        if (detail.image) embed.setImage(detail.image);
        if (detail.rating) embed.addFields({ name: "Note RAWG", value: `${detail.rating}/5`, inline: true });
        if (detail.released) embed.addFields({ name: "Sortie", value: detail.released, inline: true });
        embed.setFooter({ text: rawg.ATTRIBUTION });
      } catch {
        embed.setFooter({ text: "Données du catalogue local" });
      }

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const withRoles = games.filter((game) => roleIdFor(game, getEnv()));
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏷️ Rôles de jeu")
      .setDescription(
        withRoles.length
          ? withRoles.map((game) => `${game.emoji} ${game.name} → <@&${roleIdFor(game, getEnv())}>`).join("\n")
          : "Aucun rôle de jeu configuré. Définissez les IDs dans `.env`."
      )
      .setFooter({ text: "Boutons disponibles via npm run send:roles" });

    await interaction.reply({ embeds: [embed] });
  },
};
