const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('permissions')
		.setDescription('Affiche les permissions du bot'),

	async execute(interaction) {
		const botMember = interaction.guild.members.me;
		const permissions = botMember.permissions.toArray();

		// Vérifier si le bot a des permissions dangereuses
		const dangerousPerms = [];
		if (botMember.permissions.has(PermissionFlagsBits.Administrator)) {
			dangerousPerms.push('⚠️ **ADMINISTRATOR** (dangereux!)');
		}
		if (botMember.permissions.has(PermissionFlagsBits.ManageGuild)) {
			dangerousPerms.push('⚠️ ManageGuild');
		}
		if (botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
			dangerousPerms.push('⚠️ ManageRoles');
		}

		let response = `**Permissions actuelles du bot:**\n${permissions.join(', ')}`;

		if (dangerousPerms.length > 0) {
			response += `\n\n**Permissions sensibles détectées:**\n${dangerousPerms.join('\n')}`;
		}

		await interaction.reply({
			content: response,
			ephemeral: true
		});
	},
};