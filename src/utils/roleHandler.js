const { friendlyMessage, respondError } = require("../handlers/error");

/** Ajoute ou retire un rôle à l'utilisateur, avec vérification de hiérarchie. */
async function toggleRole(interaction, roleId) {
  const guild = interaction.guild;
  if (!guild) return respondError(interaction, "Cette commande doit être utilisée sur un serveur.");

  const role = guild.roles.cache.get(roleId) || (await guild.roles.fetch(roleId).catch(() => null));
  if (!role) return respondError(interaction, "Rôle introuvable sur ce serveur.");

  const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
  if (!botMember || !botMember.permissions.has("ManageRoles")) {
    return respondError(interaction, "Je n'ai pas la permission de gérer les rôles.");
  }
  if (role.managed || role.position >= botMember.roles.highest.position) {
    return respondError(interaction, "Ce rôle est au-dessus de mon rôle le plus élevé, je ne peux pas le modifier.");
  }

  const member = await guild.members.fetch(interaction.user.id);
  const hadRole = member.roles.cache.has(roleId);

  if (hadRole) await member.roles.remove(roleId);
  else await member.roles.add(roleId);

  await interaction.reply({
    content: hadRole ? `✅ Rôle **${role.name}** retiré.` : `✅ Rôle **${role.name}** ajouté.`,
    ephemeral: true,
  });
}

module.exports = { toggleRole, friendlyMessage };
