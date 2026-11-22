const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const { getEnv } = require("../../config/env");

const NEEDED = [
  "ViewChannel",
  "SendMessages",
  "EmbedLinks",
  "ReadMessageHistory",
  "UseExternalEmojis",
  "ManageRoles",
  "KickMembers",
  "BanMembers",
  "ModerateMembers",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("permissions")
    .setDescription("Affiche les permissions du bot et le lien d'invitation")
    .setDescriptionLocalizations({ fr: "Affiche les permissions du bot et le lien d'invitation" }),

  async execute(interaction) {
    const bits = NEEDED.map((name) => PermissionFlagsBits[name]).filter(Boolean);
    const permissions = bits.reduce((total, bit) => total | bit, 0n);
    const { CLIENT_ID } = getEnv();

    const invite = `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=bot%20applications.commands`;

    const current = interaction.guild?.members?.me?.permissions;
    const lines = NEEDED.map((name) => {
      const bit = PermissionFlagsBits[name];
      const granted = current ? current.has(bit) : null;
      return `${granted === null ? "❔" : granted ? "✅" : "❌"} ${name}`;
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🔐 Permissions du bot")
      .setDescription(lines.join("\n"))
      .addFields({ name: "Lien d'invitation (permissions minimales)", value: `[Ajouter le bot](${invite})` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
