const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { fortnite } = require("../../services/providers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fortnite")
    .setDescription("Informations Fortnite en direct")
    .setDescriptionLocalizations({ fr: "Informations Fortnite en direct" })
    .addSubcommand((sub) => sub.setName("shop").setDescription("Boutique actuelle").setDescriptionLocalizations({ fr: "Boutique actuelle" }))
    .addSubcommand((sub) =>
      sub
        .setName("news")
        .setDescription("Actualités du jeu")
        .setDescriptionLocalizations({ fr: "Actualités du jeu" })
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Mode de jeu")
            .setRequired(true)
            .addChoices(
              { name: "Battle Royale", value: "br" },
              { name: "Save the World", value: "stw" },
              { name: "Creative", value: "creative" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("Statistiques d'un joueur")
        .setDescriptionLocalizations({ fr: "Statistiques d'un joueur" })
        .addStringOption((option) => option.setName("joueur").setDescription("Pseudo Epic Games").setRequired(true))
        .addStringOption((option) =>
          option
            .setName("compte")
            .setDescription("Plateforme du compte")
            .addChoices(
              { name: "Epic", value: "epic" },
              { name: "PlayStation", value: "psn" },
              { name: "Xbox", value: "xbl" }
            )
        )
    ),

  cooldown: 4000,

  async execute(interaction) {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "shop") {
      const shop = await fortnite.getShop();
      const embed = new EmbedBuilder()
        .setColor(0x8b5cf6)
        .setTitle("🛒 Boutique Fortnite")
        .setDescription(`${shop.total} objets disponibles · ${shop.date ? new Date(shop.date).toLocaleDateString("fr-FR") : ""}`)
        .addFields(
          shop.entries.slice(0, 8).map((entry) => ({
            name: `${entry.emoji || "🎁"} ${entry.name} — ${entry.price} V-Bucks`,
            value: `${entry.kind}${entry.rarity !== "—" ? ` · ${entry.rarity}` : ""}`,
            inline: true,
          }))
        )
        .setFooter({ text: "Source : fortnite-api.com" });
      if (shop.entries[0]?.image) embed.setImage(shop.entries[0].image);
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (subcommand === "news") {
      const news = await fortnite.getNews(interaction.options.getString("mode"));
      const embeds = news.articles.slice(0, 3).map(
        (article) =>
          new EmbedBuilder()
            .setColor(0x6366f1)
            .setTitle(article.title)
            .setDescription(article.body || "")
            .setImage(article.image || null)
            .setFooter({ text: "Source : fortnite-api.com" })
      );
      await interaction.editReply({ embeds });
      return;
    }

    const stats = await fortnite.getStats(
      interaction.options.getString("joueur"),
      interaction.options.getString("compte") || "epic"
    );
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`📈 Statistiques Fortnite — ${stats.name}`)
      .addFields(
        { name: "Niveau", value: String(stats.level ?? "—"), inline: true },
        { name: "Victoires", value: String(stats.wins), inline: true },
        { name: "Éliminations", value: String(stats.kills), inline: true },
        { name: "Parties", value: String(stats.matches), inline: true },
        { name: "K/D", value: String(stats.kd), inline: true },
        { name: "Taux de victoire", value: `${stats.winRate}%`, inline: true }
      )
      .setFooter({ text: "Source : fortnite-api.com" });
    if (stats.image) embed.setThumbnail(stats.image);
    await interaction.editReply({ embeds: [embed] });
  },
};
