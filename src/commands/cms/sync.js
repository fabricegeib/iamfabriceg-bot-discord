const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");
const { requirePayloadClient } = require("../../services/payload");
const { games } = require("../../config/games");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sync")
    .setDescription("Sync games from Payload CMS")
    .setDescriptionLocalizations({ fr: "Synchronise les jeux depuis Payload CMS. Ex. : /sync" })
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  cooldown: 30_000,

  examples: ["/sync"],

  async execute(interaction) {
    const client = requirePayloadClient();
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const docs = await client.getGames();
    const merged = await client.syncGames(games);

    const embed = new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle("🔄 Synchronisation terminée")
      .addFields(
        { name: "Documents CMS", value: String(docs.length), inline: true },
        { name: "Jeux au total", value: String(merged.length), inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
