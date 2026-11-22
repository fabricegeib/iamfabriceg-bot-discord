const { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, MessageFlags } = require("discord.js");
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

function withGuild(url, guildId) {
  if (!url || !guildId) return null;
  const parsed = new URL(url);
  parsed.searchParams.set("guild_id", guildId);
  return parsed.toString();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("permissions")
    .setDescription("Show bot permissions and invite link")
    .setDescriptionLocalizations({ fr: "Affiche les permissions du bot et son lien d'invitation. Ex. : /permissions" }),

  examples: ["/permissions"],

  async execute(interaction) {
    const bits = NEEDED.map((name) => PermissionFlagsBits[name]).filter(Boolean);
    const permissions = bits.reduce((total, bit) => total | bit, 0n);
    const { CLIENT_ID, GUILD_ID, DISCORD_INVITE_URL, DISCORD_INVITE_URL_GUILD } = getEnv();

    const scope = encodeURIComponent("bot applications.commands");
    const invite =
      DISCORD_INVITE_URL ||
      `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=${scope}`;
    const guildInvite =
      DISCORD_INVITE_URL_GUILD ||
      withGuild(invite, GUILD_ID) ||
      `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${permissions}&scope=${scope}&guild_id=${GUILD_ID}`;

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
      .addFields(
        { name: "Lien d'invitation (recommandé)", value: `[Ajouter le bot à mon serveur](${invite})` },
        { name: "Lien pour ce serveur", value: `[Ajouter le bot ici](${guildInvite})` },
        {
          name: "Activer Gérer les rôles",
          value:
            "Ouvre le lien d'invitation (pas *Intégrations*), coche **Gérer les rôles**, puis place le rôle **Bots** au-dessus des rôles à modifier dans *Paramètres du serveur › Rôles*.",
        }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
