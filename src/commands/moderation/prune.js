const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prune")
    .setDescription("Delete several messages in this channel")
    .setDescriptionLocalizations({ fr: "Supprime des messages du salon. Ex. : /prune nombre:10" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("nombre")
        .setDescription("Nombre de messages à supprimer (1-100)")
        .setDescriptionLocalizations({ fr: "Nombre de messages à supprimer (1-100)" })
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  examples: ["/prune nombre:10"],

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const amount = interaction.options.getInteger("nombre");
    const result = await interaction.channel.bulkDelete(amount, true);
    await interaction.editReply(`🧹 ${result.size} message(s) supprimé(s).`);
  },
};
