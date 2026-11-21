const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Met un membre en timeout")
    .setDescriptionLocalizations({ fr: "Met un membre en timeout" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName("membre").setDescription("Membre à réduire au silence").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Durée en minutes (1-10080)")
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(true)
    )
    .addStringOption((option) => option.setName("raison").setDescription("Motif")),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const minutes = interaction.options.getInteger("minutes");
    const reason = interaction.options.getString("raison") || `Timeout par ${interaction.user.tag}`;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: "Membre introuvable.", ephemeral: true });
    if (!member.moderatable) return interaction.reply({ content: "Ce membre ne peut pas être mis en timeout.", ephemeral: true });

    await member.timeout(minutes * 60 * 1000, reason);
    return interaction.reply({ content: `🔇 ${member.user.tag} réduit au silence pendant ${minutes} minute(s).`, ephemeral: true });
  },
};
