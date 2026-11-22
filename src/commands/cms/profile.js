const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require("discord.js");
const { requirePayloadClient } = require("../../services/payload");
const { createLogger } = require("../../services/logger");

const log = createLogger("profile");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Link or update your CMS profile")
    .setDescriptionLocalizations({ fr: "Lie ou met à jour votre profil CMS. Ex. : /profil pseudo:Fabrice" })
    .addStringOption((option) =>
      option.setName("pseudo").setDescription("Your site username (e.g. Fabrice)").setDescriptionLocalizations({ fr: "Votre pseudo sur le site (ex. : Fabrice)" })
    ),

  cooldown: 10_000,

  examples: ["/profil pseudo:Fabrice"],

  async execute(interaction) {
    const client = requirePayloadClient();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await client.upsertDiscordProfile(interaction.user.id, {
      username: interaction.options.getString("pseudo") || interaction.user.username,
      discordUsername: interaction.user.tag,
    });

    let stats = null;
    try {
      const response = await client.getStats({ userId: interaction.user.id });
      stats = response?.profile || null;
    } catch (error) {
      log.debug(`Statistiques indisponibles pour le profil : ${error.message}`);
    }

    const embed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setTitle("✅ Profil synchronisé")
      .setDescription(`Discord ID : \`${interaction.user.id}\``);

    if (stats) {
      embed.addFields({
        name: "📊 Fidélité",
        value: [
          `**Niveau** ${stats.level} · **${stats.points} points**`,
          `Commandes : ${stats.totalUsages} (dont ${stats.successUsages} réussies)`,
          `Série : ${stats.streak} jour(s) · record ${stats.bestStreak}`,
          stats.favoriteCommand ? `Commande favorite : \`/${stats.favoriteCommand}\`` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      });
    } else {
      embed.addFields({ name: "Réponse CMS", value: JSON.stringify(result).slice(0, 900) });
    }

    embed.setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  },
};
