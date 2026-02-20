const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('permissions')
		.setDescription('Affiche les permissions du bot'),

	async execute(interaction) {
		const botMember = interaction.guild.members.me;
		const permissions = botMember.permissions.toArray();

		await interaction.reply({
			content: `**Permissions actuelles du bot:**\n${permissions.join(', ')}`,
			ephemeral: true
		});
	},
};
