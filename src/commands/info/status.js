const { EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const { shared: cache } = require("../../services/cache");
const { status: providerStatus } = require("../../services/providers");
const { createPayloadClient } = require("../../services/payload");
const { games } = require("../../config/games");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("Affiche l'état du bot et des intégrations")
    .setDescriptionLocalizations({ fr: "Affiche l'état du bot et des intégrations" }),

  async execute(interaction) {
    const started = Math.floor((Date.now() - interaction.client.readyAt.getTime()) / 1000);
    const uptime = `${Math.floor(started / 86400)}j ${Math.floor((started % 86400) / 3600)}h ${Math.floor((started % 3600) / 60)}m`;
    const cacheStats = cache.stats();
    const payload = createPayloadClient();

    const embed = new EmbedBuilder()
      .setColor(0x0ea5e9)
      .setTitle("📊 État du bot")
      .addFields(
        { name: "Uptime", value: uptime, inline: true },
        { name: "Websocket", value: `${interaction.client.ws.ping} ms`, inline: true },
        { name: "Serveurs", value: String(interaction.client.guilds.cache.size), inline: true },
        { name: "Jeux", value: `${games.length} dans le catalogue`, inline: true },
        { name: "Cache", value: `${cacheStats.valid} entrée(s) valide(s)`, inline: true },
        { name: "Payload CMS", value: payload ? (payload.isReadOnly ? "Lecture seule" : "Lecture + écriture") : "Non configuré", inline: true }
      )
      .setDescription(
        "**Intégrations**\n" +
          providerStatus()
            .map((item) => `${item.enabled ? "✅" : "⬜"} ${item.name}`)
            .join("\n")
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
