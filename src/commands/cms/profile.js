const { EmbedBuilder, SlashCommandBuilder, MessageFlags } = require("discord.js");
const { requirePayloadClient } = require("../../services/payload");

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

    const embed = new EmbedBuilder()
      .setColor(0x16a34a)
      .setTitle("✅ Profil synchronisé")
      .setDescription(`Discord ID : \`${interaction.user.id}\``)
      .addFields({ name: "Réponse CMS", value: JSON.stringify(result).slice(0, 900) })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
