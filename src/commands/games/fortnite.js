const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { fortnite } = require("../../services/providers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fortnite")
    .setDescription("Fortnite shop, news and player stats")
    .setDescriptionLocalizations({ fr: "Boutique, actus et stats Fortnite. Ex. : /fortnite shop" })
    .addSubcommand((sub) => sub.setName("shop").setDescription("Current item shop (e.g. /fortnite shop)").setDescriptionLocalizations({ fr: "Boutique actuelle (ex. : /fortnite shop)" }))
    .addSubcommand((sub) =>
      sub
        .setName("news")
        .setDescription("Latest game news (e.g. /fortnite news mode:br)")
        .setDescriptionLocalizations({ fr: "Actualités du jeu (ex. : /fortnite news mode:br)" })
        .addStringOption((option) =>
          option
            .setName("mode")
            .setDescription("Game mode (e.g. br)")
            .setDescriptionLocalizations({ fr: "Mode de jeu (ex. : br)" })
            .setRequired(true)
            .addChoices(
              { name: "Battle Royale", nameLocalizations: { fr: "Battle Royale" }, value: "br" },
              { name: "Save the World", nameLocalizations: { fr: "Save the World" }, value: "stw" },
              { name: "Creative", nameLocalizations: { fr: "Creative" }, value: "creative" }
            )
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("Stats d'un joueur (ex. : /fortnite stats joueur:iamfabriceg)")
        .setDescriptionLocalizations({ fr: "Stats d'un joueur (ex. : /fortnite stats joueur:iamfabriceg)" })
        .addStringOption((option) =>
          option
            .setName("joueur")
            .setDescription("Pseudo du joueur (ex. : iamfabriceg)")
            .setDescriptionLocalizations({ fr: "Pseudo du joueur (ex. : iamfabriceg)" })
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("compte")
            .setDescription("Account platform (default: Epic)")
            .setDescriptionLocalizations({ fr: "Plateforme du compte (défaut : Epic)" })
            .addChoices(
              { name: "Epic", nameLocalizations: { fr: "Epic" }, value: "epic" },
              { name: "PlayStation", nameLocalizations: { fr: "PlayStation" }, value: "psn" },
              { name: "Xbox", nameLocalizations: { fr: "Xbox" }, value: "xbl" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("periode")
            .setDescription("Season or lifetime (default: season)")
            .setDescriptionLocalizations({ fr: "Saison ou total (défaut : saison, repli auto sur total)" })
            .addChoices(
              { name: "Saison en cours", nameLocalizations: { fr: "Saison en cours" }, value: "season" },
              { name: "Depuis le début (total)", nameLocalizations: { fr: "Depuis le début (total)" }, value: "lifetime" }
            )
        )
    ),

  cooldown: 4000,

  examples: ["/fortnite shop","/fortnite news mode:br","/fortnite stats joueur:iamfabriceg periode:lifetime"],

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
      interaction.options.getString("compte") || "epic",
      interaction.options.getString("periode") || "season"
    );
    const periodeLabel = stats.window === "lifetime" ? "Depuis le début (total)" : "Saison en cours";
    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(`📈 Statistiques Fortnite — ${stats.name}`)
      .setDescription(
        stats.fallback
          ? "Aucune partie jouée cette saison : affichage des statistiques **depuis le début**."
          : `Période : **${periodeLabel}**.`
      )
      .addFields(
        { name: "Niveau", value: String(stats.level ?? "—"), inline: true },
        { name: "Victoires", value: String(stats.wins), inline: true },
        { name: "Éliminations", value: String(stats.kills), inline: true },
        { name: "Parties", value: String(stats.matches), inline: true },
        { name: "K/D", value: String(stats.kd), inline: true },
        { name: "Taux de victoire", value: `${stats.winRate}%`, inline: true }
      )
      .setFooter({ text: `Source : fortnite-api.com · ${periodeLabel}` });
    if (stats.image) embed.setThumbnail(stats.image);
    await interaction.editReply({ embeds: [embed] });
  },
};
