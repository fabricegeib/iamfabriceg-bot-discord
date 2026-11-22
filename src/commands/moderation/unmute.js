const { PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remove a member's timeout")
    .setDescriptionLocalizations({ fr: "Lève le timeout d'un membre. Ex. : /unmute membre:@user" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName("membre").setDescription("Member to unmute (e.g. @user)").setDescriptionLocalizations({ fr: "Membre à rétablir (ex. : @user)" }).setRequired(true)),

  examples: ["/unmute membre:@user"],

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: "Membre introuvable.", flags: MessageFlags.Ephemeral });

    await member.timeout(null, `Timeout levé par ${interaction.user.tag}`);
    return interaction.reply({ content: `🔊 Timeout levé pour ${member.user.tag}.`, flags: MessageFlags.Ephemeral });
  },
};
