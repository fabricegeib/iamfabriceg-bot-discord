const { MessageFlags } = require("discord.js");
const { friendlyMessage, respondError } = require("../handlers/error");

/** Ajoute ou retire un rôle à l'utilisateur, avec vérification de hiérarchie. */
async function toggleRole(interaction, roleId) {
  const guild = interaction.guild;
  if (!guild) return respondError(interaction, "Cette commande doit être utilisée sur un serveur.");

  const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
  if (!role) return respondError(interaction, "Rôle introuvable sur ce serveur.");

  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (!botMember || !botMember.permissions.has("ManageRoles")) {
    return respondError(
      interaction,
      "🔐 Je n'ai pas la permission **Gérer les rôles** sur ce serveur.\n" +
        "Pour la donner : *Paramètres du serveur → Rôles → rôle du bot → Autorisations → activer **Gérer les rôles***.\n" +
        "Vérifie aussi que le rôle du bot est placé **au-dessus** des rôles Aniimo et GOALS, puis réessaie."
    );
  }
  if (role.managed || role.position >= botMember.roles.highest.position) {
    return respondError(
      interaction,
      `🔐 Le rôle **${role.name}** est au-dessus de mon rôle le plus élevé (ou géré par une intégration), je ne peux pas le modifier.\n` +
        "Dans *Paramètres du serveur → Rôles*, place le rôle du bot **au-dessus** de ce rôle, puis réessaie."
    );
  }

  const member = await guild.members.fetch(interaction.user.id);
  const hadRole = member.roles.cache.has(roleId);

  if (hadRole) await member.roles.remove(roleId);
  else await member.roles.add(roleId);

  await interaction.reply({
    content: hadRole ? `✅ Rôle **${role.name}** retiré.` : `✅ Rôle **${role.name}** ajouté.`,
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = { toggleRole, friendlyMessage };
