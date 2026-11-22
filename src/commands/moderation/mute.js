const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Timeout a member for N minutes")
    .setDescriptionLocalizations({ fr: "Met un membre en timeout. Ex. : /mute membre:@user minutes:10 raison:spam" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName("membre").setDescription("Member to timeout (e.g. @user)").setDescriptionLocalizations({ fr: "Membre à réduire au silence (ex. : @user)" }).setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Duration in minutes (e.g. 10, max 10080)")
        .setDescriptionLocalizations({ fr: "Durée en minutes (ex. : 10, max 10080)" })
        .setMinValue(1)
        .setMaxValue(10080)
        .setRequired(true)
    )
    .addStringOption((option) => option.setName("raison").setDescription("Timeout reason (e.g. spam)").setDescriptionLocalizations({ fr: "Motif du timeout (ex. : spam)" })),

  examples: ["/mute membre:@user minutes:10 raison:spam"],

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const minutes = interaction.options.getInteger("minutes");
    const reason = interaction.options.getString("raison") || `Timeout par ${interaction.user.tag}`;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!member) return interaction.reply({ content: "Membre introuvable.", flags: MessageFlags.Ephemeral });
    if (!member.moderatable) return interaction.reply({ content: "Ce membre ne peut pas être mis en timeout.", flags: MessageFlags.Ephemeral });

    await member.timeout(minutes * 60 * 1000, reason);
    return interaction.reply({ content: `🔇 ${member.user.tag} réduit au silence pendant ${minutes} minute(s).`, flags: MessageFlags.Ephemeral });
  },
};
