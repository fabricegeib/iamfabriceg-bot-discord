const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { keyless } = require("../../services/providers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deals")
    .setDescription("Bons plans et giveaways de jeux vidéo")
    .setDescriptionLocalizations({ fr: "Bons plans et giveaways de jeux vidéo" })
    .addStringOption((option) =>
      option
        .setName("source")
        .setDescription("Type d'offre")
        .addChoices(
          { name: "Bons plans Steam", value: "deals" },
          { name: "Jeux gratuits", value: "free" },
          { name: "Giveaways", value: "giveaways" }
        )
    ),

  cooldown: 5000,

  async execute(interaction) {
    await interaction.deferReply();
    const source = interaction.options.getString("source") || "deals";

    if (source === "free") {
      const games = await keyless.freeToGame();
      const embed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("🆓 Jeux gratuits")
        .addFields(games.slice(0, 8).map((game) => ({ name: game.title, value: `${game.genre} · [Jouer](${game.url})`, inline: true })))
        .setFooter({ text: "Source : FreeToGame API" });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (source === "giveaways") {
      const giveaways = await keyless.giveaways();
      const embed = new EmbedBuilder()
        .setColor(0xf59e0b)
        .setTitle("🎁 Giveaways en cours")
        .addFields(
          giveaways.map((item) => ({
            name: `${item.title} — ${item.worth || "gratuit"}`,
            value: `${item.platform} · finit le ${item.expires || "?"} · [Participer](${item.url})`,
          }))
        )
        .setFooter({ text: "Source : GamerPower" });
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const deals = await keyless.cheapSharkDeals();
    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9)
      .setTitle("💸 Meilleures offres Steam")
      .addFields(
        deals.map((deal) => ({
          name: `${deal.title} — -${deal.discount}%`,
          value: `${deal.salePrice} € au lieu de ${deal.normalPrice} € · ${deal.rating || "—"} · [Voir](${deal.url})`,
        }))
      )
      .setFooter({ text: "Source : CheapShark" });
    await interaction.editReply({ embeds: [embed] });
  },
};
