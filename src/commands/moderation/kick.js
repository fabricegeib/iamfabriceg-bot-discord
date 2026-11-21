const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulser un membre")
    .setDescriptionLocalizations({ fr: "Expulser un membre" })
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option.setName("membre").setDescription("Membre à expulser").setRequired(true))
    .addStringOption((option) => option.setName("raison").setDescription("Motif de l'expulsion")),

  async execute(interaction) {
    if (!interaction.inGuild()) return interaction.reply({ content: "Commande réservée au serveur.", ephemeral: true });

    const user = interaction.options.getUser("membre");
    const reason = interaction.options.getString("raison") || `Expulsé par ${interaction.user.tag}`;
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ content: "Membre introuvable.", ephemeral: true });
    if (member.id === interaction.client.user.id || member.id === interaction.user.id) {
      return interaction.reply({ content: "Vous ne pouvez pas expulser ce membre.", ephemeral: true });
    }

    const bot = interaction.guild.members.me;
    if (member.roles.highest.position >= bot.roles.highest.position) {
      return interaction.reply({ content: "Ce membre a un rôle supérieur ou égal au mien.", ephemeral: true });
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
