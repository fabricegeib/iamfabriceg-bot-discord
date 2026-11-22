const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Vérifie la latence du bot")
    .setDescriptionLocalizations({ fr: "Vérifie la latence du bot" }),

  async execute(interaction) {
    await interaction.deferReply();
    const reply = await interaction.fetchReply();
    const clientPing = reply.createdTimestamp - interaction.createdTimestamp;

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle("🏓 Pong !")
      .addFields(
        { name: "Client", value: `${clientPing} ms`, inline: true },
        { name: "Websocket", value: `${interaction.client.ws.ping} ms`, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
