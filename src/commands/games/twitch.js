const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { twitch } = require("../../services/providers");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("twitch")
    .setDescription("Check a Twitch channel status")
    .setDescriptionLocalizations({ fr: "Affiche le statut d'une chaîne Twitch. Ex. : /twitch chaine:iamfabriceg" })
    .addStringOption((option) => option.setName("chaine").setDescription("Channel name (e.g. iamfabriceg)").setDescriptionLocalizations({ fr: "Nom de la chaîne (ex. : iamfabriceg)" }).setRequired(true)),

  cooldown: 4000,

  examples: ["/twitch chaine:iamfabriceg"],

  async execute(interaction) {
    await interaction.deferReply();
    const status = await twitch.getChannelStatus(interaction.options.getString("chaine"));

    const embed = new EmbedBuilder()
      .setColor(status.live ? 0x9146ff : 0x5865f2)
      .setTitle(`${status.live ? "🔴 EN DIRECT" : "⚫ Hors ligne"} — ${status.displayName}`)
      .setURL(status.url)
      .setDescription(status.live ? status.title : "Cette chaîne n'est pas en direct.");

    if (status.live) {
      embed.addFields(
        { name: "Jeu", value: status.game || "—", inline: true },
        { name: "Spectateurs", value: String(status.viewers ?? 0), inline: true }
      );
      if (status.thumbnail) embed.setImage(status.thumbnail);
    }
    if (status.avatar) embed.setThumbnail(status.avatar);
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
