const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { steam } = require("../../services/providers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("steam")
    .setDescription("Show a Steam profile and owned games")
    .setDescriptionLocalizations({ fr: "Affiche un profil Steam et ses jeux. Ex. : /steam identifiant:76561198000000000" })
    .addStringOption((option) =>
      option.setName("identifiant").setDescription("SteamID or custom URL (e.g. 76561198000000000)").setDescriptionLocalizations({ fr: "SteamID ou URL personnalisée (ex. : 76561198000000000)" }).setRequired(true)
    ),

  cooldown: 4000,

  examples: ["/steam identifiant:76561198000000000"],

  async execute(interaction) {
    await interaction.deferReply();
    const identifier = interaction.options.getString("identifiant");
    const [player, owned] = await Promise.all([
      steam.getPlayerSummary(identifier),
      steam.getOwnedGames(identifier),
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x1b2838)
      .setTitle(`🎮 ${player.name}`)
      .setURL(player.profileUrl)
      .setDescription(`Statut : ${player.status}${player.country ? ` · ${player.country}` : ""}`)
      .addFields(
        { name: "SteamID", value: player.steamId, inline: true },
        { name: "Jeux possédés", value: String(owned.count), inline: true },
        {
          name: "Jeux les plus joués",
          value: owned.games.length
            ? owned.games.map((game) => `${game.name} — ${game.hours}h`).join("\n")
            : "Aucun jeu public",
        }
      )
      .setFooter({ text: "Source : Steam Web API" })
      .setTimestamp();
    if (player.avatar) embed.setThumbnail(player.avatar);

    await interaction.editReply({ embeds: [embed] });
  },
};
