const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prune")
    .setDescription("Supprime plusieurs messages du salon")
    .setDescriptionLocalizations({ fr: "Supprime plusieurs messages du salon" })
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

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const amount = interaction.options.getInteger("nombre");
    const result = await interaction.channel.bulkDelete(amount, true);
    await interaction.editReply(`🧹 ${result.size} message(s) supprimé(s).`);
  },
};
