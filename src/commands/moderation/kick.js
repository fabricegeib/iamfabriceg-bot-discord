const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kick a member from the server")
    .setDescriptionLocalizations({ fr: "Expulse un membre du serveur. Ex. : /kick membre:@user raison:spam" })
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option.setName("membre").setDescription("Member to kick (e.g. @user)").setDescriptionLocalizations({ fr: "Membre à expulser (ex. : @user)" }).setRequired(true))
    .addStringOption((option) => option.setName("raison").setDescription("Kick reason (e.g. spam)").setDescriptionLocalizations({ fr: "Motif de l'expulsion (ex. : spam)" })),

  examples: ["/kick membre:@user raison:spam"],

  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: "Commande réservée au serveur.", flags: MessageFlags.Ephemeral });

    const user = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison") || `Expulsé par ${interaction.user.tag}`;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: "Membre introuvable.", flags: MessageFlags.Ephemeral });
    if (member.id === interaction.client.user.id || member.id === interaction.user.id) {
      return interaction.reply({ content: "Vous ne pouvez pas expulser ce membre.", flags: MessageFlags.Ephemeral });
    }

    const bot = interaction.guild.members.me;
    if (member.roles.highest.position >= bot.roles.highest.position) {
      return interaction.reply({ content: "Ce membre a un rôle supérieur ou égal au mien.", flags: MessageFlags.Ephemeral });
    }

    await member.kick(reason);
    const embed = new EmbedBuilder()
      .setColor(0xef4444)
      .setTitle("👢 Membre expulsé")
      .addFields(
        { name: "Membre", value: `${member.user.tag} (${member.id})`, inline: true },
        { name: "Motif", value: reason, inline: true },
        { name: "Modérateur", value: interaction.user.tag, inline: true }
      )
      .setTimestamp();
    return interaction.reply({ embeds: [embed] });
  },
};
