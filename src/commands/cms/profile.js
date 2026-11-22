const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { requirePayloadClient } = require("../../services/payload");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profil")
    .setDescription("Lie ou met à jour votre profil dans le CMS")
    .setDescriptionLocalizations({ fr: "Lie ou met à jour votre profil dans le CMS" })
    .addStringOption((option) =>
      option.setName("pseudo").setDescription("Votre pseudo sur le site").setDescriptionLocalizations({ fr: "Votre pseudo sur le site" })
    ),

  cooldown: 10_000,

  async execute(interaction) {
    const client = requirePayloadClient();
    await interaction.deferReply({ ephemeral: true });

    const result = await client.upsertDiscordProfile(interaction.user.id, {
      username: interaction.options.getString("pseudo") || interaction.user.username,
      discordUsername: interaction.user.tag,
    });

    const embed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setTitle("✅ Profil synchronisé")
      .setDescription(`Discord ID : \`${interaction.user.id}\``)
      .addFields({ name: "Réponse CMS", value: JSON.stringify(result).slice(0, 900) })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
