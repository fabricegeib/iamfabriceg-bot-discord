const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder().setName("ping-og").setDescription("Replies with Pong!").setDescriptionLocalizations({
    fr: "Répond avec Pong!",
    "es-ES": "¡Responde con Pong!",
    de: "Antwortet mit Pong!",
  }),

  // async execute(interaction) {
  //   await interaction.reply("Pong!");
  // },
  async execute(interaction) {
    await interaction.deferReply();
    const reply = await interaction.fetchReply();

    const ping = reply.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong!\n\n**Client :** ${ping}ms\n**Websocket :** ${interaction.client.ws.ping}ms`);
  },
};
