const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Lève le timeout d'un membre")
    .setDescriptionLocalizations({ fr: "Lève le timeout d'un membre" })
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName("membre").setDescription("Membre à rétablir").setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser("membre");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: "Membre introuvable.", ephemeral: true });

    await member.timeout(null, `Timeout levé par ${interaction.user.tag}`);
    return interaction.reply({ content: `🔊 Timeout levé pour ${member.user.tag}.`, ephemeral: true });
  },
};
